// app/api/orders/preinvoice/[tableId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import mongoose from 'mongoose';
import Order from '@/models/Order';
import OrderItem from '@/models/OrderItem';
import MenuItem from '@/models/MenuItem';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tableId: string }> }
) {
  try {
    await connectDB();
    const { tableId } = await params;

    const tableObjectId = new mongoose.Types.ObjectId(tableId);

    const order = await Order.findOne({
      table_id: tableObjectId,
      status: { $nin: ['paid', 'cancelled'] },
    }).lean();

    if (!order) {
      return NextResponse.json({ items: [], subtotal: 0, iva: 0, total: 0 });
    }

    const items = await OrderItem.find({ order_id: order._id }).lean();

    if (!items.length) {
      return NextResponse.json({ items: [], subtotal: 0, iva: 0, total: 0 });
    }

    const menuItemIds = items.map(item => item.menu_item_id);
    const menuItems = await MenuItem.find({ _id: { $in: menuItemIds } }).lean();
    const menuMap = new Map(menuItems.map(m => [m._id.toString(), m]));

    let subtotal = 0;
    const formattedItems = items.map(item => {
      const menu = menuMap.get(item.menu_item_id.toString());
      const price = menu ? menu.price : item.unit_price;
      const subt = price * item.quantity;
      subtotal += subt;
      return {
        dish: { name: menu?.name || 'Plato', price },
        quantity: item.quantity,
        subtotal: subt,
      };
    });

    const iva = subtotal * 0.13;
    const total = subtotal + iva;

    return NextResponse.json({
      items: formattedItems,
      subtotal,
      iva,
      total,
      orderId: order._id,
    });
  } catch (error) {
    console.error('[Preinvoice] Error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}