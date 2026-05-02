import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import OrderItem from "@/models/OrderItem";
import Order from "@/models/Order";

interface Params {
  params: Promise<{ id: string }>;
}

// PATCH /api/orders/kitchen/item/[id] — marcar ítem individual como listo
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json();
    const { status, chef_id } = body;

    const item = await OrderItem.findById(id);
    if (!item) {
      return NextResponse.json({ ok: false, message: "Ítem no encontrado" }, { status: 404 });
    }

    item.status = status;
    if (status === "ready") {
      item.prepared_at = new Date();
      if (chef_id) item.chef_id = chef_id;
    }
    await item.save();

    // Si todos los items de la orden están listos → auto-marcar orden como ready
    const allItems = await OrderItem.find({
      order_id: item.order_id,
      status: { $ne: "cancelled" },
    });

    const allReady = allItems.every((i) => i.status === "ready");
    if (allReady) {
      await Order.findByIdAndUpdate(item.order_id, { status: "ready" });
    }

    return NextResponse.json({ ok: true, data: item });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: "Error al actualizar ítem", error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}