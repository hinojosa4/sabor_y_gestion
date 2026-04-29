// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { signToken } from "@/lib/jwt";
import { z } from "zod";
import dns from "dns/promises";

const registerSchema = z.object({
  name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "El nombre no puede superar los 100 caracteres")
    .trim(),
  email: z
    .string()
    .min(1, "El email es obligatorio")
    .email("El email no tiene un formato válido")
    .toLowerCase()
    .trim(),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  rol: z.enum(["cliente", "admin"]),
});

async function emailDomainIsValid(email: string): Promise<boolean> {
  try {
    const domain = email.split("@")[1];
    const records = await dns.resolveMx(domain);
    return records.length > 0;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

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

    const { name, email, password, rol } = parsed.data;

    // Verificar que el dominio del email existe y acepta correos
    const domainValid = await emailDomainIsValid(email);
    if (!domainValid) {
      return NextResponse.json(
        {
          ok: false,
          message: "El correo electrónico no parece ser válido. Usa una dirección real.",
        },
        { status: 400 }
      );
    }

    if (rol !== "cliente" && rol !== "admin") {
      return NextResponse.json(
        { ok: false, message: "Registro no permitido para este rol." },
        { status: 403 }
      );
    }

    if (rol === "admin") {
      const adminExists = await User.findOne({ rol: "admin" });
      if (adminExists) {
        return NextResponse.json(
          { ok: false, message: "Ya existe un administrador registrado en el sistema." },
          { status: 409 }
        );
      }
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return NextResponse.json(
        { ok: false, message: "Ya existe una cuenta con ese correo." },
        { status: 409 }
      );
    }

    const user = await User.create({ name, email, password, rol, activo: true });

    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
      rol: user.rol,
    });

    const userSafe = user.toObject();
    delete userSafe.password;

    return NextResponse.json(
      { ok: true, message: "Cuenta creada correctamente.", token, user: userSafe },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/auth/register]", error);
    return NextResponse.json(
      { ok: false, message: "Error interno del servidor." },
      { status: 500 }
    );
  }
}