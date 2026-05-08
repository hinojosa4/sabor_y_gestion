import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Order from "@/models/Order";
import OrderItem from "@/models/OrderItem";
import Table from "@/models/Table";
import "@/models/Ingredient";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const { id } = await params;

    const order = await Order.findById(id).lean();
    if (!order) {
      return NextResponse.json({ ok: false, message: "Orden no encontrada" }, { status: 404 });
    }

    const items = await OrderItem.find({ order_id: id })
      .populate({
        path: "dish_id",
        model: "Dish",
        select: "name price description image_url category_id ingredients",
        populate: [
          { path: "category_id", model: "Category", select: "name" },
          { path: "ingredients.ingredient_id", model: "Ingredient", select: "name unit" },
        ],
      })
      .lean();

    const table = order.table_id
      ? await Table.findById(order.table_id).lean()
      : null;

    return NextResponse.json({
      ok: true,
      data: {
        ...order,
        table_number: table?.number ?? null,
        items,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: "Error al obtener orden", error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}