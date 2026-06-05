import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import OrderItem from "@/models/OrderItem";
import { findRegisteredCustomerByEmail } from "@/lib/customerLookup";
import { calculateLoyaltyDiscount } from "@/lib/customerLoyalty";

type LeanOrderItem = {
  quantity?: number;
  unit_price?: number;
  subtotal?: number;
};

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const { orderId, email } = await req.json();

    if (!orderId) {
      return NextResponse.json({ error: "Orden requerida" }, { status: 400 });
    }

    const items = await OrderItem.find({ order_id: orderId }).lean<LeanOrderItem[]>();

    if (!items.length) {
      return NextResponse.json({ error: "La orden no tiene productos" }, { status: 400 });
    }

    const subtotal = items.reduce((sum, item) => {
      const quantity = item.quantity ?? 1;
      const unitPrice = item.unit_price ?? 0;
      return sum + (item.subtotal ?? unitPrice * quantity);
    }, 0);

    const { email: normalizedEmail, customer } = await findRegisteredCustomerByEmail(email);
    const discount = await calculateLoyaltyDiscount(customer?._id?.toString(), subtotal);

    return NextResponse.json({
      ok: true,
      subtotal: discount.subtotal,
      discountAmount: discount.discountAmount,
      discountPercent: discount.discountPercent,
      loyaltyTierName: discount.tierName,
      total: discount.total,
      customer: customer
        ? {
            id: customer._id.toString(),
            name: customer.name,
            email: customer.email,
          }
        : null,
      email: normalizedEmail,
    });
  } catch (error) {
    console.error("[PaymentPreview] Error:", error);
    return NextResponse.json({ error: "Error al calcular el total" }, { status: 500 });
  }
}
