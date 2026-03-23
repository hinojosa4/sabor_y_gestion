import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  await connectDB();
  const body = await req.json();
  
  const user = await User.findById(params.id);
  if (!user) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  // Actualizar campos permitidos
  Object.assign(user, body);
  await user.save(); // Esto garantiza que si cambias la contraseña, se encripte de nuevo

  return NextResponse.json(user);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  await connectDB();
  await User.findByIdAndDelete(params.id);
  return NextResponse.json({ message: "Usuario eliminado con éxito" });
}