import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import CashClose from '@/models/CashClose';
import Payment from '@/models/Payment';
import Order from '@/models/Order';

const RESTAURANT_ID = "69e170e941daf8c2b2f76677";

export async function GET() {
  try {
    await connectDB();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Si ya hay un cierre de hoy, devolver cerrado
    const lastClose = await CashClose.findOne({
      restaurantId: RESTAURANT_ID,
      closingDate: { $gte: todayStart },
    }).sort({ closingDate: -1 });

    if (lastClose) {
      return NextResponse.json({ status: 'cerrado', closingDate: lastClose.closingDate });
    }

    // Pagos de hoy
    const payments = await Payment.find({
      timestamp: { $gte: todayStart },
    }).lean();

    const cashTotal = payments.filter(p => p.method === 'cash').reduce((s, p) => s + p.amount, 0);
    const qrTotal = payments.filter(p => p.method === 'qr').reduce((s, p) => s + p.amount, 0);
    const salesTotal = cashTotal + qrTotal;

    // Órdenes pagadas hoy
    const orders = await Order.find({
      status: 'paid',
      updatedAt: { $gte: todayStart },
    }).lean();

    const tablesServed = new Set(orders.filter(o => o.table_id).map(o => o.table_id.toString())).size;

    return NextResponse.json({
      status: 'abierto',
      openingDate: todayStart.toISOString(),
      openingBalance: 0,
      salesTotal,
      cashTotal,
      qrTotal,
      tablesServed,
      ordersCount: orders.length,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}