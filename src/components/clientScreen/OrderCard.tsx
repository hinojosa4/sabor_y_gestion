// src/components/clientScreen/OrderCard.tsx
import React, { useState } from "react";
import { Clock, MapPin, ShoppingBag, ChevronRight } from "lucide-react";

export interface OrderItem {
  name: string;
  quantity: number;
  unitPrice: number;
}

export type PaymentMethod = "Efectivo" | "Tarjeta de Débito" | "Tarjeta de Crédito";

export interface Order {
  /** ID de display (#1001, #1002…) */
  id: string;
  /** ID real del backend (_id de MongoDB) */
  _id?: string;
  serviceType?: "dine_in" | "delivery" | "pick_up";
  date: string;
  time: string;
  location: string;
  waiter: string;
  paymentMethod: PaymentMethod;
  items: OrderItem[];
  total: number;
  status: "Pendiente" | "En cocina" | "Listo" | "En camino" | "Completado" | "Cancelado";
  deliveryCoords?: { lat: number; lng: number } | null;
  driverLocation?: { lat: number; lng: number; updatedAt?: string } | null;
}

interface OrderCardProps {
  order: Order;
  onView: (order: Order) => void;
}

export function OrderCard({ order, onView }: OrderCardProps) {
  const badgeColor: Record<string, string> = {
    Pendiente:  "#9ca3af",
    "En cocina": "#f59e0b",
    Listo:       "#8b5cf6",
    "En camino": "#3b82f6",
    Completado:  "#f97316",
    Cancelado:   "#6b7280",
  };
  const color = badgeColor[order.status] ?? "#f97316";

  const [hovered, setHovered] = useState(false);

  const cardStyle: React.CSSProperties = {
    ...styles.card,
    ...(hovered ? styles.cardHover : null),
  };

  return (
    <article
      style={cardStyle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <header style={{ ...styles.header, backgroundColor: color }}>
        <div>
          <h3 style={styles.title}>Orden #{order.id}</h3>
          <p style={styles.date}>{order.date}</p>
        </div>
        <span style={{ ...styles.statusBadge, color }}>{order.status}</span>
      </header>

      <div style={styles.body}>
        <Row icon={<Clock size={16} color="#6b7280" />} label="Hora" value={order.time} />
        <Row icon={<MapPin size={16} color="#6b7280" />} label="Ubicación" value={order.location} />
        <Row
          icon={<ShoppingBag size={16} color="#6b7280" />}
          label="Items"
          value={`${order.items.length} producto${order.items.length !== 1 ? "s" : ""}`}
        />

        <div style={styles.divider} />

        <div style={styles.totalRow}>
          <span style={styles.totalLabel}>Total</span>
          <span style={styles.totalValue}>${order.total.toFixed(2)}</span>
        </div>

        <button style={styles.viewBtn} onClick={() => onView(order)}>
          <span>Ver comanda completa</span>
          <ChevronRight size={16} />
        </button>
      </div>
    </article>
  );
}

interface RowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function Row({ icon, label, value }: RowProps) {
  return (
    <div style={styles.row}>
      <div style={styles.rowLeft}>
        {icon}
        <span style={styles.rowLabel}>{label}</span>
      </div>
      <span style={styles.rowValue}>{value}</span>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#f3f4f6",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    transition: "border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease",
    cursor: "pointer",
  },
  cardHover: {
    borderColor: "#f97316",
    boxShadow:
      "0 10px 25px -5px rgba(249,115,22,0.35), 0 4px 10px -3px rgba(249,115,22,0.2)",
    transform: "translateY(-2px)",
  },
  header: {
    backgroundColor: "#f97316",
    padding: "1.1rem 1.25rem",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "0.5rem",
  },
  title: {
    margin: 0,
    color: "#ffffff",
    fontSize: "1.15rem",
    fontWeight: 700,
  },
  date: {
    margin: 0,
    marginTop: 4,
    color: "rgba(255,255,255,0.92)",
    fontSize: "0.85rem",
  },
  statusBadge: {
    backgroundColor: "#ffffff",
    color: "#f97316",
    fontSize: "0.75rem",
    fontWeight: 600,
    padding: "0.25rem 0.7rem",
    borderRadius: 999,
    flexShrink: 0,
  },
  body: {
    padding: "1.1rem 1.25rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.6rem",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "0.875rem",
  },
  rowLeft: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    color: "#6b7280",
  },
  rowLabel: { color: "#6b7280" },
  rowValue: { color: "#111827", fontWeight: 500 },
  divider: {
    height: 1,
    backgroundColor: "#f3f4f6",
    margin: "0.4rem 0",
  },
  totalRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: { fontSize: "1rem", fontWeight: 600, color: "#111827" },
  totalValue: { fontSize: "1.4rem", fontWeight: 700, color: "#10b981" },
  viewBtn: {
    marginTop: "0.75rem",
    backgroundColor: "#f97316",
    color: "#ffffff",
    border: "none",
    borderRadius: 10,
    padding: "0.7rem 1rem",
    fontSize: "0.9rem",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.4rem",
  },
};
