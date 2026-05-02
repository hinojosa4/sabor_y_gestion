import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Order from "@/models/Order";
import OrderItem from "@/models/OrderItem";
import Ingredient from "@/models/Ingredient";
import "@/models/Dish";
import "@/models/IngredientCategory";

// GET /api/orders/kitchen — órdenes activas para cocina
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
        path: "_id",
        model: "MenuItem",
        select: "name category_id cookingTime",
        populate: { path: "category_id", select: "nombre" },
      })
      .lean();

    // Agrupar items por orden
    const itemsByOrder: Record<string, typeof items> = {};
    for (const item of items) {
      const key = String(item.order_id);
      if (!itemsByOrder[key]) itemsByOrder[key] = [];
      itemsByOrder[key].push(item);
    }

    const result = orders.map((order) => ({
      ...order,
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

// PATCH /api/orders/kitchen — cambiar estado de orden
// body: { orderId, newStatus, deductInventory? }
export async function PATCH(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { orderId, newStatus } = body;

    if (!orderId || !newStatus) {
      return NextResponse.json({ ok: false, message: "orderId y newStatus son requeridos" }, { status: 400 });
    }

    const validTransitions: Record<string, string[]> = {
      pending:    ["in_kitchen", "cancelled"],
      in_kitchen: ["ready", "cancelled"],
      ready:      ["delivered"],
    };

    const order = await Order.findById(orderId);
    if (!order) {
      return NextResponse.json({ ok: false, message: "Orden no encontrada" }, { status: 404 });
    }

    const allowed = validTransitions[order.status] ?? [];
    if (!allowed.includes(newStatus)) {
      return NextResponse.json(
        { ok: false, message: `No se puede pasar de "${order.status}" a "${newStatus}"` },
        { status: 400 }
      );
    }

    // Al pasar a in_kitchen → descontar inventario
    if (newStatus === "in_kitchen") {
      const items = await OrderItem.find({ order_id: orderId })
        .populate({
          path: "menu_item_id",
          model: "Dish",
          select: "ingredients",
          populate: {
            path: "ingredients.ingredient_id",
            model: "Ingredient",
            select: "nombre stock_actual unidad",
          },
        });

      const bulkOps: {
        updateOne: {
          filter: { _id: unknown };
          update: { $inc: { stock_actual: number } };
        };
      }[] = [];

      for (const item of items) {
        const menuItem = item.menu_item_id as {
          ingredients?: { ingredient_id: { _id: unknown; stock_actual: number }; quantity: number }[];
        };
        if (!menuItem?.ingredients) continue;

        for (const ing of menuItem.ingredients) {
          if (!ing.ingredient_id) continue;
          const deduct = ing.quantity * item.quantity;
          bulkOps.push({
            updateOne: {
              filter: { _id: ing.ingredient_id._id },
              update: { $inc: { stock_actual: -deduct } },
            },
          });
        }
      }

      if (bulkOps.length > 0) {
        await Ingredient.bulkWrite(bulkOps);
      }

      // Actualizar items a in_kitchen
      await OrderItem.updateMany(
        { order_id: orderId, status: "pending" },
        { status: "in_kitchen" }
      );
    }

    // Al pasar a ready → marcar items como ready
    if (newStatus === "ready") {
      await OrderItem.updateMany(
        { order_id: orderId, status: "in_kitchen" },
        { status: "ready", prepared_at: new Date() }
      );
    }

    order.status = newStatus;
    await order.save();

    return NextResponse.json({ ok: true, message: "Estado actualizado", data: order });
  } catch (error) {
    console.error("Kitchen PATCH error:", error);
    return NextResponse.json(
      { ok: false, message: "Error al actualizar estado", error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}