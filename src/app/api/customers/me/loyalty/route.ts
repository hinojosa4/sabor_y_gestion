import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { verifyToken } from "@/lib/jwt";
import { calculateCustomerLoyalty } from "@/lib/customerLoyalty";
import User from "@/models/User";

export async function GET(req: NextRequest) {
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
      return NextResponse.json({ ok: false, message: "Token invalido" }, { status: 401 });
    }

    const customer = await User.findOne({
      _id: userId,
      rol: "cliente",
      activo: true,
    }).select("_id");

    if (!customer) {
      return NextResponse.json(
        { ok: false, message: "Cliente no encontrado o inactivo" },
        { status: 404 }
      );
    }

    // Fuente oficial para mostrar categoria, puntos y descuento disponible.
    const loyalty = await calculateCustomerLoyalty(customer._id.toString());

    return NextResponse.json({ ok: true, data: loyalty });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: "Error al obtener fidelizacion",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
}
