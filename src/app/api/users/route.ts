import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { userSchema } from '@/validations/user';

// GET: Listar usuarios
export async function GET() {
  await connectDB();
  const users = await User.find().sort({ createdAt: -1 });
  return NextResponse.json(users);
}

// POST: Crear usuario
export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const data = userSchema.parse(body);

    const newUser = new User(data);
    await newUser.save(); // El pre-save hook del modelo encriptará la contraseña automáticamente

    return NextResponse.json(newUser, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}