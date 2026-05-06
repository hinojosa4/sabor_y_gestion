import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import OrderItem from '@/models/OrderItem';
import MenuItem from '@/models/MenuItem';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ orderId: string }> }
) {
    try {
        await connectDB();
        const { orderId } = await params;

        const items = await OrderItem.find({ order_id: orderId }).lean();

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
        });
    } catch (error) {
        console.error('[OrderSummary] Error:', error);
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}