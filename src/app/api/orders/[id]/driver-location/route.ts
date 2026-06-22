import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Order from "@/models/Order";
import { verifyToken } from "@/lib/jwt";
import { pusherServer } from "@/lib/pusher";

interface Params {
  params: Promise<{ id: string }>;
}

function isValidCoordinate(lat: unknown, lng: unknown) {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const { id } = await params;

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ ok: false, message: "No autorizado" }, { status: 401 });
    }

    let payload: Record<string, unknown>;
    try {
      payload = verifyToken(authHeader.split(" ")[1]) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ ok: false, message: "Token invalido" }, { status: 401 });
    }

    const userRol = (payload.rol ?? payload.role ?? "") as string;
    const userId = String(payload.userId ?? "");
    if (userRol !== "delivery" || !userId) {
      return NextResponse.json({ ok: false, message: "Sin permiso" }, { status: 403 });
    }

    const body = await req.json();
    const { lat, lng } = body;
    if (!isValidCoordinate(lat, lng)) {
      return NextResponse.json({ ok: false, message: "Coordenadas invalidas" }, { status: 400 });
    }
    const driverLat = lat as number;
    const driverLng = lng as number;

    const order = await Order.findById(id).select("service_type status driver_id user_id").lean();
    if (!order) {
      return NextResponse.json({ ok: false, message: "Orden no encontrada" }, { status: 404 });
    }

    if (order.service_type !== "delivery") {
      return NextResponse.json({ ok: false, message: "La orden no es delivery" }, { status: 400 });
    }

    if (!["picked_up", "in_transit"].includes(order.status)) {
      return NextResponse.json(
        { ok: false, message: "El tracking solo esta activo durante la entrega" },
        { status: 400 }
      );
    }

    if (order.driver_id && String(order.driver_id) !== userId) {
      return NextResponse.json({ ok: false, message: "La orden pertenece a otro repartidor" }, { status: 403 });
    }

    const updatedAt = new Date();
    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      {
        driver_id: userId,
        driver_location: { lat: driverLat, lng: driverLng, updatedAt },
      },
      { new: true }
    ).select("driver_location");

    const eventPayload = {
      orderId: id,
      lat: driverLat,
      lng: driverLng,
      updatedAt: updatedAt.toISOString(),
    };

    await pusherServer.trigger(`order-${id}`, "driver:location", eventPayload);
    if (order.user_id) {
      await pusherServer.trigger(`client-${order.user_id}`, "driver:location", eventPayload);
    }

    return NextResponse.json({
      ok: true,
      message: "Ubicacion actualizada",
      data: updatedOrder,
    });
  } catch (error) {
    console.error("[PATCH /api/orders/:id/driver-location]", error);
    return NextResponse.json(
      { ok: false, message: "Error al actualizar ubicacion", error: String(error) },
      { status: 500 }
    );
  }
}
