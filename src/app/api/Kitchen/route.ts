import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Order from "@/models/Order";
import OrderItem from "@/models/OrderItem";
import Ingredient from "@/models/Ingredient";
import "@/models/Dish";
import "@/models/Category";
import mongoose, { Types } from "mongoose";
import Table from "@/models/Table";
import { pusherServer } from "@/lib/pusher";

// ── GET /api/Kitchen ──────────────────────────────────────────────────────────
export async function GET() {
  try {
    await connectDB();
    const orders = await Order.find({
      status: { $in: ["pending", "in_kitchen", "ready"] },
    })
      .sort({ createdAt: 1 })
      .lean();

    const orderIds = orders.map((o) => o._id);
    const items = await OrderItem.find({ order_id: { $in: orderIds } })
      .populate({
        path: "dish_id",
        model: "Dish",
        select: "name category_id",
        populate: { path: "category_id", model: "Category", select: "name" },
      })
      .lean();

    const tableIds = [...new Set(orders.map((o) => o.table_id).filter(Boolean))];
    const tables = await Table.find({ _id: { $in: tableIds } }).lean();
    const tableMap = new Map(tables.map((t) => [String(t._id), t.number]));

    const itemsByOrder: Record<string, typeof items> = {};
    for (const item of items) {
      const key = String(item.order_id);
      if (!itemsByOrder[key]) itemsByOrder[key] = [];
      itemsByOrder[key].push(item);
    }

    const result = orders.map((order) => ({
      ...order,
      table_number: order.table_id ? tableMap.get(String(order.table_id)) ?? null : null,
      items: itemsByOrder[String(order._id)] ?? [],
    }));

    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    console.error("Kitchen GET error:", error);
    return NextResponse.json(
      {
        ok: false,
        message: "Error al obtener órdenes",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// ── PATCH /api/Kitchen ────────────────────────────────────────────────────────
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

    const validTransitions: Record<string, string[]> = {
      pending:    ["in_kitchen", "cancelled"],
      in_kitchen: ["ready", "cancelled"],
      ready:      ["delivered", "picked_up"],
      picked_up:  ["in_transit", "cancelled"],
      in_transit: ["delivered", "cancelled"],
    };

    const order = await Order.findById(orderId);
    if (!order) {
      return NextResponse.json(
        { ok: false, message: "Orden no encontrada" },
        { status: 404 }
      );
    }

    const allowed = validTransitions[order.status] ?? [];
    if (!allowed.includes(newStatus)) {
      return NextResponse.json(
        { ok: false, message: `No se puede pasar de "${order.status}" a "${newStatus}"` },
        { status: 400 }
      );
    }

    // ── Helper: obtener items con ingredientes poblados ───────────────────────
    const getItemsWithIngredients = async () => {
      return OrderItem.find({ order_id: orderId }).populate({
        path: "dish_id",
        model: "Dish",
        select: "ingredients",
        populate: {
          path: "ingredients.ingredient_id",
          model: "Ingredient",
          select: "name currentStock unit",
        },
      });
    };

    // ── in_kitchen → descontar inventario + alertas WebSocket ────────────────
    if (newStatus === "in_kitchen") {
      const items = await getItemsWithIngredients();

      // Recolectar IDs afectados y cantidades a descontar
      const deductMap = new Map<string, number>(); // ingredientId → cantidad total a descontar

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bulkOps: any[] = [];

      for (const item of items) {
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

          // Acumular para leer el estado real post-descuento
          deductMap.set(ingId, (deductMap.get(ingId) ?? 0) + deduct);

          if (ing.ingredient_id.currentStock < deduct) {
            console.warn(
              `Stock insuficiente para ingrediente ${ingId}: ` +
              `disponible ${ing.ingredient_id.currentStock}, necesario ${deduct}`
            );
          }

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

      // ── Leer ingredientes afectados con Mongoose (activa virtuals) ─────────
      // IMPORTANTE: NO usar .lean() aquí — necesitamos el virtual stockStatus
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
          // El virtual stockStatus ahora refleja el stock actualizado
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

        // ── Disparar alerta por Pusher si hay ingredientes con stock bajo ─────
        if (alertas.length > 0) {
          // Canal "restaurant" — escuchan cocinero y mesero
          await pusherServer.trigger("restaurant", "inventory:alert", {
            orderId,
            alertas,
            timestamp: new Date().toISOString(),
          });
        }
      }

      await OrderItem.updateMany(
        { order_id: orderId, status: "pending" },
        { status: "in_kitchen" }
      );
    }

    // ── cancelled desde in_kitchen → restaurar inventario ────────────────────
    if (newStatus === "cancelled" && order.status === "in_kitchen") {
      const items = await getItemsWithIngredients();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const restoreBulkOps: any[] = [];

      for (const item of items) {
        const dish = item.dish_id as {
          ingredients?: {
            ingredient_id: { _id: Types.ObjectId; currentStock: number };
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

      await OrderItem.updateMany({ order_id: orderId }, { status: "cancelled" });
    }

    // ── ready → marcar items como ready ──────────────────────────────────────
    if (newStatus === "ready") {
      await OrderItem.updateMany(
        { order_id: orderId, status: "in_kitchen" },
        { status: "ready", prepared_at: new Date() }
      );
    }

    order.status = newStatus;
    await order.save();

    // ── Notificar cambio de estado de orden ───────────────────────────────────
    await pusherServer.trigger("restaurant", "order:updated", {
      orderId,
      newStatus,
    });

    if (order.user_id) {
      await pusherServer.trigger(`client-${order.user_id}`, "order:status", {
        orderId,
        newStatus,
        service_type: order.service_type,
      });
    }

    if (order.service_type === "delivery" && newStatus === "ready") {
      await pusherServer.trigger("delivery", "order:ready_for_pickup", {
        orderId,
        newStatus,
      });
    }

    return NextResponse.json({ ok: true, message: "Estado actualizado", data: order });
  } catch (error) {
    console.error("Kitchen PATCH error:", error);
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