import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { signToken } from "@/lib/jwt";
import { loginSchema } from "@/validations/auth";
import { ZodError } from "zod";

export async function POST(req: NextRequest) {
  try {
    // 1. Parsear y validar el body
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

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

    const { email, password } = parsed.data;

    // 2. Conectar a la base de datos
    await connectDB();

    // 3. Buscar usuario (incluir password que tiene select:false)
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      // Respuesta genérica para no revelar si el email existe
      return NextResponse.json(
        { ok: false, message: "Credenciales incorrectas" },
        { status: 401 }
      );
    }

    // 4. Verificar que el usuario esté activo
    if (!user.activo) {
      return NextResponse.json(
        { ok: false, message: "Tu cuenta está desactivada. Contacta al administrador." },
        { status: 403 }
      );
    }

    // 5. Comparar contraseña
    const passwordMatch = await user.comparePassword(password);

    if (!passwordMatch) {
      return NextResponse.json(
        { ok: false, message: "Credenciales incorrectas" },
        { status: 401 }
      );
    }

    // 6. Generar JWT
    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
      rol: user.rol,
    });

    // 7. Respuesta exitosa (sin exponer la contraseña)
    const { password: _pwd, ...userSafe } = user.toObject();

    return NextResponse.json(
      {
        ok: true,
        message: "Inicio de sesión exitoso",
        token,
        user: userSafe,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[POST /api/auth/login]", error);
    return NextResponse.json(
      { ok: false, message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}