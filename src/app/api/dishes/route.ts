import { NextResponse } from 'next/server';

// Para obtener datos (GET)
export async function GET() {
  return NextResponse.json({ message: "Obteniendo datos..." }, { status: 200 });
}

// Para crear datos (POST)
export async function POST() {
  return NextResponse.json({ message: "Creando datos..." }, { status: 201 });
}