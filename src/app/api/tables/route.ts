// app/api/tables/route.ts
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Table from '@/models/Table';
import mongoose from 'mongoose';

// Agregar arriba del archivo, junto a los demás imports
import Reservation from "@/models/Reservation";

    const ACTIVATION_WINDOW_HOURS = Number(process.env.RESERVATION_ACTIVATION_HOURS ?? 2);

    async function activateDueReservations() {
        const now = new Date();
        const windowEnd = new Date(now.getTime() + ACTIVATION_WINDOW_HOURS * 60 * 60 * 1000);

        const reservations = await Reservation.find({
            status: "confirmed",
            table_id: { $exists: true, $ne: null },
            date: { $gte: now, $lte: windowEnd },
        }).populate("table_id", "status");

        for (const r of reservations) {
            const t = r.table_id as unknown as { _id: string; status: string } | null;
            if (t && t.status === "Libre") {
            await Table.findByIdAndUpdate(t._id, { status: "Reservada" });
            }
        }
    }

// ✅ Definir tipo para el query
interface TableQuery {
    restaurantId?: string | mongoose.Types.ObjectId;
}

export async function GET(request: Request) {
    try {
        await connectDB();
        await activateDueReservations(); 

        const { searchParams } = new URL(request.url);
        const restaurantId = searchParams.get('restaurantId');

        // ✅ Reemplazar 'any' por TableQuery
        const query: TableQuery = {};
        if (restaurantId) {
            query.restaurantId = restaurantId;
        }

        const tables = await Table.find(query)
            .sort({ number: 1 })
            .lean();

        return NextResponse.json(tables);
    } catch (error) {
        console.error('Error al obtener mesas:', error);
        return NextResponse.json([], { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        await connectDB();
        const data = await request.json();

        const numberValue = Number(data.number);
        const capacityValue = Number(data.capacity);

        if (isNaN(numberValue) || numberValue < 1) {
            return NextResponse.json(
                { error: 'El número de mesa debe ser un número válido' },
                { status: 400 }
            );
        }

        const existingTable = await Table.findOne({
            restaurantId: data.restaurantId,
            number: numberValue
        });

        if (existingTable) {
            return NextResponse.json(
                { error: 'Ya existe una mesa con ese número en este restaurante' },
                { status: 400 }
            );
        }

        const tableData = {
            restaurantId: data.restaurantId,
            number: numberValue,
            capacity: capacityValue,
            location: data.location,
            status: data.status || 'Libre',
            xPosition: Number(data.xPosition) || 50,
            yPosition: Number(data.yPosition) || 50
        };

        const table = await Table.create(tableData);

        return NextResponse.json(table, { status: 201 });
    } catch (error) {
        console.error('Error al crear mesa:', error);

        // ✅ Reemplazar 'error: any' por error tipado
        if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
            return NextResponse.json(
                { error: 'Ya existe una mesa con ese número en este restaurante' },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Error al crear la mesa' },
            { status: 500 }
        );
    }
}

export async function PUT(request: Request) {
    try {
        await connectDB();

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const body = await request.json();

        if (!id) {
            return NextResponse.json({ error: 'ID de mesa requerido' }, { status: 400 });
        }

        if (body.number) {
            const existingTable = await Table.findOne({
                restaurantId: body.restaurantId,
                number: body.number,
                _id: { $ne: id }
            });

            if (existingTable) {
                return NextResponse.json(
                    { error: `Ya existe otra mesa con el número ${body.number} en este restaurante` },
                    { status: 400 }
                );
            }
        }

        if (body.isAvailable !== undefined) {
            delete body.isAvailable;
        }

        const table = await Table.findByIdAndUpdate(id, body, { new: true });

        if (!table) {
            return NextResponse.json({ error: 'Mesa no encontrada' }, { status: 404 });
        }

        return NextResponse.json(table);
    } catch (error) {
        console.error('Error al actualizar mesa:', error);
        return NextResponse.json(
            { error: 'Error al actualizar la mesa' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: Request) {
    try {
        await connectDB();

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID de mesa requerido' }, { status: 400 });
        }

        const table = await Table.findByIdAndDelete(id);

        if (!table) {
            return NextResponse.json({ error: 'Mesa no encontrada' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error al eliminar mesa:', error);
        return NextResponse.json(
            { error: 'Error al eliminar la mesa' },
            { status: 500 }
        );
    }
}
