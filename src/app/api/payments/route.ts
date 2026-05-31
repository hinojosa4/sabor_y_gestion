import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Payment from '@/models/Payment';
import Order from '@/models/Order';
import OrderItem from '@/models/OrderItem';
import Table from '@/models/Table';
import { pusherServer } from "@/lib/pusher";
import { findRegisteredCustomerByEmail } from '@/lib/customerLookup';
import { verifyToken } from '@/lib/jwt';
import { getOpenCashShiftForUser, getOpenOperationalCashShift } from '@/lib/cashRegister';
//const RESTAURANT_ID = "69e170e941daf8c2b2f76677"; // para obtener el nombre del restaurante

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
    const { orderId, method, tableId, customerEmail } = await req.json();

    const userId = getUserIdFromRequest(req);
    const cashShift = userId
      ? await getOpenCashShiftForUser(userId)
      : await getOpenOperationalCashShift();

    if (!cashShift.ok) {
      return NextResponse.json(
        { error: cashShift.error },
        { status: 403 }
      );
    }

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

    const { email: normalizedEmail, customer } = await findRegisteredCustomerByEmail(customerEmail);

    // Crear pago
    const payment = await Payment.create({
      order_id: orderId,
      amount,
      method,
      status: 'completed',
      shiftName: cashShift.shift.shiftName,
      shiftDate: cashShift.shift.shiftDate,
      shiftStart: cashShift.shift.shiftStart,
      shiftEnd: cashShift.shift.shiftEnd,
      customer_id: customer?._id ?? null,
      customer_email: normalizedEmail,
      timestamp: new Date(),
    });

    // Actualizar orden
    order.status = 'paid';
    if (customer && !order.customer_id) {
      order.customer_id = customer._id;
    }
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
      customer: customer
        ? {
            id: customer._id.toString(),
            name: customer.name,
            email: customer.email,
            type: 'registered',
          }
        : normalizedEmail
          ? {
              id: null,
              name: null,
              email: normalizedEmail,
              type: 'guest',
            }
          : null,
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error('[Payment] Error:', error);
    return NextResponse.json({ error: 'Error al procesar pago' }, { status: 500 });
  }
}
