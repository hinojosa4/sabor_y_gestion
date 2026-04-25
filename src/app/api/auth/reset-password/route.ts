// src/app/api/auth/reset-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { verifyToken } from "@/lib/jwt";
import { z } from "zod";

const resetSchema = z.object({
  token: z.string().min(1, "Token requerido"),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = resetSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          message: "Datos inválidos",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { token, password } = parsed.data;

    // Verificar el token JWT
    let decoded: ReturnType<typeof verifyToken>;
    try {
      decoded = verifyToken(token);
    } catch (err: unknown) {
      const isExpired =
        err instanceof Error && err.name === "TokenExpiredError";
      return NextResponse.json(
        {
          ok: false,
          message: isExpired
            ? "El enlace ha expirado. Solicita uno nuevo."
            : "El enlace no es válido.",
        },
        { status: 401 }
      );
    }

    // Verificar que sea un token de reset, no uno de sesión normal
    if ((decoded as { purpose?: string }).purpose !== "password_reset") {
      return NextResponse.json(
        { ok: false, message: "Token no válido para esta operación." },
        { status: 401 }
      );
    }

    await connectDB();
    const user = await User.findById(decoded.userId).select("+password");

    if (!user || !user.activo) {
      return NextResponse.json(
        { ok: false, message: "Usuario no encontrado o desactivado." },
        { status: 404 }
      );
    }

    // Asignar nueva contraseña — el pre('save') del User model la hashea automáticamente
    user.password = password;
    await user.save();

    return NextResponse.json(
      { ok: true, message: "Contraseña actualizada correctamente." },
      { status: 200 }
    );
  } catch (error) {
    console.error("[POST /api/auth/reset-password]", error);
    return NextResponse.json(
      { ok: false, message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}