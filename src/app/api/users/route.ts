import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: "Listado de usuarios" }, { status: 200 });
}

export async function POST(request: Request) {
  const body = await request.json();
  return NextResponse.json({ message: "Usuario creado", data: body }, { status: 201 });
}