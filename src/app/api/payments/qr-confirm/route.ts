// src/app/api/payments/qr-confirm/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { connectDB } from '@/lib/db';
import Order from '@/models/Order';
import OrderItem from '@/models/OrderItem';
import Table from '@/models/Table';
import Payment from '@/models/Payment';
import { sendPaymentEmail } from '@/lib/email';
import { pusherServer } from '@/lib/pusher';
import '@/models/Dish';

type LeanOrderItem = {
  _id: Types.ObjectId;
  order_id: Types.ObjectId;
  dish_id?: {
    name?: string;
    price?: number;
  } | null;
  quantity: number;
  unit_price: number;
  subtotal?: number;
};

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const { orderId, email } = await req.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'El correo electrÃ³nico es obligatorio' },
        { status: 400 }
      );
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return NextResponse.json(
        { error: 'Orden no encontrada' },
        { status: 404 }
      );
    }

    if (order.status === 'paid') {
      return NextResponse.json(
        { error: 'Esta orden ya fue pagada' },
        { status: 400 }
      );
    }

    const items = await OrderItem.find({ order_id: orderId })
      .populate({ path: 'dish_id', model: 'Dish', select: 'name price' })
      .lean<LeanOrderItem[]>();

    if (!items.length) {
      return NextResponse.json(
        { error: 'La orden no tiene productos' },
        { status: 400 }
      );
    }

    let subtotal = 0;

    const formattedItems = items.map((item) => {
      const dish = item.dish_id;

      const price = item.unit_price ?? dish?.price ?? 0;
      const quantity = item.quantity ?? 1;
      const subt = price * quantity;

      subtotal += subt;

      return {
        dish: {
          name: dish?.name || 'Plato',
          price,
        },
        quantity,
        subtotal: subt,
      };
    });

    const iva = 0;
    const total = subtotal;
    const totalAmount = total;

    const payment = await Payment.create({
      order_id: orderId,
      amount: totalAmount,
      method: 'qr',
      status: 'completed',
      customer_email: email,
      timestamp: new Date(),
    });

    order.status = 'paid';
    order.total_amount = totalAmount;
    await order.save();

    if (order.service_type === 'dine_in' && order.table_id) {
      await Table.findByIdAndUpdate(order.table_id, { status: 'Libre' });
    }

    await pusherServer.trigger("restaurant", "table:updated", {
      tableId: order.table_id,
      newStatus: "Libre",
    });

    await pusherServer.trigger("restaurant", "payment:completed", {
      paymentId: payment._id.toString(),
      orderId,
      method: 'qr',
      amount: totalAmount,
      tableId: order.table_id,
    });

    await sendPaymentEmail({
      to: email,
      orderId: order._id.toString(),
      amount: totalAmount,
      method: 'qr',
      items: formattedItems,
      subtotal,
      iva,
      total,
    });

    return NextResponse.json({
      success: true,
      message: 'Pago confirmado correctamente',
      orderId: order._id,
      items: formattedItems,
      subtotal,
      iva,
      total,
    });
  } catch (error) {
    console.error('[QR Confirm] Error:', error);

    return NextResponse.json(
      { error: 'Error al procesar el pago' },
      { status: 500 }
    );
  }
}
