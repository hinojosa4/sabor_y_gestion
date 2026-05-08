import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Order from '@/models/Order';
import OrderItem from '@/models/OrderItem';
import Dish from '@/models/Dish';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tableId: string }> }
) {
  try {
    await connectDB();
    const { tableId } = await params;

    // table_id es string en el modelo Order
    const order = await Order.findOne({
      table_id: tableId,
      status: { $nin: ['paid', 'cancelled'] },
    }).lean();

    if (!order) {
      return NextResponse.json({ items: [], subtotal: 0, iva: 0, total: 0 });
    }

    const items = await OrderItem.find({ order_id: order._id }).lean();

    if (!items.length) {
      return NextResponse.json({ items: [], subtotal: 0, iva: 0, total: 0 });
    }

    // dish_id en vez de menu_item_id
    const dishIds = items.map(item => item.dish_id);
    const dishes = await Dish.find({ _id: { $in: dishIds } }).lean();
    const dishMap = new Map(dishes.map(d => [d._id.toString(), d]));

    let subtotal = 0;
    const formattedItems = items.map(item => {
      const dish = dishMap.get(item.dish_id?.toString());
      const price = dish ? dish.price : item.unit_price;
      const subt = price * item.quantity;
      subtotal += subt;
      return {
        dish: { name: dish?.name || 'Plato', price },
        quantity: item.quantity,
        subtotal: subt,
      };
    });

    const iva = subtotal * 0.13;
    const total = subtotal + iva;

    return NextResponse.json({ items: formattedItems, subtotal, iva, total });
  } catch (error) {
    console.error('[Preinvoice] Error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}