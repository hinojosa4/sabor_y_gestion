import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Order from "@/models/Order";
import OrderItem from "@/models/OrderItem";
import { verifyToken } from "@/lib/jwt";
import "@/models/Dish";

interface Params {
  params: Promise<{ orderId: string }>;
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const { orderId } = await params;

    // Auth
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

    const order = await Order.findById(orderId).lean();
    if (!order) {
      return NextResponse.json({ ok: false, message: "Orden no encontrada" }, { status: 404 });
    }

    // Solo el dueño puede ver su orden
    if (String(order.user_id) !== userId) {
      return NextResponse.json({ ok: false, message: "Sin permisos" }, { status: 403 });
    }

    const items = await OrderItem.find({ order_id: orderId })
      .populate({ path: "dish_id", model: "Dish", select: "name price image_url" })
      .lean();

    return NextResponse.json({ ok: true, data: { ...order, items } });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: "Error al obtener orden", error: String(error) },
      { status: 500 }
    );
  }
}