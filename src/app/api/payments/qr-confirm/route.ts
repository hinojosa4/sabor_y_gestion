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
import { findRegisteredCustomerByEmail } from '@/lib/customerLookup';
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
    const { email: normalizedEmail, customer } = await findRegisteredCustomerByEmail(email);

    if (!normalizedEmail) {
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
      customer_id: customer?._id ?? null,
      customer_email: normalizedEmail,
      timestamp: new Date(),
    });

    // Para delivery: el pago se registra pero la orden sigue su flujo de cocina
    // Para dine_in/pick_up: flujo original sin cambios
    if (order.service_type === 'delivery') {
      // No cambiar status — queda en pending para ir a cocina normalmente
      // Solo registrar que el pago fue recibido
      order.payment_method = 'QR / Transferencia';
    } else {
      // Flujo original de mesa — sin cambios
      order.status = 'paid';
      if (order.table_id) {
        await Table.findByIdAndUpdate(order.table_id, { status: 'Libre' });
        await pusherServer.trigger("restaurant", "table:updated", {
          tableId: order.table_id,
          newStatus: "Libre",
        });
      }
    }

    order.total_amount = totalAmount;
    if (customer && !order.customer_id) {
      order.customer_id = customer._id;
    }
    await order.save();

    await pusherServer.trigger("restaurant", "payment:completed", {
      paymentId: payment._id.toString(),
      orderId,
      method: 'qr',
      amount: totalAmount,
      tableId: order.table_id,
      customer: customer
        ? {
            id: customer._id.toString(),
            name: customer.name,
            email: customer.email,
            type: 'registered',
          }
        : {
            id: null,
            name: null,
            email: normalizedEmail,
            type: 'guest',
          },
    });

    await sendPaymentEmail({
      to: normalizedEmail,
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
