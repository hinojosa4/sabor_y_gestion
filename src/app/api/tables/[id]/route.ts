import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Table from "@/models/Table";

type Context = {
  params: Promise<{
    id: string;
  }>;
};

// PUT: Editar información o cambiar estado
export async function PUT(
  request: NextRequest,
  { params }: Context
) {
  try {
    await connectDB();

    const { id } = await params;
    const data = await request.json();

    const updatedTable = await Table.findByIdAndUpdate(
      id,
      data,
      { new: true }
    );

    return NextResponse.json(updatedTable);
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Error desconocido",
      },
      { status: 400 }
    );
  }
}

// DELETE: Eliminación lógica
export async function DELETE(
  request: NextRequest,
  { params }: Context
) {
  try {
    await connectDB();

    const { id } = await params;

    await Table.findByIdAndUpdate(
      id,
      { isAvailable: false },
      { new: true }
    );

    return NextResponse.json({
      message: "Mesa desactivada correctamente",
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Error al eliminar",
      },
      { status: 500 }
    );
  }
}