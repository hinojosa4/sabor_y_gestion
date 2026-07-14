// src/app/api/reservations/activate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Reservation from "@/models/Reservation";
import Table from "@/models/Table";
import { pusherServer } from "@/lib/pusher";

function verifyCron(req: NextRequest): boolean {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return auth === `Bearer ${secret}`;
}

// Cuántas horas antes de la reserva se bloquea la mesa. Default: 2h.
const ACTIVATION_WINDOW_HOURS = Number(process.env.RESERVATION_ACTIVATION_HOURS ?? 2);

export async function GET(req: NextRequest) {
  if (!verifyCron(req)) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const now = new Date();
  const windowEnd = new Date(now.getTime() + ACTIVATION_WINDOW_HOURS * 60 * 60 * 1000);

  // Reservas confirmadas, con mesa asignada, cuya hora cae dentro de la ventana
  const reservations = await Reservation.find({
    status: "confirmed",
    table_id: { $exists: true, $ne: null },
    date: { $gte: now, $lte: windowEnd },
  }).populate("table_id", "number status");

  if (reservations.length === 0) {
    return NextResponse.json({ ok: true, activated: 0 });
  }

  let activated = 0;

  for (const reservation of reservations) {
    const tableRef = reservation.table_id as unknown as { _id: string; number: number; status: string } | null;
    if (!tableRef) continue;

    // Solo activar si la mesa sigue Libre (idempotente: si ya está en "Reservada"
    // por una corrida anterior, no la vuelve a tocar; si por algún motivo ya está
    // Ocupada, tampoco la pisa)
    if (tableRef.status !== "Libre") continue;

    await Table.findByIdAndUpdate(tableRef._id, { status: "Reservada" });
    activated++;

    await pusherServer.trigger("restaurant", "table:updated", {
      tableId: tableRef._id.toString(),
      status: "Reservada",
      reservationId: reservation._id,
    });

    if (reservation.user_id) {
      await pusherServer.trigger(`user-${reservation.user_id}`, "reservation:status", {
        reservationId: reservation._id,
        status: "confirmed",
        message: `Tu mesa estará lista en menos de ${ACTIVATION_WINDOW_HOURS}h ⏰ ¡Te esperamos!`,
        table: reservation.table_id,
      });
    }
  }

  return NextResponse.json({ ok: true, activated, checked: reservations.length });
}