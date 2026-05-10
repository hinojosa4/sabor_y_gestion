// src/app/api/users/[id]/route.ts
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();

    // 1. IMPORTANTE: Desembalar params con await
    const { id } = await params;
    const body = await req.json();

    // 2. Buscar al usuario
    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });
    }

    // 3. Opcional pero recomendado: Validar con Zod antes de asignar
    // Si el esquema de Zod es muy estricto con la contraseña, podrías usar .partial()
    // const data = userSchema.partial().parse(body);

    // 4. Mapear password_hash a password si viene del form
    if (body.password_hash) {
      body.password = body.password_hash;
      delete body.password_hash;
    }

    // 5. Actualizar y guardar (dispara el pre-save hook para bcrypt)
    Object.assign(user, body);
    await user.save();
    const updatedUser = await User.findById(id).select('+loyaltyPoints');
    return NextResponse.json(updatedUser);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    console.error("❌ API Error:", errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;

    const deletedUser = await User.findByIdAndDelete(id);

    if (!deletedUser) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ message: "Usuario eliminado con éxito" });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    console.error("❌ API Error:", errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }
}