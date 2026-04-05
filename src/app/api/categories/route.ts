import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: "Listado de categorías" }, { status: 200 });
}

export async function POST(request: Request) {
  const body = await request.json();
  return NextResponse.json({ message: "Categoría creada", data: body }, { status: 201 });
}