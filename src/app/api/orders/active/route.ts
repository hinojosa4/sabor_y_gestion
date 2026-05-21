import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Order from "@/models/Order";
import OrderItem from "@/models/OrderItem";
import Table from "@/models/Table";
import { verifyToken } from "@/lib/jwt";
import "@/models/Dish";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ ok: false, message: "No autorizado" }, { status: 401 });
    }

    let payload: ReturnType<typeof verifyToken>;
    try {
      payload = verifyToken(authHeader.split(" ")[1]);
    } catch {
      return NextResponse.json({ ok: false, message: "Token inválido" }, { status: 401 });
    }

    const userId  = payload.userId;
    const userRol = payload.rol;

    // Admin ve todas las órdenes activas, mesero solo las suyas
    // Se incluye "delivered" para que el mesero pueda pedir la cuenta
    const filter: Record<string, unknown> = {
      status: { $in: ["pending", "in_kitchen", "ready", "delivered"] },
    };
    if (userRol !== "admin") {
      filter.mesero_id = userId;
    }

    const orders = await Order.find(filter).sort({ createdAt: -1 }).lean();

    const orderIds = orders.map((o) => o._id);
    const items = await OrderItem.find({ order_id: { $in: orderIds } })
      .populate({ path: "dish_id", model: "Dish", select: "name" })
      .lean();

    const tableIds = [...new Set(orders.map(o => o.table_id).filter(Boolean))];
    const tables = await Table.find({ _id: { $in: tableIds } }).lean();
    const tableMap = new Map(tables.map(t => [String(t._id), t]));

    const itemsByOrder: Record<string, typeof items> = {};
    for (const item of items) {
      const key = String(item.order_id);
      if (!itemsByOrder[key]) itemsByOrder[key] = [];
      itemsByOrder[key].push(item);
    }

    const result = orders.map((order) => ({
      ...order,
      table_number: order.table_id ? tableMap.get(String(order.table_id))?.number ?? null : null,
      items: itemsByOrder[String(order._id)] ?? [],
    }));

    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: "Error al obtener órdenes", error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}