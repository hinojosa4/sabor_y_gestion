import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Payment from '@/models/Payment';
import Order from '@/models/Order';
import OrderItem from '@/models/OrderItem';
import Table from '@/models/Table';
import { pusherServer } from "@/lib/pusher";
//const RESTAURANT_ID = "69e170e941daf8c2b2f76677"; // para obtener el nombre del restaurante

export async function POST(req: Request) {
  try {
    await connectDB();
    const { orderId, method, tableId, customerEmail } = await req.json();

    const order = await Order.findById(orderId);
    if (!order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
    }

    const items = await OrderItem.find({ order_id: orderId }).lean<{
      quantity?: number;
      unit_price?: number;
    }[]>();

    if (!items.length) {
      return NextResponse.json({ error: 'La orden no tiene productos' }, { status: 400 });
    }

    const subtotal = items.reduce((sum, item) => {
      const quantity = item.quantity ?? 1;
      const unitPrice = item.unit_price ?? 0;
      return sum + unitPrice * quantity;
    }, 0);
    const amount = subtotal;

    // Crear pago
    const payment = await Payment.create({
      order_id: orderId,
      amount,
      method,
      status: 'completed',
      customer_email: customerEmail || null,
      timestamp: new Date(),
    });

    // Actualizar orden
    order.status = 'paid';
    await order.save();

    // Liberar mesa si es dine_in
    if (order.service_type === 'dine_in' && tableId) {
      await Table.findByIdAndUpdate(tableId, { status: 'Libre' });
    }
    await pusherServer.trigger("restaurant", "table:updated", {
      tableId,
      newStatus: "Libre",
    });

    await pusherServer.trigger("restaurant", "payment:completed", {
      paymentId: payment._id.toString(),
      orderId,
      method,
      amount,
      tableId,
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error('[Payment] Error:', error);
    return NextResponse.json({ error: 'Error al procesar pago' }, { status: 500 });
  }
}
