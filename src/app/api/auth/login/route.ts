import { NextResponse } from 'next/server';

export async function POST() {
  // Aquí procesarás el correo y contraseña que envíe el usuario
  return NextResponse.json({ message: "Endpoint de login listo" });
}