import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import {
    getCashierShiftByUserId,
    getCashShiftContext,
    RESTAURANT_ID,
} from '@/lib/cashRegister';
import CashClose from '@/models/CashClose';

function getUserIdFromRequest(req: NextRequest) {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return null;
    try {
        return verifyToken(authHeader.split(' ')[1]).userId;
    } catch {
        return null;
    }
}

export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const body = await req.json();
        const userId = getUserIdFromRequest(req) ?? body.userId;

        if (!userId) {
            return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });
        }

        const assignedShift = await getCashierShiftByUserId(userId);
        if (!assignedShift) {
            return NextResponse.json(
                { error: 'No se encontró un turno asignado para este cajero' },
                { status: 403 }
            );
        }

        // Primero obtener el contexto del turno
        const shift = await getCashShiftContext(assignedShift);

        // Verificar si ya existe una caja ABIERTA (sin closingDate)
        const existingOpen = await CashClose.findOne({
            restaurantId: RESTAURANT_ID,
            shiftName: assignedShift,
            shiftDate: shift.shiftDate,
            closingDate: { $eq: null }, // Solo si está abierta
        });
        if (existingOpen) {
            return NextResponse.json(
                { error: 'Ya hay una caja abierta para este turno. Debes cerrarla antes de abrir una nueva.' },
                { status: 409 }
            );
        }

        const now = new Date();

        // Crear registro de apertura de caja (sin closingDate)
        const cashClose = await CashClose.create({
            restaurantId: RESTAURANT_ID,
            openingDate: now,
            closingDate: null,
            shiftName: shift.shiftName,
            shiftDate: shift.shiftDate,
            shiftStart: shift.shiftStart,
            shiftEnd: shift.shiftEnd,
            openingBalance: body.openingBalance || 0,
            closingBalance: 0,
            salesTotal: 0,
            cashTotal: 0,
            qrTotal: 0,
            tablesServed: 0,
            ordersCount: 0,
            closedBy: userId,
        });

        return NextResponse.json({
            success: true,
            message: 'Caja abierta correctamente',
            cashClose,
        });
    } catch (error) {
        console.error('Error al abrir caja:', error);
        return NextResponse.json({ error: 'Error al abrir caja' }, { status: 500 });
    }
}