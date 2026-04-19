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

    // 1. Validamos con Zod
    const data = userSchema.parse(body);

    // 2. IMPORTANTE: Mapear para que Mongoose lo entienda
    const userData = {
      ...data,
      // Si el form envía password_hash, pero el modelo usa password
      password: data.password_hash || data.password 
    };

    const newUser = new User(userData);
    await newUser.save(); 

    return NextResponse.json(newUser, { status: 201 });
  } catch (error: any) {
    console.error("❌ ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}