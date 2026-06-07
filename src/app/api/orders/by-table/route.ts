// src/app/api/orders/by-table/route.ts
//
// Retorna un mapa { [tableId]: { status, orderId } } con la orden activa
// más reciente de cada mesa, SIN filtrar por mesero.
// Usado por el panel del mesero para saber si una mesa puede pedir cuenta
// y para abrir la comanda de cualquier mesa ocupada.

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Order from "@/models/Order";
import OrderItem from "@/models/OrderItem";
import { verifyToken } from "@/lib/jwt";
import "@/models/Dish";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ ok: false, message: "No autorizado" }, { status: 401 });
    }

    try {
      verifyToken(authHeader.split(" ")[1]);
    } catch {
      return NextResponse.json({ ok: false, message: "Token inválido" }, { status: 401 });
    }

    // Todas las órdenes activas de todas las mesas (sin filtro por mesero)
    const orders = await Order.find({
      status: { $in: ["pending", "in_kitchen", "ready", "delivered"] },
      table_id: { $exists: true, $ne: null },
    })
      .sort({ createdAt: -1 })
      .lean();

    // Para cada mesa, construimos un resumen de sus órdenes activas.
    // Una mesa puede pedir cuenta solo cuando:
    //   - Al menos una orden está en "delivered"
    //   - No hay ninguna en "pending" | "in_kitchen" | "ready"
    const tableMap: Record<
      string,
      {
        canRequestBill: boolean;
        activeOrderId: string | null; // la orden más reciente no pagada (para la comanda)
        statuses: string[];
      }
    > = {};

    for (const order of orders) {
      const tid = String(order.table_id);
      if (!tableMap[tid]) {
        tableMap[tid] = { canRequestBill: false, activeOrderId: null, statuses: [] };
      }
      tableMap[tid].statuses.push(order.status);
      // Guardamos la primera (más reciente) orden que no sea "delivered"
      // para mostrarla como comanda; si todas son delivered, guardamos la primera.
      if (!tableMap[tid].activeOrderId) {
        tableMap[tid].activeOrderId = String(order._id);
      }
    }

    // Calcular canRequestBill para cada mesa
    for (const tid of Object.keys(tableMap)) {
      const { statuses } = tableMap[tid];
      const hasDelivered   = statuses.includes("delivered");
      const hasInProgress  = statuses.some(s => ["pending", "in_kitchen", "ready"].includes(s));
      tableMap[tid].canRequestBill = hasDelivered && !hasInProgress;
    }

    // También devolvemos los ítems de la orden activa de cada mesa
    // para poder mostrar la comanda sin hacer otra llamada.
    const activeOrderIds = [...new Set(Object.values(tableMap).map(v => v.activeOrderId).filter(Boolean))];

    const items = await OrderItem.find({ order_id: { $in: activeOrderIds } })
      .populate({ path: "dish_id", model: "Dish", select: "name price" })
      .lean();

    const itemsByOrder: Record<string, typeof items> = {};
    for (const item of items) {
      const key = String(item.order_id);
      if (!itemsByOrder[key]) itemsByOrder[key] = [];
      itemsByOrder[key].push(item);
    }

    // Enriquecer con los ítems
    const result: Record<
      string,
      {
        canRequestBill: boolean;
        activeOrderId: string | null;
        statuses: string[];
        items: typeof items;
      }
    > = {};

    for (const [tid, info] of Object.entries(tableMap)) {
      result[tid] = {
        ...info,
        items: info.activeOrderId ? (itemsByOrder[info.activeOrderId] ?? []) : [],
      };
    }

    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: "Error al obtener estado de mesas",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}