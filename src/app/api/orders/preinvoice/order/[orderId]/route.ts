import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { connectDB } from '@/lib/db';
import Order from '@/models/Order';
import OrderItem from '@/models/OrderItem';
import Table from '@/models/Table';
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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    await connectDB();
    const { orderId } = await params;

    if (!Types.ObjectId.isValid(orderId)) {
      return NextResponse.json({ items: [], subtotal: 0, iva: 0, total: 0 });
    }

    const order = await Order.findById(orderId).lean<{
      table_id?: string;
    } | null>();

    const table = order?.table_id
      ? await Table.findById(order.table_id).select('number').lean<{ number?: number } | null>()
      : null;

    const items = await OrderItem.find({ order_id: orderId })
      .populate({ path: 'dish_id', model: 'Dish', select: 'name price' })
      .lean<LeanOrderItem[]>();

    if (!items.length) {
      return NextResponse.json({ items: [], subtotal: 0, iva: 0, total: 0 });
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

    return NextResponse.json({
      items: formattedItems,
      subtotal,
      iva,
      total,
      tableNumber: table?.number ?? null,
      serviceType: (order as { service_type?: string })?.service_type ?? 'dine_in',
    });
  } catch (error) {
    console.error('[OrderSummary] Error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
