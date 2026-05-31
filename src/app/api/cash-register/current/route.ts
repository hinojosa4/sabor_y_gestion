import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import {
  getCashCloseForShift,
  getCashShiftContext,
  getCashRegisterSummaryForShift,
  getCashierShiftByUserId,
  getCurrentOperationalShift,
  isWithinShiftHours,
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

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const userId = getUserIdFromRequest(req);
    const assignedShift = await getCashierShiftByUserId(userId);
    const shiftName = assignedShift ?? await getCurrentOperationalShift();

    if (!shiftName) {
      return NextResponse.json({
        status: 'cerrado',
        message: 'Fuera del horario de caja',
      });
    }

    if (assignedShift && !(await isWithinShiftHours(assignedShift))) {
      const shift = await getCashShiftContext(assignedShift);
      return NextResponse.json({
        status: 'cerrado',
        message: `Fuera del horario de ${assignedShift}: ${shift.shiftRange}`,
        shiftName: assignedShift,
        shiftDate: shift.shiftDate,
        shiftStart: shift.shiftStart.toISOString(),
        shiftEnd: shift.shiftEnd.toISOString(),
      });
    }

    const lastClose = await getCashCloseForShift(shiftName);

    if (lastClose) {
      return NextResponse.json({
        status: 'cerrado',
        closingDate: lastClose.closingDate,
        shiftName: lastClose.shiftName ?? shiftName,
        shiftDate: lastClose.shiftDate,
      });
    }

    const summary = await getCashRegisterSummaryForShift(shiftName);

    return NextResponse.json({
      status: 'abierto',
      openingDate: summary.openingDate.toISOString(),
      openingBalance: summary.openingBalance,
      salesTotal: summary.salesTotal,
      cashTotal: summary.cashTotal,
      qrTotal: summary.qrTotal,
      tablesServed: summary.tablesServed,
      ordersCount: summary.ordersCount,
      shiftName: summary.shiftName,
      shiftDate: summary.shiftDate,
      shiftStart: summary.shiftStart.toISOString(),
      shiftEnd: summary.shiftEnd.toISOString(),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
