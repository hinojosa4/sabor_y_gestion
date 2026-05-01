import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Payment from '@/models/Payment';
import Order from '@/models/Order';
import Table from '@/models/Table';

//const RESTAURANT_ID = "69e170e941daf8c2b2f76677"; // para obtener el nombre del restaurante

export async function POST(req: Request) {
  try {
    await connectDB();
    const { orderId, amount, method, tableId } = await req.json();

    const order = await Order.findById(orderId);
    if (!order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
    }

    // Crear pago
    const payment = await Payment.create({
      order_id: orderId,
      amount,
      method,
      status: 'completed',
      timestamp: new Date(),
    });

    // Actualizar orden
    order.status = 'paid';
    await order.save();

    // Liberar mesa si es dine_in
    if (order.service_type === 'dine_in' && tableId) {
      await Table.findByIdAndUpdate(tableId, { status: 'Libre' });
    }

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error('[Payment] Error:', error);
    return NextResponse.json({ error: 'Error al procesar pago' }, { status: 500 });
  }
}