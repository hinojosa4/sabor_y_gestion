// src/app/api/auth/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/jwt";

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
    verifyToken(token);
    return NextResponse.json({ ok: true }, { status: 200 });
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