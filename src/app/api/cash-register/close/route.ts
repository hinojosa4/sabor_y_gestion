import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import CashClose from '@/models/CashClose';

const RESTAURANT_ID = "69e170e941daf8c2b2f76677";

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const cashClose = await CashClose.create({
      restaurantId: RESTAURANT_ID,
      openingDate: todayStart,
      openingBalance: body.openingBalance || 0,
      closingBalance: body.closingBalance,
      salesTotal: body.salesTotal,
      cashTotal: body.cashTotal,
      qrTotal: body.qrTotal,
      tablesServed: body.tablesServed,
      ordersCount: body.ordersCount,
      closedBy: body.userId || 'sistema', // puedes pasar el userId desde el front
    });

    return NextResponse.json(cashClose);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Error al cerrar caja' }, { status: 500 });
  }
}