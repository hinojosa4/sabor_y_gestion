import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { connectDB } from '@/lib/db';
import OrderItem from '@/models/OrderItem';
import Dish from '@/models/Dish';

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

    const items = await OrderItem.find({ order_id: orderId }).lean<LeanOrderItem[]>();

    if (!items.length) {
      return NextResponse.json({ items: [], subtotal: 0, iva: 0, total: 0 });
    }

    const dishIds = items
      .map((item) => item.dish_id)
      .filter((dishId): dishId is Types.ObjectId => Boolean(dishId));

    const dishes = await Dish.find({
      _id: { $in: dishIds },
    }).lean<LeanDish[]>();

    const dishMap = new Map(dishes.map((dish) => [dish._id.toString(), dish]));

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