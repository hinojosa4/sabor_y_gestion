// src/app/api/reservations/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Reservation from "@/models/Reservation";
import { verifyToken } from "@/lib/jwt";
import { pusherServer } from "@/lib/pusher";
import "@/models/User";
import "@/models/Table"; 

// ── POST /api/reservations ─────────────────────────────────────────────────────
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
      contact_name,
      contact_lastname,
      contact_phone,
      party_size,
      date,
      occasion,
      special_requests,
    } = body;

    // ── Validaciones ───────────────────────────────────────────────────────────
    if (!contact_name?.trim()) {
      return NextResponse.json({ ok: false, message: "El nombre es obligatorio" }, { status: 400 });
    }
    if (!contact_lastname?.trim()) {
      return NextResponse.json({ ok: false, message: "El apellido es obligatorio" }, { status: 400 });
    }
    if (!contact_phone?.trim()) {
      return NextResponse.json({ ok: false, message: "El celular es obligatorio" }, { status: 400 });
    }
    if (!party_size || party_size < 1 || party_size > 20) {
      return NextResponse.json(
        { ok: false, message: "El número de personas debe estar entre 1 y 20" },
        { status: 400 }
      );
    }
    if (!date) {
      return NextResponse.json({ ok: false, message: "La fecha y hora son obligatorias" }, { status: 400 });
    }

    const reservationDate = new Date(date);
    if (isNaN(reservationDate.getTime())) {
      return NextResponse.json({ ok: false, message: "La fecha no es válida" }, { status: 400 });
    }
    if (reservationDate < new Date()) {
      return NextResponse.json(
        { ok: false, message: "La fecha debe ser en el futuro" },
        { status: 400 }
      );
    }

    // ── Crear reserva ──────────────────────────────────────────────────────────
    const reservation = await Reservation.create({
      user_id: userId,
      contact_name: contact_name.trim(),
      contact_lastname: contact_lastname.trim(),
      contact_phone: contact_phone.trim(),
      party_size: Number(party_size),
      date: reservationDate,
      occasion: occasion ?? "",
      special_requests: special_requests?.trim() ?? "",
      status: "pending",
    });

    // Notificar al restaurante en tiempo real
    await pusherServer.trigger("restaurant", "reservation:new", {
      reservation: reservation.toObject(),
    });

    return NextResponse.json(
      { ok: true, message: "Reserva creada correctamente", data: reservation },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/reservations]", error);
    return NextResponse.json(
      { ok: false, message: "Error al crear reserva", error: String(error) },
      { status: 500 }
    );
  }
}

// ── GET /api/reservations ──────────────────────────────────────────────────────
// - admin / mesero: ven TODAS las reservas (con filtros opcionales)
// - cliente: solo las suyas
export async function GET(req: NextRequest) {
  try {
    await connectDB();

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

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status"); // "pending" | "confirmed" | etc.
    const dateFilter   = searchParams.get("date");   // "YYYY-MM-DD"

    // Construir query
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: Record<string, any> = {};

    // Clientes solo ven las suyas
    if (payload.rol === "cliente") {
      query.user_id = payload.userId;
    }

    if (statusFilter && statusFilter !== "all") {
      query.status = statusFilter;
    }

    if (dateFilter) {
      const start = new Date(`${dateFilter}T00:00:00`);
      const end   = new Date(`${dateFilter}T23:59:59`);
      query.date  = { $gte: start, $lte: end };
    }

    const reservations = await Reservation.find(query)
      .sort({ date: 1 })
      .populate("table_id", "number capacity location status")
      .populate("user_id", "name email")
      .lean();

    return NextResponse.json({ ok: true, data: reservations });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: "Error al obtener reservas", error: String(error) },
      { status: 500 }
    );
  }
}