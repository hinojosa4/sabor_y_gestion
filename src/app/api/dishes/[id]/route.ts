import { NextResponse } from 'next/server';

// Obtener un plato específico
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return NextResponse.json({ message: `Detalle del plato con ID: ${id}` });
}

// Actualizar un plato
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  return NextResponse.json({ 
    message: `Plato ${id} actualizado correctamente`, 
    data: body 
  });
}
