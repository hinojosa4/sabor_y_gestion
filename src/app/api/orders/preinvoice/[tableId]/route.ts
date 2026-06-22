import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Order from '@/models/Order';
import OrderItem from '@/models/OrderItem';
import '@/models/Dish';

type PreinvoiceItem = {
  dish_id?: {
    name?: string;
    price?: number;
  } | null;
  quantity?: number;
  unit_price?: number;
};

type FormattedItem = {
  dish: {
    name: string;
    price: number;
  };
  quantity: number;
  subtotal: number;
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tableId: string }> }
) {
  try {
    await connectDB();
    const { tableId } = await params;

    // orden asignada a esta tabla
    const order = await Order.findOne({
      table_id: tableId,
      status: { $nin: ['paid', 'cancelled'] },
    }).sort({ createdAt: -1 }).lean();

    if (!order) {
      return NextResponse.json({ items: [], subtotal: 0, iva: 0, total: 0 });
    }

    const items = await OrderItem.find({ order_id: order._id })
      .populate({ path: 'dish_id', model: 'Dish', select: 'name price' })
      .lean<PreinvoiceItem[]>();

    if (!items.length) {
      return NextResponse.json({ items: [], subtotal: 0, iva: 0, total: 0 });
    }

    const itemMap = new Map<string, FormattedItem>();

    for (const item of items) {
      const dish = item.dish_id;
      const price = item.unit_price ?? dish?.price ?? 0;
      const quantity = item.quantity ?? 1;
      const itemSubtotal = price * quantity;
      const name = dish?.name || 'Plato';
      const key = `${name}:${price}`;
      const current = itemMap.get(key);

      if (current) {
        current.quantity += quantity;
        current.subtotal += itemSubtotal;
      } else {
        itemMap.set(key, {
          dish: { name, price },
          quantity,
          subtotal: itemSubtotal,
        });
      }
    }

    const formattedItems = Array.from(itemMap.values());
    const subtotal = formattedItems.reduce((sum, item) => sum + item.subtotal, 0);
    const iva = 0;
    const total = subtotal;

    return NextResponse.json({
      items: formattedItems,
      subtotal,
      iva,
      total,
      orderId: order._id,
      dailyNumber: (order as { daily_number?: number | null }).daily_number ?? null,
    });
  } catch (error) {
    console.error('[Preinvoice] Error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
