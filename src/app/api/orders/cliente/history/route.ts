//api/orders/cliente/history/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Order from "@/models/Order";
import OrderItem from "@/models/OrderItem";
import Payment from "@/models/Payment";
import { verifyToken } from "@/lib/jwt";
import "@/models/Dish";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ ok: false, message: "No autorizado" }, { status: 401 });
    }

    let userId: string;
    try {
      const payload = verifyToken(authHeader.split(" ")[1]);
      userId = payload.userId;
    } catch {
      return NextResponse.json({ ok: false, message: "Token inválido" }, { status: 401 });
    }

    const orders = await Order.find({ user_id: userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const orderIds = orders.map((o) => o._id);
    const [items, payments] = await Promise.all([
        OrderItem.find({ order_id: { $in: orderIds } })
            .populate({ path: "dish_id", model: "Dish", select: "name price image_url" })
            .lean(),
        Payment.find({ order_id: { $in: orderIds.map(id => String(id)) } }).lean()
    ]);

    const itemsByOrder: Record<string, typeof items> = {};
    for (const item of items) {
      const key = String(item.order_id);
      if (!itemsByOrder[key]) itemsByOrder[key] = [];
      itemsByOrder[key].push(item);
    }

    const paymentsByOrder: Record<string, any> = {};
    for (const p of payments) {
        paymentsByOrder[p.order_id] = p;
    }

    const result = orders.map((o) => ({
      ...o,
      items: itemsByOrder[String(o._id)] ?? [],
      payment: paymentsByOrder[String(o._id)] ?? null,
    }));

    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: "Error al obtener historial", error: String(error) },
      { status: 500 }
    );
  }
}