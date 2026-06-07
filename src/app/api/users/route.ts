// src/app/api/users/route.ts
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { userSchema } from '@/validations/user';
import { calculateCustomerLoyalty } from '@/lib/customerLoyalty';

// GET: Listar usuarios
export async function GET() {
  await connectDB();
  const users = await User.find()
    .select('+loyaltyPoints')
    .sort({ createdAt: -1 })
    .lean();

  const usersWithLoyalty = await Promise.all(
    users.map(async (user) => {
      if (user.rol !== 'cliente') return user;

      try {
        const loyalty = await calculateCustomerLoyalty(user._id.toString());
        return {
          ...user,
          loyaltyPoints: loyalty.points,
          loyaltyTier: {
            name: loyalty.tier.name,
            discountPercent: loyalty.discountPercent,
            totalPaidOrders: loyalty.totalPaidOrders,
            totalSpent: loyalty.totalSpent,
          },
        };
      } catch {
        return {
          ...user,
          loyaltyTier: null,
        };
      }
    })
  );

  return NextResponse.json(usersWithLoyalty);
}

// POST: Crear usuario
export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const data = userSchema.parse(body);

    const newUser = new User({
      ...data,
      password: data.password_hash 
    });

    await newUser.save();
    return NextResponse.json(newUser, { status: 201 });

  } catch (error: unknown) {
    // Verificamos si es el error 11000 de MongoDB (Duplicado)
    const isDuplicateError = 
      typeof error === 'object' && 
      error !== null && 
      'code' in error && 
      (error as { code: number }).code === 11000;

    if (isDuplicateError) {
      return NextResponse.json(
        { error: "El correo electrónico ya está registrado. Intenta con otro." }, 
        { status: 400 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : "Error inesperado";
    console.error("❌ Error Detallado:", errorMessage);
    
    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }
}
