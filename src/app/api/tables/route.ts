import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Table from '@/models/Table';

// GET: Obtener mesas activas
export async function GET() {
    try {
        await connectDB();

        const tables = await Table.find({ isAvailable: true })
            .sort({ number: 1 });

        return NextResponse.json(tables);
    } catch (error: unknown) {
        return NextResponse.json(
            { error: "Error al obtener mesas" },
            { status: 500 }
        );
    }
}

// POST: Crear nueva mesa
export async function POST(request: Request) {
    try {
        await connectDB();
        const data = await request.json();

        const newTable = await Table.create(data);

        return NextResponse.json(newTable, { status: 201 });

    } catch (error: unknown) {

        // Error de duplicado en MongoDB
        if (
            typeof error === 'object' &&
            error !== null &&
            'code' in error &&
            (error as { code: number }).code === 11000
        ) {
            return NextResponse.json(
                { error: "El número de mesa ya existe" },
                { status: 400 }
            );
        }

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Error desconocido"
            },
            { status: 400 }
        );
    }
}