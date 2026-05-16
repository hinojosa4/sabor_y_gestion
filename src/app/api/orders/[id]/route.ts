import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Order from "@/models/Order";
import OrderItem from "@/models/OrderItem";
import Table from "@/models/Table";
import "@/models/Ingredient";
import { verifyToken } from "@/lib/jwt";
import { pusherServer } from "@/lib/pusher";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const { id } = await params;

    const order = await Order.findById(id).lean();
    if (!order) {
      return NextResponse.json({ ok: false, message: "Orden no encontrada" }, { status: 404 });
    }

    const items = await OrderItem.find({ order_id: id })
      .populate({
        path: "dish_id",
        model: "Dish",
        select: "name price description image_url category_id ingredients",
        populate: [
          { path: "category_id", model: "Category", select: "name" },
          { path: "ingredients.ingredient_id", model: "Ingredient", select: "name unit" },
        ],
      })
      .lean();

    const table = order.table_id
      ? await Table.findById(order.table_id).lean()
      : null;

    return NextResponse.json({
      ok: true,
      data: {
        ...order,
        table_number: table?.number ?? null,
        items,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: "Error al obtener orden", error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/orders/[id]
 * Cambia el status de una orden.
 * Body: { status: string }
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const { id } = await params;
 
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ ok: false, message: "No autorizado" }, { status: 401 });
    }
 
    // Verificar token — TokenPayload tiene { userId, email, rol }
    let payload: Record<string, unknown>;
    try {
      payload = verifyToken(authHeader.split(" ")[1]) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ ok: false, message: "Token inválido" }, { status: 401 });
    }
 
    // Soportar tanto "rol" (español) como "role" (inglés) por si acaso
    const userRol = (payload.rol ?? payload.role ?? "") as string;
 
    const ALLOWED_ROLES = ["admin", "delivery", "mesero", "cajero"];
    if (!ALLOWED_ROLES.includes(userRol)) {
      // Log en servidor para diagnosticar qué viene en el token
      console.error(`[PATCH /api/orders/${id}] 403 — rol recibido: "${userRol}" | payload:`, payload);
      return NextResponse.json(
        { ok: false, message: "Sin permiso", rol_recibido: userRol },
        { status: 403 }
      );
    }
 
    const body = await req.json();
    const { status } = body;
 
    const VALID_STATUSES = [
      "pending", "in_kitchen", "ready",
      "picked_up", "in_transit",
      "delivered", "paid", "cancelled",
    ];
 
    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { ok: false, message: `Status inválido. Permitidos: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }
 
    const order = await Order.findByIdAndUpdate(id, { status }, { new: true });
    if (!order) {
      return NextResponse.json({ ok: false, message: "Orden no encontrada" }, { status: 404 });
    }
 
    await pusherServer.trigger("delivery", "order:status_updated", { orderId: id, status });
    await pusherServer.trigger("restaurant", "order:status_updated", { orderId: id, status });
 
    return NextResponse.json({ ok: true, message: "Estado actualizado", data: order });
  } catch (error) {
    console.error("[PATCH /api/orders/:id]", error);
    return NextResponse.json(
      { ok: false, message: "Error al actualizar orden", error: String(error) },
      { status: 500 }
    );
  }
}
 