import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Reservation from "@/models/Reservation";
import Table from "@/models/Table";
import { verifyToken } from "@/lib/jwt";
import { pusherServer } from "@/lib/pusher";
import "@/models/User";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ ok: false, message: "No autorizado" }, { status: 401 });
    }

    let payload: { userId: string; rol: string };
    try {
      payload = verifyToken(authHeader.split(" ")[1]) as { userId: string; rol: string };
    } catch {
      return NextResponse.json({ ok: false, message: "Token inválido" }, { status: 401 });
    }

    if (!["admin", "mesero"].includes(payload.rol)) {
      return NextResponse.json({ ok: false, message: "Sin permisos" }, { status: 403 });
    }

    const reservation = await Reservation.findById(id)
      .populate("table_id", "number capacity location status")
      .populate("user_id", "name email");

    if (!reservation) {
      return NextResponse.json({ ok: false, message: "Reserva no encontrada" }, { status: 404 });
    }

    if (!["confirmed", "pending"].includes(reservation.status)) {
      return NextResponse.json(
        { ok: false, message: `No se puede asentar una reserva en estado "${reservation.status}"` },
        { status: 400 }
      );
    }

    if (!reservation.table_id) {
      return NextResponse.json(
        { ok: false, message: "Esta reserva no tiene mesa asignada" },
        { status: 400 }
      );
    }

    const tableRef = reservation.table_id as unknown as { _id: string; number: number; status: string };
    const tableId = tableRef._id.toString();

    // Bloquear si la mesa ya está en uso por otra orden
    const table = await Table.findById(tableId);
    if (!table) {
      return NextResponse.json({ ok: false, message: "Mesa no encontrada" }, { status: 404 });
    }
    if (["Ocupada", "Cuenta solicitada"].includes(table.status)) {
      return NextResponse.json(
        { ok: false, message: `La mesa ${table.number} ya está en uso (estado: ${table.status})` },
        { status: 409 }
      );
    }

    reservation.status = "seated";
    await reservation.save();

    await Table.findByIdAndUpdate(tableId, { status: "Ocupada" });

    await pusherServer.trigger("restaurant", "reservation:updated", {
      reservationId: id,
      status: "seated",
      tableId,
    });
    await pusherServer.trigger("restaurant", "table:updated", {
      tableId,
      status: "Ocupada",
    });

    await pusherServer.trigger("restaurant", "reservation:seated", {
      reservationId: id,
      tableNumber: tableRef.number,
      contactName: `${reservation.contact_name} ${reservation.contact_lastname}`,
      partySize: reservation.party_size,
    });

    const userRef = reservation.user_id as unknown as { _id: string } | undefined;
    if (userRef?._id) {
      await pusherServer.trigger(`user-${userRef._id}`, "reservation:status", {
        reservationId: id,
        status: "seated",
        message: "¡Bienvenido! Tu mesa está lista 🪑 El mesero te atenderá en breve.",
        table: reservation.table_id,
      });
    }

    return NextResponse.json({ ok: true, data: reservation });
  } catch (error) {
    console.error("[POST /api/reservations/:id/seat]", error);
    return NextResponse.json(
      { ok: false, message: "Error al asentar la reserva", error: String(error) },
      { status: 500 }
    );
  }
}