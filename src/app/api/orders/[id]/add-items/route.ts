import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Order from "@/models/Order";
import OrderItem from "@/models/OrderItem";
import { verifyToken } from "@/lib/jwt";
import { pusherServer } from "@/lib/pusher";

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/orders/[id]/add-items
 * Agrega ítems nuevos a una orden existente (dine_in).
 * - La orden puede estar en cualquier estado activo (pending, in_kitchen, ready, delivered).
 * - Los ítems nuevos siempre se crean con status "pending" para que cocina los tome por separado.
 * - Se recalcula total_amount sumando los nuevos subtotales.
 *
 * Body: { items: { dish_id, quantity, unit_price, notes? }[] }
 */
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const { id } = await params;

    // ── Auth ────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ ok: false, message: "No autorizado" }, { status: 401 });
    }
    let payload: Record<string, unknown>;
    try {
      payload = verifyToken(authHeader.split(" ")[1]) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ ok: false, message: "Token inválido" }, { status: 401 });
    }

    const userRol = (payload.rol ?? payload.role ?? "") as string;
    if (!["admin", "mesero"].includes(userRol)) {
      return NextResponse.json({ ok: false, message: "Sin permiso" }, { status: 403 });
    }

    // ── Validar orden ───────────────────────────────────────────────────────
    const order = await Order.findById(id);
    if (!order) {
      return NextResponse.json({ ok: false, message: "Orden no encontrada" }, { status: 404 });
    }

    const ACTIVE_STATUSES = ["pending", "in_kitchen", "ready", "delivered"];
    if (!ACTIVE_STATUSES.includes(order.status)) {
      return NextResponse.json(
        {
          ok: false,
          message: `No se pueden agregar ítems a una orden con estado "${order.status}"`,
        },
        { status: 400 }
      );
    }

    // ── Validar body ────────────────────────────────────────────────────────
    const body = await req.json();
    const { items } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { ok: false, message: "Se requiere al menos un ítem" },
        { status: 400 }
      );
    }

    for (const item of items) {
      if (!item.dish_id || !item.quantity || !item.unit_price) {
        return NextResponse.json(
          { ok: false, message: "Cada ítem requiere dish_id, quantity y unit_price" },
          { status: 400 }
        );
      }
    }

    // ── Crear los nuevos OrderItems con status "pending" ────────────────────
    // Así, cuando cocina haga PATCH → in_kitchen, el updateMany({ status: "pending" })
    // solo tomará ESTOS ítems nuevos, no los que ya estaban en preparación.
    const newItems = await OrderItem.insertMany(
      items.map(
        (i: {
          dish_id: string;
          quantity: number;
          unit_price: number;
          notes?: string;
        }) => ({
          order_id: order._id,
          dish_id: i.dish_id,
          quantity: i.quantity,
          unit_price: i.unit_price,
          subtotal: i.quantity * i.unit_price,
          notes: i.notes ?? undefined,
          status: "pending", // siempre pending — cocina los verá separados
        })
      )
    );

    // ── Recalcular total_amount ─────────────────────────────────────────────
    const addedAmount = items.reduce(
      (sum: number, i: { quantity: number; unit_price: number }) =>
        sum + i.quantity * i.unit_price,
      0
    );
    order.total_amount = (order.total_amount ?? 0) + addedAmount;
    await order.save();

    // ── Notificar por Pusher ────────────────────────────────────────────────
    // "order:updated" hace que cocina y mesero recarguen sin cambiar el status
    await pusherServer.trigger("restaurant", "order:updated", {
      orderId: id,
      newStatus: order.status,
      itemsAdded: newItems.length,
    });

    return NextResponse.json(
      {
        ok: true,
        message: `${newItems.length} ítem(s) agregado(s) a la orden`,
        data: { order, newItems },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[PUT /api/orders/:id/add-items]", error);
    return NextResponse.json(
      {
        ok: false,
        message: "Error al agregar ítems",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}