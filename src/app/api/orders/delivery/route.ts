// src/app/api/orders/delivery/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Order from "@/models/Order";
import OrderItem from "@/models/OrderItem";
import { verifyToken } from "@/lib/jwt";
import "@/models/Dish";
import "@/models/User";

/**
 * GET /api/orders/delivery
 * Devuelve todas las órdenes con service_type="delivery"
 * agrupadas en activas (pending/in_kitchen/ready/picked_up/in_transit)
 * y completadas (delivered/paid) del día actual.
 *
 * Requiere token de rol "delivery" o "admin".
 */
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ ok: false, message: "No autorizado" }, { status: 401 });
    }

    try {
      verifyToken(authHeader.split(" ")[1]);
    } catch {
      return NextResponse.json({ ok: false, message: "Token inválido" }, { status: 401 });
    }

    // Inicio del día actual
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [activeOrders, completedOrders] = await Promise.all([
      Order.find({
        service_type: "delivery",
        status: { $in: ["pending", "in_kitchen", "ready", "picked_up", "in_transit"] },
      })
        .populate({ path: "user_id", model: "User", select: "name email" })
        .sort({ createdAt: 1 })
        .lean(),

      Order.find({
        service_type: "delivery",
        status: { $in: ["delivered", "paid", "cancelled"] },
        createdAt: { $gte: startOfDay },
      })
        .populate({ path: "user_id", model: "User", select: "name email" })
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    // Poblar items de las órdenes activas
    const activeIds = activeOrders.map((o) => o._id);
    const activeItems = await OrderItem.find({ order_id: { $in: activeIds } })
      .populate({ path: "dish_id", model: "Dish", select: "name price" })
      .lean();

    const itemsByOrder: Record<string, typeof activeItems> = {};
    for (const item of activeItems) {
      const key = String(item.order_id);
      if (!itemsByOrder[key]) itemsByOrder[key] = [];
      itemsByOrder[key].push(item);
    }

    const activeResult = activeOrders.map((o) => ({
      ...o,
      items: itemsByOrder[String(o._id)] ?? [],
    }));

    return NextResponse.json({
      ok: true,
      data: {
        active: activeResult,
        completed: completedOrders,
      },
    });
  } catch (error) {
    console.error("[GET /api/orders/delivery]", error);
    return NextResponse.json(
      { ok: false, message: "Error al obtener órdenes", error: String(error) },
      { status: 500 }
    );
  }
}