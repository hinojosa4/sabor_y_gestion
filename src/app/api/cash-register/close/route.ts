import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import CashClose from '@/models/CashClose';
import { verifyToken } from '@/lib/jwt';
import {
  getCashCloseForShift,
  getCashShiftContext,
  getCashRegisterSummaryForShift,
  getCashierShiftByUserId,
  isWithinShiftHours,
  RESTAURANT_ID,
} from '@/lib/cashRegister';

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
    const shiftName = await getCashierShiftByUserId(userId);

    if (!shiftName) {
      return NextResponse.json(
        { error: 'No se encontró un turno asignado para este cajero' },
        { status: 403 }
      );
    }

    if (!(await isWithinShiftHours(shiftName))) {
      const shift = await getCashShiftContext(shiftName);
      return NextResponse.json(
        { error: `No puedes cerrar caja fuera de tu horario de ${shiftName}: ${shift.shiftRange}` },
        { status: 403 }
      );
    }

    const existingClose = await getCashCloseForShift(shiftName);
    if (existingClose) {
      return NextResponse.json(
        { error: 'La caja de este turno ya fue cerrada' },
        { status: 409 }
      );
    }

    const summary = await getCashRegisterSummaryForShift(shiftName);

    const cashClose = await CashClose.create({
      restaurantId: RESTAURANT_ID,
      openingDate: summary.openingDate,
      closingDate: new Date(),
      shiftName: summary.shiftName,
      shiftDate: summary.shiftDate,
      shiftStart: summary.shiftStart,
      shiftEnd: summary.shiftEnd,
      openingBalance: summary.openingBalance,
      closingBalance: body.closingBalance ?? summary.salesTotal,
      salesTotal: summary.salesTotal,
      cashTotal: summary.cashTotal,
      qrTotal: summary.qrTotal,
      tablesServed: summary.tablesServed,
      ordersCount: summary.ordersCount,
      closedBy: userId || 'sistema',
    });

    return NextResponse.json(cashClose);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Error al cerrar caja' }, { status: 500 });
  }
}
