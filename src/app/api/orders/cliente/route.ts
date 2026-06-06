// src/app/api/orders/cliente/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Order from "@/models/Order";
import OrderItem from "@/models/OrderItem";
import { verifyToken } from "@/lib/jwt";
import { pusherServer } from "@/lib/pusher";
import { haversineKm, calcDeliveryFee, DELIVERY_CONFIG } from "@/lib/deliveryConfig";
import { getNextDailyNumber } from "@/lib/dailyOrderCounter";
import { calculateLoyaltyDiscount } from "@/lib/customerLoyalty";

export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const {
      service_type,
      items,
      delivery_address,
      delivery_coords,
      delivery_phone,
      table_id,
      notes,
      payment_method,
      delivery_fee: clientFee,          // ← recibido del cliente
    } = body;

    // ── Validaciones básicas ──────────────────────────────────────────────────
    const VALID_TYPES = ["delivery", "pick_up", "dine_in"];
    if (!service_type || !VALID_TYPES.includes(service_type)) {
      return NextResponse.json(
        { ok: false, message: "service_type debe ser delivery, pick_up o dine_in" },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { ok: false, message: "Se requiere al menos un ítem" },
        { status: 400 }
      );
    }

    if (service_type === "delivery" && !delivery_address) {
      return NextResponse.json(
        { ok: false, message: "La dirección es requerida para delivery" },
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

    // ── Validación server-side del delivery fee ───────────────────────────────
    // Re-calculamos en el servidor para evitar manipulación desde el cliente.
    let delivery_fee = 0;

    if (service_type === "delivery" && delivery_coords?.lat && delivery_coords?.lng) {
      const distKm = haversineKm(
        DELIVERY_CONFIG.restaurant.lat,
        DELIVERY_CONFIG.restaurant.lng,
        delivery_coords.lat,
        delivery_coords.lng,
      );
      const serverFee = calcDeliveryFee(distKm);

      // Si la distancia supera el límite, rechazar la orden
      if (serverFee === null) {
        return NextResponse.json(
          {
            ok: false,
            message: `Lo sentimos, tu ubicación está fuera del radio de entrega (${DELIVERY_CONFIG.maxDistanceKm} km).`,
          },
          { status: 400 }
        );
      }

      delivery_fee = serverFee;

      // Sanity-check: si el cliente envió un fee diferente al calculado, usamos el del servidor
      if (typeof clientFee === "number" && Math.abs(clientFee - serverFee) > 0.5) {
        console.warn(
          `[delivery fee mismatch] cliente envió ${clientFee}, servidor calculó ${serverFee}. Usando servidor.`
        );
      }
    }

    // ── Totales ───────────────────────────────────────────────────────────────
    const items_total = items.reduce(
      (sum: number, i: { quantity: number; unit_price: number }) =>
        sum + i.quantity * i.unit_price,
      0
    );

    const loyaltyDiscount = await calculateLoyaltyDiscount(userId, items_total);

    // El descuento aplica sobre productos; el envio se suma despues.
    const total_amount = loyaltyDiscount.total + delivery_fee;

    const dailyNumber = await getNextDailyNumber();
    // ── Crear orden ───────────────────────────────────────────────────────────
    const order = await Order.create({
      restaurantId: process.env.RESTAURANT_ID ?? "default",
      user_id: userId,
      mesero_id: "self",
      service_type,
      status: "pending",
      total_amount,
      customer_id: userId,
      delivery_fee,
      payment_method: payment_method ?? "Efectivo",
      table_id: table_id ?? undefined,
      delivery_address: delivery_address ?? undefined,
      delivery_coords: delivery_coords ?? undefined,
      delivery_phone: delivery_phone ?? undefined,
      notes: notes ?? undefined,
      daily_number: dailyNumber, 
    });

    // ── Crear items ───────────────────────────────────────────────────────────
    const orderItems = await OrderItem.insertMany(
      items.map((i: {
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
        status: "pending",
      }))
    );

    // ── Pusher ────────────────────────────────────────────────────────────────
    await pusherServer.trigger("restaurant", "order:new", {
      order: { ...order.toObject(), items: orderItems },
    });

    if (service_type === "delivery") {
      await pusherServer.trigger("delivery", "order:new_delivery", {
        order: { ...order.toObject(), items: orderItems },
      });
    }

    return NextResponse.json(
      {
        ok: true,
        message: "Orden creada",
        data: {
          order,
          items: orderItems,
          subtotal: loyaltyDiscount.subtotal,
          discountAmount: loyaltyDiscount.discountAmount,
          discountPercent: loyaltyDiscount.discountPercent,
          loyaltyTierName: loyaltyDiscount.tierName,
          totalBeforeDelivery: loyaltyDiscount.total,
          deliveryFee: delivery_fee,
          total: total_amount,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/orders/cliente]", error);
    return NextResponse.json(
      {
        ok: false,
        message: "Error al crear la orden",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
