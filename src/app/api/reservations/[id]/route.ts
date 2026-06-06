// src/app/api/reservations/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Reservation from "@/models/Reservation";
import Table from "@/models/Table";
import User from "@/models/User";
import { verifyToken } from "@/lib/jwt";
import { pusherServer } from "@/lib/pusher";
import { sendReservationEmail } from "@/lib/email";

const STATUS_MESSAGES: Record<string, string> = {
  confirmed: "¡Tu reserva fue confirmada! Te esperamos.",
  cancelled: "Tu reserva fue cancelada. Contáctanos para más información.",
};

// ── GET /api/reservations/[id] ─────────────────────────────────────────────────
export async function GET(
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

    const reservation = await Reservation.findById(id)
      .populate("table_id", "number capacity location status")
      .populate("user_id", "name email")
      .lean();

    if (!reservation) {
      return NextResponse.json({ ok: false, message: "Reserva no encontrada" }, { status: 404 });
    }

    if (
      payload.rol === "cliente" &&
      reservation.user_id.toString() !== payload.userId
    ) {
      return NextResponse.json({ ok: false, message: "No autorizado" }, { status: 403 });
    }

    return NextResponse.json({ ok: true, data: reservation });
  } catch (error) {
    console.error("[GET /api/reservations/:id]", error);
    return NextResponse.json(
      { ok: false, message: "Error al obtener reserva", error: String(error) },
      { status: 500 }
    );
  }
}

// ── PATCH /api/reservations/[id] ───────────────────────────────────────────────
export async function PATCH(
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

    const body = await req.json();
    const { status, table_id, notes } = body as {
      status?: "pending" | "confirmed" | "seated" | "cancelled";
      table_id?: string | null;
      notes?: string;
    };

    const reservation = await Reservation.findById(id);
    if (!reservation) {
      return NextResponse.json({ ok: false, message: "Reserva no encontrada" }, { status: 404 });
    }

    const oldStatus  = reservation.status;
    const oldTableId = reservation.table_id?.toString();

    // ── Validar transición ────────────────────────────────────────────────────
    const validTransitions: Record<string, string[]> = {
      pending:   ["confirmed", "cancelled"],
      confirmed: ["seated", "cancelled"],
      seated:    ["cancelled"],
      cancelled: [],
    };

    if (status && status !== oldStatus) {
      if (!validTransitions[oldStatus]?.includes(status)) {
        return NextResponse.json(
          { ok: false, message: `No se puede cambiar de "${oldStatus}" a "${status}"` },
          { status: 400 }
        );
      }
    }

    // ── Lógica de mesas ───────────────────────────────────────────────────────
    if (status === "confirmed" && table_id) {
      const table = await Table.findById(table_id);
      if (!table) {
        return NextResponse.json({ ok: false, message: "Mesa no encontrada" }, { status: 404 });
      }
      if (table.status !== "Libre") {
        return NextResponse.json(
          { ok: false, message: `La mesa ${table.number} no está libre (estado: ${table.status})` },
          { status: 400 }
        );
      }
      await Table.findByIdAndUpdate(table_id, { status: "Reservada" });
    }

    if (status === "seated") {
      const tableToUpdate = table_id ?? oldTableId;
      if (tableToUpdate) {
        await Table.findByIdAndUpdate(tableToUpdate, { status: "Ocupada" });
      }
    }

    if (status === "cancelled" && oldTableId) {
      await Table.findByIdAndUpdate(oldTableId, { status: "Libre" });
    }

    if (table_id === null && oldTableId && status !== "cancelled") {
      await Table.findByIdAndUpdate(oldTableId, { status: "Libre" });
    }

    // ── Actualizar reserva ────────────────────────────────────────────────────
    const updateData: Record<string, unknown> = {};
    if (status)                  updateData.status   = status;
    if (table_id !== undefined)  updateData.table_id = table_id ?? null;
    if (notes !== undefined)     updateData.notes    = notes.trim();

    const updated = await Reservation.findByIdAndUpdate(id, updateData, { new: true })
      .populate("table_id", "number capacity location status")
      .populate("user_id",  "name email");

    // ── Notificar al restaurante ───────────────────────────────────────────
    await pusherServer.trigger("restaurant", "reservation:updated", {
      reservation: updated?.toObject(),
    });

    // ── Notificar al cliente solo cuando cambia a confirmed o cancelled ────
    const notifyStatuses = ["confirmed", "cancelled"];
    if (status && notifyStatuses.includes(status) && status !== oldStatus) {
      const userId = reservation.user_id.toString();

      // 1. Pusher: canal privado del usuario
      await pusherServer.trigger(`user-${userId}`, "reservation:status", {
        reservationId: id,
        status,
        message: STATUS_MESSAGES[status],
        table: updated?.table_id ?? null,
      });

      // 2. Email
      try {
        const userDoc = await User.findById(userId).select("email name").lean() as { email?: string; name?: string } | null;
        const clientEmail = userDoc?.email;

        console.log(`[PATCH reservation] userId=${userId} email encontrado=${clientEmail ?? "NINGUNO"}`);

        if (clientEmail) {
          const tableRef = updated?.table_id as { number?: number; location?: string } | null;
          await sendReservationEmail({
            to:             clientEmail,
            contact_name:   reservation.contact_name,
            status:         status as "confirmed" | "cancelled",
            date:           reservation.date.toISOString(),
            party_size:     reservation.party_size,
            occasion:       reservation.occasion || undefined,
            table_number:   tableRef?.number,
            table_location: tableRef?.location,
            notes:          updateData.notes as string | undefined,
          });
          console.log(`[PATCH reservation] Email enviado a ${clientEmail}`);
        } else {
          console.warn(`[PATCH reservation] No se encontró email para userId=${userId} — email NO enviado`);
        }
      } catch (emailError) {
        console.error("[PATCH reservation] Error enviando email:", emailError);
      }
    } // ← cierre del if (notifyStatuses)

    return NextResponse.json({
      ok: true,
      message: "Reserva actualizada",
      data: updated,
    });

  } catch (error) {
    console.error("[PATCH /api/reservations/:id]", error);
    return NextResponse.json(
      { ok: false, message: "Error al actualizar reserva", error: String(error) },
      { status: 500 }
    );
  }
}

// ── DELETE /api/reservations/[id] ─────────────────────────────────────────────
export async function DELETE(
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

    if (payload.rol !== "admin") {
      return NextResponse.json({ ok: false, message: "Solo el admin puede eliminar reservas" }, { status: 403 });
    }

    const reservation = await Reservation.findById(id);
    if (!reservation) {
      return NextResponse.json({ ok: false, message: "Reserva no encontrada" }, { status: 404 });
    }

    if (reservation.table_id) {
      await Table.findByIdAndUpdate(reservation.table_id, { status: "Libre" });
    }

    await Reservation.findByIdAndDelete(id);

    return NextResponse.json({ ok: true, message: "Reserva eliminada" });
  } catch (error) {
    console.error("[DELETE /api/reservations/:id]", error);
    return NextResponse.json(
      { ok: false, message: "Error al eliminar reserva", error: String(error) },
      { status: 500 }
    );
  }
}