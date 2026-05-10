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

// ── GET /api/orders/kitchen ───────────────────────────────────────────────────
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

    // Resolver números de mesa
    const tableIds = [...new Set(orders.map(o => o.table_id).filter(Boolean))];
    const tables = await Table.find({ _id: { $in: tableIds } }).lean();
    const tableMap = new Map(tables.map(t => [String(t._id), t.number]));

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
      { ok: false, message: "Error al obtener órdenes", error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// ── PATCH /api/orders/kitchen ─────────────────────────────────────────────────
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
      ready:      ["delivered"],
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
        {
          ok: false,
          message: `No se puede pasar de "${order.status}" a "${newStatus}"`,
        },
        { status: 400 }
      );
    }

    // ── Helper para obtener items con ingredientes ─────────────────────────────
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

    // ── Al pasar a in_kitchen → descontar inventario ──────────────────────────
    if (newStatus === "in_kitchen") {
      const items = await getItemsWithIngredients();
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

          if (ing.ingredient_id.currentStock < deduct) {
            console.warn(
              `Stock insuficiente para ingrediente ${ing.ingredient_id._id}: ` +
              `disponible ${ing.ingredient_id.currentStock}, necesario ${deduct}`
            );
          }

          bulkOps.push({
            updateOne: {
              filter: { _id: new Types.ObjectId(ing.ingredient_id._id.toString()) },
              update: { $inc: { currentStock: -deduct } }, // ← resta
            },
          });
        }
      }

      if (bulkOps.length > 0) {
        await Ingredient.bulkWrite(bulkOps);
      }

      await OrderItem.updateMany(
        { order_id: orderId, status: "pending" },
        { status: "in_kitchen" }
      );
    }

    // ── Al cancelar desde in_kitchen → restaurar inventario ───────────────────
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
              update: { $inc: { currentStock: ing.quantity * item.quantity } }, // ← suma
            },
          });
        }
      }

      if (restoreBulkOps.length > 0) {
        await Ingredient.bulkWrite(restoreBulkOps);
      }

      // Cancelar todos los items de la orden
      await OrderItem.updateMany(
        { order_id: orderId },
        { status: "cancelled" }
      );
    }

    // ── Al pasar a ready → marcar items como ready ────────────────────────────
    if (newStatus === "ready") {
      await OrderItem.updateMany(
        { order_id: orderId, status: "in_kitchen" },
        { status: "ready", prepared_at: new Date() }
      );
    }

    order.status = newStatus;
    await order.save();

        // Al final del PATCH, antes del return:
    await pusherServer.trigger("restaurant", "order:updated", {
      orderId,
      newStatus,
    });

    return NextResponse.json({
      ok: true,
      message: "Estado actualizado",
      data: order,
    });
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