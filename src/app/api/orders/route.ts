import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Order from "@/models/Order";
import OrderItem from "@/models/OrderItem";
import Table from "@/models/Table";
import { verifyToken } from "@/lib/jwt";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    // Obtener mesero del token
    const authHeader = req.headers.get("authorization");
    let meseroId = "unknown";
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const payload = verifyToken(authHeader.split(" ")[1]);
        meseroId = payload.userId;
      } catch { /* token inválido, continuar */ }
    }

    const body = await req.json();
    const { table_id, service_type = "dine_in", items } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ ok: false, message: "Se requiere al menos un ítem" }, { status: 400 });
    }

    // Validar items
    for (const item of items) {
      if (!item.dish_id || !item.quantity || !item.unit_price) {
        return NextResponse.json({ ok: false, message: "Cada ítem requiere dish_id, quantity y unit_price" }, { status: 400 });
      }
    }

    const total_amount = items.reduce(
      (sum: number, i: { quantity: number; unit_price: number }) => sum + i.quantity * i.unit_price,
      0
    );

    // Crear orden
    const order = await Order.create({
      restaurantId: process.env.RESTAURANT_ID ?? "default",
      table_id: table_id ?? undefined,
      mesero_id: meseroId,
      service_type,
      status: "pending",
      total_amount,
    });

    // Crear items
    const orderItems = await OrderItem.insertMany(
      items.map((i: { dish_id: string; quantity: number; unit_price: number; notes?: string }) => ({
        order_id: order._id,
        dish_id: i.dish_id,
        quantity: i.quantity,
        unit_price: i.unit_price,
        subtotal: i.quantity * i.unit_price,
        notes: i.notes ?? undefined,
        status: "pending",
      }))
    );

    // Marcar mesa como ocupada si es dine_in
    if (table_id && service_type === "dine_in") {
      await Table.findByIdAndUpdate(table_id, { status: "occupied" });
    }

    return NextResponse.json(
      { ok: true, message: "Orden creada", data: { order, items: orderItems } },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/orders]", error);
    return NextResponse.json(
      { ok: false, message: "Error al crear la orden", error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}