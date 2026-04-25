import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Table from '@/models/Table';

type Params = {
    params: {
        id: string;
    };
};

// PUT: Editar información o cambiar el estado
export async function PUT(request: Request, { params }: Params) {
    try {
        await connectDB();
        const data = await request.json();

        const updatedTable = await Table.findByIdAndUpdate(
            params.id,
            data,
            { new: true }
        );

        return NextResponse.json(updatedTable);
    } catch (error: unknown) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Error desconocido" },
            { status: 400 }
        );
    }
}

// DELETE: Eliminación lógica
export async function DELETE(request: Request, { params }: Params) {
    try {
        await connectDB();

        await Table.findByIdAndUpdate(
            params.id,
            { isAvailable: false },
            { new: true }
        );

        return NextResponse.json({ message: "Mesa desactivada correctamente" });
    } catch (error: unknown) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Error al eliminar" },
            { status: 500 }
        );
    }
}