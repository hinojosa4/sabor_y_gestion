// src/app/api/auth/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/jwt";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { ok: false, message: "Token no proporcionado" },
      { status: 401 }
    );
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = verifyToken(token);
    await connectDB();
    const dbUser = await User.findById(decoded.userId).select("-password");
    
    if (!dbUser) {
      return NextResponse.json(
        { ok: false, message: "Usuario no encontrado" },
        { status: 401 }
      );
    }

    if (!dbUser.activo) {
      return NextResponse.json(
        { ok: false, message: "Usuario inactivo" },
        { status: 401 }
      );
    }

    return NextResponse.json({ ok: true, user: dbUser }, { status: 200 });
  } catch (error: unknown) {
    const isExpired =
      error instanceof Error && error.name === "TokenExpiredError";
    return NextResponse.json(
      {
        ok: false,
        message: isExpired
          ? "La sesión ha expirado. Por favor inicia sesión nuevamente."
          : "Token inválido",
      },
      { status: 401 }
    );
  }
}