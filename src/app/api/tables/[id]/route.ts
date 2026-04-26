// app/api/tables/[id]/route.ts
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Table from '@/models/Table';

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();
        const { id } = await params;
        const data = await request.json();

        // 🔥 Si llega isAvailable, eliminarlo (ya no existe en el modelo)
        if (data.isAvailable !== undefined) {
            delete data.isAvailable;
        }

        const table = await Table.findByIdAndUpdate(
            id,
            data,
            { returnDocument: 'after' }
        );

        if (!table) {
            return NextResponse.json(
                { error: 'Mesa no encontrada' },
                { status: 404 }
            );
        }

        return NextResponse.json(table);
    } catch (error) {
        console.error('Error en PUT:', error);
        return NextResponse.json(
            { error: 'Error al actualizar la mesa' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();
        const { id } = await params;

        const deleted = await Table.findByIdAndDelete(id);

        if (!deleted) {
            return NextResponse.json(
                { error: 'Mesa no encontrada' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error en DELETE:', error);
        return NextResponse.json(
            { error: 'Error al eliminar la mesa' },
            { status: 500 }
        );
    }
}
