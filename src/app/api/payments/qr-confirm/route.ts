// src/app/api/payments/qr-confirm/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { connectDB } from '@/lib/db';
import Order from '@/models/Order';
import OrderItem from '@/models/OrderItem';
import Table from '@/models/Table';
import Payment from '@/models/Payment';
import Dish from '@/models/Dish';
import { sendPaymentEmail } from '@/lib/email';

type LeanOrderItem = {
  _id: Types.ObjectId;
  order_id: Types.ObjectId;
  dish_id?: Types.ObjectId;
  quantity: number;
  unit_price: number;
  subtotal?: number;
};

type LeanDish = {
  _id: Types.ObjectId;
  name: string;
  price: number;
};

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const { orderId, email } = await req.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'El correo electrónico es obligatorio' },
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
      .lean<LeanOrderItem[]>();

    if (!items.length) {
      return NextResponse.json(
        { error: 'La orden no tiene productos' },
        { status: 400 }
      );
    }

    const dishIds = items
      .map((item) => item.dish_id)
      .filter((dishId): dishId is Types.ObjectId => Boolean(dishId));

    const dishes = await Dish.find({
      _id: { $in: dishIds },
    }).lean<LeanDish[]>();

    const dishMap = new Map(
      dishes.map((dish) => [dish._id.toString(), dish])
    );

    let subtotal = 0;

    const formattedItems = items.map((item) => {
      const dishId = item.dish_id?.toString();
      const dish = dishId ? dishMap.get(dishId) : undefined;

      const price = item.unit_price ?? dish?.price ?? 0;
      const quantity = item.quantity ?? 1;
      const subt = item.subtotal ?? price * quantity;

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

    const iva = subtotal * 0.13;
    const total = subtotal + iva;
    const totalAmount = total;

    await Payment.create({
      order_id: orderId,
      amount: totalAmount,
      method: 'qr',
      status: 'completed',
      timestamp: new Date(),
    });

    order.status = 'paid';
    order.total_amount = totalAmount;
    await order.save();

    if (order.service_type === 'dine_in' && order.table_id) {
      await Table.findByIdAndUpdate(order.table_id, { status: 'Libre' });
    }

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