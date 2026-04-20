import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> } // Definimos params como Promesa
) {
  const { id } = await params; // ¡Aquí está el truco! Debemos esperar a los params
  return NextResponse.json({ message: `Detalle de la categoría ${id}` });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  return NextResponse.json({ message: `Categoría ${id} actualizada`, data: body });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return NextResponse.json({ message: `Categoría ${id} eliminada` });
}