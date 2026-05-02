// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import LoginAttempt from "@/models/LoginAttempt";
import { signToken } from "@/lib/jwt";
import { loginSchema } from "@/validations/auth";

const MAX_ATTEMPTS = 5;
const BLOCK_MINUTES = 5;

function getIP(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  return ip;
}

function minutesRemaining(blockedUntil: Date): number {
  const diff = blockedUntil.getTime() - Date.now();
  return Math.ceil(diff / 1000 / 60);
}

export async function POST(req: NextRequest) {
  try {
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
    const ip = getIP(req);

    await connectDB();

    // 1. Verificar si la IP está bloqueada
    const attemptRecord = await LoginAttempt.findOne({ ip });

    if (attemptRecord?.blockedUntil && attemptRecord.blockedUntil > new Date()) {
      const mins = minutesRemaining(attemptRecord.blockedUntil);
      return NextResponse.json(
        {
          ok: false,
          message: `Demasiados intentos fallidos. Intenta de nuevo en ${mins} minuto${mins !== 1 ? "s" : ""}.`,
          blockedUntil: attemptRecord.blockedUntil,
        },
        { status: 429 }
      );
    }

    // 2. Buscar usuario
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      await registerFailedAttempt(ip, attemptRecord);
      return NextResponse.json(
        { ok: false, message: "No se encuentra registrado" },
        { status: 401 }
      );
    }

    // 3. Verificar que esté activo
    if (!user.activo) {
      return NextResponse.json(
        { ok: false, message: "Tu cuenta está desactivada. Contacta al administrador." },
        { status: 403 }
      );
    }

    // 4. Comparar contraseña
    const passwordMatch = await user.comparePassword(password);

    if (!passwordMatch) {
      const updated = await registerFailedAttempt(ip, attemptRecord);

      const remaining = MAX_ATTEMPTS - updated.attempts;

      if (updated.blockedUntil) {
        const mins = minutesRemaining(updated.blockedUntil);
        return NextResponse.json(
          {
            ok: false,
            message: `Demasiados intentos fallidos. Intenta de nuevo en ${mins} minuto${mins !== 1 ? "s" : ""}.`,
            blockedUntil: updated.blockedUntil,
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        {
          ok: false,
          message: `Credenciales incorrectas. Te quedan ${remaining} intento${remaining !== 1 ? "s" : ""}.`,
        },
        { status: 401 }
      );
    }

    // 5. Login exitoso — resetear intentos
    if (attemptRecord) {
      await LoginAttempt.deleteOne({ ip });
    }

    // 6. Generar JWT
    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
      rol: user.rol,
    });

    const userSafe = user.toObject();
    delete userSafe.password;

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

async function registerFailedAttempt(
  ip: string,
  existing: { attempts: number; blockedUntil: Date | null } | null
) {
  const newAttempts = (existing?.attempts ?? 0) + 1;
  const shouldBlock = newAttempts >= MAX_ATTEMPTS;

  const blockedUntil = shouldBlock
    ? new Date(Date.now() + BLOCK_MINUTES * 60 * 1000)
    : null;

  const updated = await LoginAttempt.findOneAndUpdate(
    { ip },
    {
      $set: {
        attempts: newAttempts,
        blockedUntil,
        lastAttempt: new Date(),
      },
    },
    { upsert: true, returnDocument: "after" }
  );

  return updated;
}