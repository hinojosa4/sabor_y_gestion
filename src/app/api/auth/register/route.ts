import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { z } from "zod";

const registerSchema = z.object({
  nombre: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  rol: z.enum(["admin", "cajero", "cocinero", "mesero"]),
});

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { nombre, email, password, rol } = parsed.data;

    // verificar si ya existe
    const exists = await User.findOne({ email });
    if (exists) {
      return NextResponse.json(
        { error: "El usuario ya existe" },
        { status: 400 }
      );
    }

    // crear usuario (aquí se hashea automáticamente)
    const user = await User.create({
      nombre,
      email,
      password,
      rol,
      activo: true,
    });

    const { password: _, ...userSafe } = user.toObject();

    return NextResponse.json(
      {
        message: "Usuario creado",
        user: userSafe,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Error del servidor" },
      { status: 500 }
    );
  }
}