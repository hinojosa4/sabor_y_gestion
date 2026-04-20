import { NextResponse } from 'next/server';

// Obtener perfil de un usuario
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return NextResponse.json({ message: `Datos del usuario: ${id}` });
}

// Editar un usuario (ej. cambiar rol o nombre)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  return NextResponse.json({ 
    message: `Usuario ${id} actualizado`, 
    data: body 
  });
}

// Eliminar un usuario
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return NextResponse.json({ message: `Usuario ${id} borrado del sistema` });
}