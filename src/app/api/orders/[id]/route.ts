import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Order from "@/models/Order";
import OrderItem from "@/models/OrderItem";
import Table from "@/models/Table";
import Payment from "@/models/Payment";
import User from "@/models/User";
import { getOpenOperationalCashShift } from "@/lib/cashRegister";
import "@/models/Ingredient";
import { verifyToken } from "@/lib/jwt";
import { pusherServer } from "@/lib/pusher";

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
      data: { ...order, table_number: table?.number ?? null, items },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: "Error al obtener orden", error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/orders/[id]
 * Cambia el status de una orden.
 * Body: { status: string }
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const { id } = await params;

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ ok: false, message: "No autorizado" }, { status: 401 });
    }

    // Verificar token — TokenPayload tiene { userId, email, rol }
    let payload: Record<string, unknown>;
    try {
      payload = verifyToken(authHeader.split(" ")[1]) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ ok: false, message: "Token inválido" }, { status: 401 });
    }

    // Soportar tanto "rol" (español) como "role" (inglés) por si acaso
    const userRol = (payload.rol ?? payload.role ?? "") as string;

    const ALLOWED_ROLES = ["admin", "delivery", "mesero", "cajero"];
    if (!ALLOWED_ROLES.includes(userRol)) {
      // Log en servidor para diagnosticar qué viene en el token
      console.error(`[PATCH /api/orders/${id}] 403 — rol recibido: "${userRol}" | payload:`, payload);
      return NextResponse.json(
        { ok: false, message: "Sin permiso", rol_recibido: userRol },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { status } = body;

    const VALID_STATUSES = [
      "pending", "in_kitchen", "ready",
      "picked_up", "in_transit",
      "delivered", "paid", "cancelled",
    ];

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { ok: false, message: `Status inválido. Permitidos: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    // ── Validar transiciones permitidas ────────────────────────────────────────
    // El repartidor solo puede recoger si la cocina marcó la orden como "ready"
    const validTransitions: Record<string, string[]> = {
      pending:    ["in_kitchen", "cancelled"],
      in_kitchen: ["ready", "cancelled"],
      ready:      ["picked_up", "cancelled"],
      picked_up:  ["in_transit", "cancelled"],
      in_transit: ["delivered", "cancelled"],
      delivered:  ["paid"],
      paid:       [],
      cancelled:  [],
    };

    const currentOrder = await Order.findById(id)
      .select("status service_type total_amount delivery_fee payment_method customer_id user_id")
      .lean();
    if (!currentOrder) {
      return NextResponse.json({ ok: false, message: "Orden no encontrada" }, { status: 404 });
    }

    const allowed = validTransitions[currentOrder.status] ?? [];
    if (!allowed.includes(status)) {
      const friendlyMsg =
        currentOrder.status === "in_kitchen" && status === "picked_up"
          ? "La orden aún está en cocina. Espera a que el cocinero la marque como lista."
          : currentOrder.status === "pending" && status === "picked_up"
          ? "La orden aún no ha sido tomada por cocina."
          : `No se puede pasar de "${currentOrder.status}" a "${status}"`;
      return NextResponse.json({ ok: false, message: friendlyMsg }, { status: 400 });
    }

    let targetStatus = status;
    if (status === "delivered" && currentOrder.service_type === "delivery") {
      targetStatus = "paid";
    }

    const update: Record<string, unknown> = { status: targetStatus };
    if (["picked_up", "in_transit"].includes(status) && userRol === "delivery") {
      update.driver_id = payload.userId;
    }

    const order = await Order.findByIdAndUpdate(id, update, { new: true });
    if (!order) {
      return NextResponse.json({ ok: false, message: "Orden no encontrada" }, { status: 404 });
    }

    if (targetStatus === "paid") {
      const existingPayment = await Payment.findOne({ order_id: id, status: "completed" });
      if (!existingPayment) {
        let method: "cash" | "qr" | "card" = "cash";
        if (currentOrder.payment_method === "QR / Transferencia") {
          method = "qr";
        } else if (currentOrder.payment_method && currentOrder.payment_method.includes("Tarjeta")) {
          method = "card";
        }

        let shiftFields = {};
        try {
          const cashShift = await getOpenOperationalCashShift();
          if (cashShift.ok) {
            shiftFields = {
              shiftName: cashShift.shift.shiftName,
              shiftDate: cashShift.shift.shiftDate,
              shiftStart: cashShift.shift.shiftStart,
              shiftEnd: cashShift.shift.shiftEnd,
            };
          }
        } catch (err) {
          console.error("Error al obtener turno de caja en auto-delivery-payment:", err);
        }

        let customerEmail = "invitado@sabor.com";
        const customerId = currentOrder.customer_id || currentOrder.user_id || null;
        if (customerId) {
          const userObj = await User.findById(customerId).select("email").lean();
          if (userObj?.email) {
            customerEmail = userObj.email;
          }
        }

        const subtotal = currentOrder.total_amount - (currentOrder.delivery_fee || 0);

        const payment = await Payment.create({
          order_id: id,
          amount: currentOrder.total_amount,
          subtotal,
          discount_percent: 0,
          discount_amount: 0,
          loyalty_tier_name: null,
          method,
          status: "completed",
          customer_id: customerId,
          customer_email: customerEmail,
          timestamp: new Date(),
          ...shiftFields,
        });

        await pusherServer.trigger("restaurant", "payment:completed", {
          paymentId: payment._id.toString(),
          orderId: id,
          method,
          amount: currentOrder.total_amount,
          subtotal,
          discountPercent: 0,
          discountAmount: 0,
          tableId: null,
          customer: customerId
            ? {
                id: customerId.toString(),
                name: "Cliente",
                email: customerEmail,
                type: "registered",
              }
            : {
                id: null,
                name: null,
                email: customerEmail,
                type: "guest",
              },
        });
      }
    }

    await pusherServer.trigger("delivery", "order:status_updated", { orderId: id, status: targetStatus });
    await pusherServer.trigger("restaurant", "order:status_updated", { orderId: id, status: targetStatus });

    return NextResponse.json({ ok: true, message: "Estado actualizado", data: order });
  } catch (error) {
    console.error("[PATCH /api/orders/:id]", error);
    return NextResponse.json(
      { ok: false, message: "Error al actualizar orden", error: String(error) },
      { status: 500 }
    );
  }
}
