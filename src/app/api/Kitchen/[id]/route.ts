import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import OrderItem from "@/models/OrderItem";
import Order from "@/models/Order";
import mongoose from "mongoose";
import { pusherServer } from "@/lib/pusher"; 

interface Params {
  params: Promise<{ id: string }>;
}

const VALID_ITEM_STATUSES = ["pending", "in_kitchen", "ready", "served", "cancelled"] as const;
type ItemStatus = typeof VALID_ITEM_STATUSES[number];

// ── PATCH /api/orders/kitchen/item/[id] ───────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const { id } = await params;

    // ✅ Validar ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { ok: false, message: "ID de ítem no válido" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { status, chef_id } = body;

    // ✅ Validar status permitido
    if (!status || !VALID_ITEM_STATUSES.includes(status as ItemStatus)) {
      return NextResponse.json(
        {
          ok: false,
          message: `Estado inválido. Valores permitidos: ${VALID_ITEM_STATUSES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // ✅ Validar chef_id si viene
    if (chef_id && !mongoose.Types.ObjectId.isValid(String(chef_id))) {
      return NextResponse.json(
        { ok: false, message: "chef_id no es un ID válido" },
        { status: 400 }
      );
    }

    const item = await OrderItem.findById(id);
    if (!item) {
      return NextResponse.json(
        { ok: false, message: "Ítem no encontrado" },
        { status: 404 }
      );
    }

    item.status = status;
    if (status === "ready") {
      item.prepared_at = new Date();
      if (chef_id) item.chef_id = String(chef_id);
    }
    await item.save();

    // Auto-marcar orden como ready si todos los ítems están listos
    const allItems = await OrderItem.find({
      order_id: item.order_id,
      status: { $ne: "cancelled" },
    });

    const allReady = allItems.length > 0 && allItems.every((i) => i.status === "ready");
    if (allReady) {
      await Order.findByIdAndUpdate(item.order_id, { status: "ready" });
      await pusherServer.trigger("restaurant", "order:updated", {
        orderId: String(item.order_id),
        newStatus: "ready",
      });
    }

    return NextResponse.json({ ok: true, data: item });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: "Error al actualizar ítem",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}