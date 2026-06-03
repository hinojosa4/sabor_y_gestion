import { Types } from "mongoose";
import LoyaltyTier from "@/models/LoyaltyTier";
import Order from "@/models/Order";
import Payment from "@/models/Payment";

type LoyaltyTierInput = {
  name: string;
  slug: string;
  minOrders: number;
  minSpent: number;
  discountPercent: number;
  benefits: string[];
  sortOrder: number;
  isActive: boolean;
};

export type LoyaltyTierSnapshot = LoyaltyTierInput & {
  id: string;
};

export type CustomerLoyaltySummary = {
  customerId: string;
  totalPaidOrders: number;
  totalSpent: number;
  averageTicket: number;
  points: number;
  tier: LoyaltyTierSnapshot;
  discountPercent: number;
  benefits: string[];
  lastPurchaseAt: string | null;
};

type LeanPayment = {
  order_id: string;
  amount: number;
  timestamp?: Date;
};

type LeanOrder = {
  _id: Types.ObjectId;
  status?: string;
};

const DEFAULT_LOYALTY_TIERS: LoyaltyTierInput[] = [
  {
    name: "Cliente Nuevo",
    slug: "nuevo",
    minOrders: 0,
    minSpent: 0,
    discountPercent: 0,
    benefits: ["Bienvenida especial"],
    sortOrder: 1,
    isActive: true,
  },
  {
    name: "Cliente Frecuente",
    slug: "frecuente",
    minOrders: 3,
    minSpent: 150,
    discountPercent: 5,
    benefits: ["5% de descuento en la siguiente compra"],
    sortOrder: 2,
    isActive: true,
  },
  {
    name: "Cliente Preferente",
    slug: "preferente",
    minOrders: 6,
    minSpent: 400,
    discountPercent: 7,
    benefits: ["7% de descuento en la siguiente compra", "Beneficios preferentes"],
    sortOrder: 3,
    isActive: true,
  },
  {
    name: "Cliente VIP",
    slug: "vip",
    minOrders: 11,
    minSpent: 800,
    discountPercent: 10,
    benefits: ["10% de descuento en la siguiente compra", "Atencion prioritaria"],
    sortOrder: 4,
    isActive: true,
  },
];

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function toTierSnapshot(tier: LoyaltyTierInput & { _id?: Types.ObjectId }): LoyaltyTierSnapshot {
  return {
    id: tier._id?.toString() ?? tier.slug,
    name: tier.name,
    slug: tier.slug,
    minOrders: tier.minOrders,
    minSpent: tier.minSpent,
    discountPercent: tier.discountPercent,
    benefits: tier.benefits,
    sortOrder: tier.sortOrder,
    isActive: tier.isActive,
  };
}

export async function ensureDefaultLoyaltyTiers() {
  const totalTiers = await LoyaltyTier.countDocuments();
  if (totalTiers > 0) return;

  // Carga inicial para que el sistema funcione antes del panel admin.
  await LoyaltyTier.insertMany(DEFAULT_LOYALTY_TIERS);
}

export async function getActiveLoyaltyTiers() {
  await ensureDefaultLoyaltyTiers();

  const tiers = await LoyaltyTier.find({ isActive: true })
    .sort({ sortOrder: 1, minOrders: 1, minSpent: 1 })
    .lean<Array<LoyaltyTierInput & { _id: Types.ObjectId }>>();

  return tiers.length > 0 ? tiers.map(toTierSnapshot) : DEFAULT_LOYALTY_TIERS.map(toTierSnapshot);
}

function pickTier(tiers: LoyaltyTierSnapshot[], totalPaidOrders: number, totalSpent: number) {
  const sorted = [...tiers].sort((a, b) => b.sortOrder - a.sortOrder);

  return sorted.find((tier) => {
    // La categoria sube por cantidad de pedidos o por gasto acumulado.
    return totalPaidOrders >= tier.minOrders || totalSpent >= tier.minSpent;
  }) ?? sorted[sorted.length - 1];
}

export async function calculateCustomerLoyalty(customerId: string): Promise<CustomerLoyaltySummary> {
  if (!Types.ObjectId.isValid(customerId)) {
    throw new Error("ID de cliente no valido");
  }

  const customerObjectId = new Types.ObjectId(customerId);
  const tiers = await getActiveLoyaltyTiers();

  const payments = await Payment.find({
    customer_id: customerObjectId,
    status: "completed",
  })
    .select("order_id amount timestamp")
    .lean<LeanPayment[]>();

  const orderIds = Array.from(new Set(
    payments
      .map((payment) => payment.order_id)
      .filter((orderId) => Types.ObjectId.isValid(orderId))
  ));

  const orders = await Order.find({
    _id: { $in: orderIds },
    status: { $ne: "cancelled" },
  })
    .select("_id status")
    .lean<LeanOrder[]>();

  const validOrderIds = new Set(orders.map((order) => order._id.toString()));
  const validPayments = payments.filter((payment) => validOrderIds.has(payment.order_id));

  const paidOrderIds = new Set(validPayments.map((payment) => payment.order_id));
  const totalPaidOrders = paidOrderIds.size;
  const totalSpent = roundMoney(validPayments.reduce((sum, payment) => sum + payment.amount, 0));
  const averageTicket = totalPaidOrders > 0 ? roundMoney(totalSpent / totalPaidOrders) : 0;
  const points = Math.floor(totalSpent);
  const tier = pickTier(tiers, totalPaidOrders, totalSpent);
  const lastPurchaseAt = validPayments
    .map((payment) => payment.timestamp?.getTime() ?? 0)
    .reduce((latest, current) => Math.max(latest, current), 0);

  return {
    customerId,
    totalPaidOrders,
    totalSpent,
    averageTicket,
    points,
    tier,
    discountPercent: tier.discountPercent,
    benefits: tier.benefits,
    lastPurchaseAt: lastPurchaseAt ? new Date(lastPurchaseAt).toISOString() : null,
  };
}
