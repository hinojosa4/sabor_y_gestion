import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import Payment from "@/models/Payment";
import Order from "@/models/Order";
import OrderItem from "@/models/OrderItem";
import Table from "@/models/Table";
import User from "@/models/User";
import "@/models/Dish";

type CustomerRef = {
  _id?: Types.ObjectId;
  name?: string;
  email?: string;
};

type LeanPayment = {
  _id: Types.ObjectId;
  order_id: string;
  amount: number;
  subtotal?: number;
  discount_percent?: number;
  discount_amount?: number;
  loyalty_tier_name?: string | null;
  method: "cash" | "card" | "qr";
  status: "pending" | "completed";
  customer_id?: CustomerRef | Types.ObjectId | string | null;
  customer_email?: string | null;
  timestamp?: Date;
};

type LeanOrder = {
  _id: Types.ObjectId;
  table_id?: string | null;
  customer_id?: CustomerRef | Types.ObjectId | string | null;
  service_type?: "dine_in" | "delivery" | "pick_up";
  status?: string;
  total_amount?: number;
  delivery_phone?: string | null;
  delivery_address?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

type LeanOrderItem = {
  order_id: Types.ObjectId;
  dish_id?: {
    name?: string;
    price?: number;
  } | null;
  quantity?: number;
  unit_price?: number;
  subtotal?: number;
  status?: string;
};

type LeanTable = {
  _id: Types.ObjectId;
  number?: number;
};

const PAYMENT_METHODS = new Set(["cash", "qr"]);
const PAYMENT_STATUSES = new Set(["pending", "completed"]);
const ACTIVE_UNPAID_ORDER_STATUSES = ["pending", "in_kitchen", "ready", "delivered"];
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;
const BOLIVIA_UTC_OFFSET_HOURS = 4;

function isCustomerRef(value: LeanOrder["customer_id"] | LeanPayment["customer_id"]): value is CustomerRef {
  return Boolean(value && typeof value === "object" && "email" in value);
}

function normalizeDateStart(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(`${value}T${String(BOLIVIA_UTC_OFFSET_HOURS).padStart(2, "0")}:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeDateEnd(value: string | null): Date | null {
  if (!value) return null;
  const start = normalizeDateStart(value);
  const date = start ? new Date(start.getTime() + 86_400_000 - 1) : null;
  if (!date) return null;
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatMethod(method: LeanPayment["method"]) {
  if (method === "cash") return "Efectivo";
  if (method === "qr") return "QR";
  return "Tarjeta";
}

function normalizePositiveInt(value: string | null, fallback: number, max?: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return max ? Math.min(parsed, max) : parsed;
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const from = normalizeDateStart(searchParams.get("from"));
    const to = normalizeDateEnd(searchParams.get("to"));
    const method = searchParams.get("method");
    const status = searchParams.get("status");
    const orderStatus = searchParams.get("orderStatus");
    const search = searchParams.get("search")?.trim().toLowerCase() ?? "";
    const page = normalizePositiveInt(searchParams.get("page"), 1);
    const pageSize = normalizePositiveInt(searchParams.get("pageSize"), DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

    const paymentQuery: Record<string, unknown> = {
      method: { $in: ["cash", "qr"] },
    };

    if (method && PAYMENT_METHODS.has(method)) {
      paymentQuery.method = method;
    }

    if (status && PAYMENT_STATUSES.has(status)) {
      paymentQuery.status = status;
    }

    if (from || to) {
      paymentQuery.timestamp = {
        ...(from ? { $gte: from } : {}),
        ...(to ? { $lte: to } : {}),
      };
    }

    const payments = await Payment.find(paymentQuery)
      .populate({ path: "customer_id", select: "name email", strictPopulate: false })
      .sort({ timestamp: -1 })
      .limit(500)
      .lean<LeanPayment[]>();

    const receiptEmails = Array.from(new Set(
      payments
        .map((payment) => payment.customer_email?.trim().toLowerCase())
        .filter((email): email is string => Boolean(email))
    ));

    const customersByReceiptEmail = new Map<string, CustomerRef>();
    if (receiptEmails.length > 0) {
      const customers = await User.find({
        email: { $in: receiptEmails },
        rol: "cliente",
      }).select("_id name email").lean<CustomerRef[]>();

      customers.forEach((customer) => {
        if (customer.email) customersByReceiptEmail.set(customer.email.toLowerCase(), customer);
      });
    }

    const paidOrderIds = payments
      .map((payment) => payment.order_id)
      .filter((id) => Types.ObjectId.isValid(id));

    const unpaidOrderQuery: Record<string, unknown> = {
      _id: { $nin: paidOrderIds },
      status: { $in: ACTIVE_UNPAID_ORDER_STATUSES },
    };

    if (orderStatus && orderStatus !== "all") {
      unpaidOrderQuery.status = orderStatus;
    }

    if (from || to) {
      unpaidOrderQuery.createdAt = {
        ...(from ? { $gte: from } : {}),
        ...(to ? { $lte: to } : {}),
      };
    }

    const shouldIncludeUnpaidOrders = (!method || method === "all") && (!status || status === "all" || status === "pending");

    const unpaidOrders = shouldIncludeUnpaidOrders
      ? await Order.find(unpaidOrderQuery)
          .populate({ path: "customer_id", select: "name email" })
          .sort({ createdAt: -1 })
          .limit(500)
          .lean<LeanOrder[]>()
      : [];

    const orderIds = Array.from(new Set([
      ...paidOrderIds,
      ...unpaidOrders.map((order) => order._id.toString()),
    ]));

    const orders = await Order.find({ _id: { $in: paidOrderIds } })
      .populate({ path: "customer_id", select: "name email" })
      .lean<LeanOrder[]>();

    const orderMap = new Map([...orders, ...unpaidOrders].map((order) => [order._id.toString(), order]));

    const tableIds = [...orders, ...unpaidOrders]
      .map((order) => order.table_id)
      .filter((id): id is string => Boolean(id && Types.ObjectId.isValid(id)));

    const tables = await Table.find({ _id: { $in: tableIds } })
      .select("number")
      .lean<LeanTable[]>();

    const tableMap = new Map(tables.map((table) => [table._id.toString(), table]));

    const items = await OrderItem.find({ order_id: { $in: orderIds } })
      .populate({ path: "dish_id", model: "Dish", select: "name price" })
      .lean<LeanOrderItem[]>();

    const itemsByOrder = items.reduce((acc, item) => {
      const key = item.order_id.toString();
      const current = acc.get(key) ?? [];
      const price = item.unit_price ?? item.dish_id?.price ?? 0;
      const quantity = item.quantity ?? 1;
      current.push({
        name: item.dish_id?.name ?? "Plato",
        quantity,
        unitPrice: price,
        subtotal: item.subtotal ?? price * quantity,
        status: item.status ?? "pending",
      });
      acc.set(key, current);
      return acc;
    }, new Map<string, Array<{ name: string; quantity: number; unitPrice: number; subtotal: number; status: string }>>());

    const paymentRows = payments
      .map((payment) => {
        const order = orderMap.get(payment.order_id);
        const table = order?.table_id ? tableMap.get(order.table_id) : null;
        const receiptEmail = payment.customer_email?.trim().toLowerCase() ?? null;
        const customer = isCustomerRef(payment.customer_id)
          ? payment.customer_id
          : isCustomerRef(order?.customer_id)
            ? order?.customer_id
          : receiptEmail
            ? customersByReceiptEmail.get(receiptEmail) ?? null
            : null;
        const customerType = customer ? "registered" : receiptEmail ? "guest" : "none";
        const customerName = customer?.name ?? (receiptEmail ? "Cliente invitado" : table?.number ? `Mesa ${table.number}` : "Cliente no registrado");
        const customerEmail = customer?.email ?? receiptEmail;

        return {
          id: payment._id.toString(),
          orderId: payment.order_id,
          amount: payment.amount,
          subtotal: payment.subtotal ?? payment.amount,
          discountPercent: payment.discount_percent ?? 0,
          discountAmount: payment.discount_amount ?? 0,
          loyaltyTierName: payment.loyalty_tier_name ?? null,
          method: payment.method,
          methodLabel: formatMethod(payment.method),
          paymentStatus: payment.status,
          orderStatus: order?.status ?? "sin_orden",
          paidAt: payment.timestamp ?? null,
          createdAt: order?.createdAt ?? null,
          dateType: "payment" as const,
          tableNumber: table?.number ?? null,
          serviceType: order?.service_type ?? null,
          customer: {
            type: customerType,
            name: customerName,
            email: customerEmail ?? null,
            receiptEmail,
            phone: order?.delivery_phone ?? null,
            address: order?.delivery_address ?? null,
          },
          items: itemsByOrder.get(payment.order_id) ?? [],
        };
      });

    const unpaidRows = unpaidOrders.map((order) => {
      const orderId = order._id.toString();
      const table = order.table_id ? tableMap.get(order.table_id) : null;
      const customer = isCustomerRef(order.customer_id) ? order.customer_id : null;
      const orderItems = itemsByOrder.get(orderId) ?? [];
      const amount = orderItems.reduce((sum, item) => sum + item.subtotal, 0) || order.total_amount || 0;
      const customerName = customer?.name ?? (table?.number ? `Mesa ${table.number}` : "Cliente no registrado");

      return {
        id: `order-${orderId}`,
        orderId,
        amount,
        subtotal: amount,
        discountPercent: 0,
        discountAmount: 0,
        loyaltyTierName: null,
        method: null,
        methodLabel: "Sin método",
        paymentStatus: "pending" as const,
        orderStatus: order.status ?? "pending",
        paidAt: null,
        createdAt: order.createdAt ?? null,
        dateType: "order" as const,
        tableNumber: table?.number ?? null,
        serviceType: order.service_type ?? null,
        customer: {
          type: customer ? "registered" as const : "none" as const,
          name: customerName,
          email: customer?.email ?? null,
          receiptEmail: null,
          phone: order.delivery_phone ?? null,
          address: order.delivery_address ?? null,
        },
        items: orderItems,
      };
    });

    const rows = [...paymentRows, ...unpaidRows]
      .filter((row) => {
        if (orderStatus && orderStatus !== "all" && row.orderStatus !== orderStatus) return false;
        if (!search) return true;

        const haystack = [
          row.orderId,
          row.customer.name,
          row.customer.email,
          row.customer.receiptEmail,
          row.tableNumber ? `mesa ${row.tableNumber}` : "",
          row.methodLabel,
        ].join(" ").toLowerCase();

        return haystack.includes(search);
      })
      .sort((a, b) => {
        const dateA = new Date(a.paidAt ?? a.createdAt ?? 0).getTime();
        const dateB = new Date(b.paidAt ?? b.createdAt ?? 0).getTime();
        return dateB - dateA;
      });

    const summary = rows.reduce(
      (acc, row) => {
        acc.count += 1;
        if (row.paymentStatus === "completed") {
          acc.total += row.amount;
          acc.discounts += row.discountAmount;
          if (row.method === "cash") acc.cash += row.amount;
          if (row.method === "qr") acc.qr += row.amount;
        }
        if (row.paymentStatus === "pending") acc.pending += 1;
        return acc;
      },
      { total: 0, cash: 0, qr: 0, pending: 0, count: 0, discounts: 0 }
    );

    const totalRows = rows.length;
    const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
    const currentPage = Math.min(page, totalPages);
    const start = (currentPage - 1) * pageSize;
    const paginatedRows = rows.slice(start, start + pageSize);

    return NextResponse.json({
      ok: true,
      data: paginatedRows,
      summary,
      pagination: {
        page: currentPage,
        pageSize,
        totalRows,
        totalPages,
      },
    });
  } catch (error) {
    console.error("[AdminPayments] Error:", error);
    return NextResponse.json({ ok: false, error: "Error al cargar cobros" }, { status: 500 });
  }
}
