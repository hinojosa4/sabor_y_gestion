import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Order from "@/models/Order";
import OrderItem from "@/models/OrderItem";
import Ingredient from "@/models/Ingredient";
import "@/models/Dish";
import "@/models/Category";
import mongoose, { Types } from "mongoose";
import type { AnyBulkWriteOperation } from "mongoose";
import Table from "@/models/Table";
import { pusherServer } from "@/lib/pusher";

// ── Categorías consideradas "bebidas" ─────────────────────────────────────────
// Ajusta esta lista según los nombres reales de tus categorías
export const DRINK_CATEGORIES = [
  "Bebidas",
  "Refrescos",
  "Jugos",
  "Cócteles",
  "Cocktails",
  "Cervezas",
  "Tragos",
  "Licores",
  "Vinos",
  "Agua",
  "Bebida",
];

// ── GET /api/bartender ────────────────────────────────────────────────────────
export async function GET() {
  try {
    await connectDB();

    // Items pendientes que pertenecen a categorías de bebidas
    const drinkItems = await OrderItem.find({ status: "pending" })
      .populate({
        path: "dish_id",
        model: "Dish",
        select: "name category_id",
        populate: { path: "category_id", model: "Category", select: "name" },
      })
      .lean();

    // Filtrar solo los que son bebidas
    const drinkItemOrderIds = drinkItems
      .filter((item) => {
        const dish = item.dish_id as {
          category_id?: { name: string } | null;
        } | null;
        const catName = dish?.category_id?.name ?? "";
        return DRINK_CATEGORIES.some(
          (dc) => dc.toLowerCase() === catName.toLowerCase()
        );
      })
      .map((item) => item.order_id);

    // Órdenes con al menos un item de bebida activo
    const orders = await Order.find({
      $or: [
        {
          status: { $in: ["pending", "in_kitchen", "ready"] },
          _id: { $in: drinkItemOrderIds },
        },
        {
          _id: { $in: drinkItemOrderIds },
        },
      ],
    })
      .sort({ createdAt: 1 })
      .lean();

    const orderIds = orders.map((o) => o._id);

    // Traer TODOS los items de esas órdenes, filtrando luego por bebida
    const allItems = await OrderItem.find({ order_id: { $in: orderIds } })
      .populate({
        path: "dish_id",
        model: "Dish",
        select: "name category_id",
        populate: { path: "category_id", model: "Category", select: "name" },
      })
      .lean();

    // Solo items de bebidas
    const beverageItems = allItems.filter((item) => {
      const dish = item.dish_id as {
        category_id?: { name: string } | null;
      } | null;
      const catName = dish?.category_id?.name ?? "";
      return DRINK_CATEGORIES.some(
        (dc) => dc.toLowerCase() === catName.toLowerCase()
      );
    });

    const tableIds = [
      ...new Set(orders.map((o) => o.table_id).filter(Boolean)),
    ];
    const tables = await Table.find({ _id: { $in: tableIds } }).lean();
    const tableMap = new Map(tables.map((t) => [String(t._id), t.number]));

    // Agrupar items de bebidas por orden
    const itemsByOrder: Record<string, typeof beverageItems> = {};
    for (const item of beverageItems) {
      const key = String(item.order_id);
      if (!itemsByOrder[key]) itemsByOrder[key] = [];
      itemsByOrder[key].push(item);
    }

    // Solo devolver órdenes que tengan al menos un item de bebida activo
    const result = orders
      .map((order) => ({
        ...order,
        table_number: order.table_id
          ? (tableMap.get(String(order.table_id)) ?? null)
          : null,
        items: itemsByOrder[String(order._id)] ?? [],
      }))
      .filter((order) => order.items.length > 0);

    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    console.error("Bartender GET error:", error);
    return NextResponse.json(
      {
        ok: false,
        message: "Error al obtener órdenes de bartender",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// ── PATCH /api/bartender ──────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { orderId, newStatus } = body;

    if (!orderId || !newStatus) {
      return NextResponse.json(
        { ok: false, message: "orderId y newStatus son requeridos" },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return NextResponse.json(
        { ok: false, message: "orderId no es válido" },
        { status: 400 }
      );
    }

    const VALID_STATUSES = ["in_kitchen", "ready", "delivered", "cancelled"];
    if (!VALID_STATUSES.includes(newStatus)) {
      return NextResponse.json(
        { ok: false, message: `Estado "${newStatus}" no es válido` },
        { status: 400 }
      );
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return NextResponse.json(
        { ok: false, message: "Orden no encontrada" },
        { status: 404 }
      );
    }

    // ── Helper: items de BEBIDAS con ingredientes poblados ────────────────
    const getBeverageItemsWithIngredients = async () => {
      const items = await OrderItem.find({ order_id: orderId }).populate([
        {
          path: "dish_id",
          model: "Dish",
          select: "ingredients category_id name",
          populate: [
            {
              path: "ingredients.ingredient_id",
              model: "Ingredient",
              select: "name currentStock unit",
            },
            {
              path: "category_id",
              model: "Category",
              select: "name",
            },
          ],
        },
      ]);

      // Filtrar solo bebidas
      return items.filter((item) => {
        const dish = item.dish_id as {
          category_id?: { name: string } | null;
        } | null;
        const catName = dish?.category_id?.name ?? "";
        return DRINK_CATEGORIES.some(
          (dc) => dc.toLowerCase() === catName.toLowerCase()
        );
      });
    };

    // ── in_kitchen → descontar inventario de bebidas ──────────────────────
    if (newStatus === "in_kitchen") {
      const batchCutoff = new Date();
      const beverageItems = await getBeverageItemsWithIngredients();

      type LeanOrderItem = { created_at: Date | string; [key: string]: unknown };
      const currentBatchItems = beverageItems.filter(
        (item) => new Date((item as unknown as LeanOrderItem).created_at) <= batchCutoff
      );

      const deductMap = new Map<string, number>();
      const bulkOps: AnyBulkWriteOperation[] = [];

      for (const item of currentBatchItems) {
        const dish = item.dish_id as {
          ingredients?: {
            ingredient_id: { _id: Types.ObjectId; currentStock: number };
            quantity: number;
          }[];
        };
        if (!dish?.ingredients) continue;

        for (const ing of dish.ingredients) {
          if (!ing.ingredient_id) continue;

          const deduct = ing.quantity * item.quantity;
          const ingId = ing.ingredient_id._id.toString();
          deductMap.set(ingId, (deductMap.get(ingId) ?? 0) + deduct);

          bulkOps.push({
            updateOne: {
              filter: { _id: new Types.ObjectId(ingId) },
              update: { $inc: { currentStock: -deduct } },
            },
          });
        }
      }

      if (bulkOps.length > 0) {
        await Ingredient.bulkWrite(bulkOps);
      }

      // Alertas de inventario
      if (deductMap.size > 0) {
        const affectedIds = Array.from(deductMap.keys());
        const affectedIngredients = await Ingredient.find({
          _id: { $in: affectedIds },
        });

        const alertas: Array<{
          ingredientId: string;
          name: string;
          currentStock: number;
          unit: string;
          stockStatus: string;
          minStock: number;
          warningStock: number;
        }> = [];

        for (const ing of affectedIngredients) {
          if (ing.stockStatus === "critical" || ing.stockStatus === "low") {
            alertas.push({
              ingredientId: String(ing._id),
              name: ing.name,
              currentStock: ing.currentStock,
              unit: ing.unit,
              stockStatus: ing.stockStatus,
              minStock: ing.minStock,
              warningStock: ing.warningStock,
            });
          }
        }

        if (alertas.length > 0) {
          await pusherServer.trigger("restaurant", "inventory:alert", {
            orderId,
            alertas,
            timestamp: new Date().toISOString(),
            source: "bartender",
          });
        }
      }

      // Actualizar solo los items de bebidas pendientes
      const beverageItemIds = currentBatchItems.map((i) => i._id);
      await OrderItem.updateMany(
        {
          _id: { $in: beverageItemIds },
          status: "pending",
          created_at: { $lte: batchCutoff },
        },
        { status: "in_kitchen" }
      );

      // Actualizar estado de la orden si aún está en pending
      if (order.status === "pending") {
        order.status = "in_kitchen";
        await order.save();
      }

      await pusherServer.trigger("restaurant", "order:updated", {
        orderId,
        newStatus: order.status,
        source: "bartender",
      });

      return NextResponse.json({
        ok: true,
        message: "Bebidas en preparación — inventario descontado",
        data: order,
      });
    }

    // ── ready → marcar items de bebidas in_kitchen como ready ─────────────
    if (newStatus === "ready") {
      const beverageItems = await getBeverageItemsWithIngredients();
      const inKitchenBeverageIds = beverageItems
        .filter((i) => i.status === "in_kitchen")
        .map((i) => i._id);

      await OrderItem.updateMany(
        { _id: { $in: inKitchenBeverageIds } },
        { status: "ready", prepared_at: new Date() }
      );

      // Verificar si TODOS los items de la orden están listos
      const allItems = await OrderItem.find({
        order_id: orderId,
        status: { $ne: "cancelled" },
      });
      const allReady =
        allItems.length > 0 && allItems.every((i) => i.status === "ready");

      if (allReady) {
        order.status = "ready";
        await order.save();
      }

      await pusherServer.trigger("restaurant", "order:updated", {
        orderId,
        newStatus: allReady ? "ready" : order.status,
        source: "bartender",
      });

      if (allReady && order.user_id) {
        await pusherServer.trigger(`client-${order.user_id}`, "order:status", {
          orderId,
          newStatus: "ready",
          service_type: order.service_type,
        });
      }

      return NextResponse.json({
        ok: true,
        message: allReady
          ? "✓ Todas las bebidas listas"
          : "✓ Bebidas marcadas como listas",
        data: order,
      });
    }

    // ── cancelled desde in_kitchen → restaurar inventario de bebidas ──────
    if (newStatus === "cancelled" && order.status === "in_kitchen") {
      const beverageItems = await getBeverageItemsWithIngredients();
      const restoreBulkOps: AnyBulkWriteOperation[] = [];

      for (const item of beverageItems) {
        const dish = item.dish_id as {
          ingredients?: {
            ingredient_id: { _id: Types.ObjectId };
            quantity: number;
          }[];
        };
        if (!dish?.ingredients) continue;

        for (const ing of dish.ingredients) {
          if (!ing.ingredient_id) continue;
          restoreBulkOps.push({
            updateOne: {
              filter: { _id: new Types.ObjectId(ing.ingredient_id._id.toString()) },
              update: { $inc: { currentStock: ing.quantity * item.quantity } },
            },
          });
        }
      }

      if (restoreBulkOps.length > 0) {
        await Ingredient.bulkWrite(restoreBulkOps);
      }
    }

    order.status = newStatus;
    await order.save();

    await pusherServer.trigger("restaurant", "order:updated", {
      orderId,
      newStatus,
      source: "bartender",
    });

    return NextResponse.json({
      ok: true,
      message: "Estado actualizado",
      data: order,
    });
  } catch (error) {
    console.error("Bartender PATCH error:", error);
    return NextResponse.json(
      {
        ok: false,
        message: "Error al actualizar estado",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}