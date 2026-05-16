"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { CLIENTE } from "@/lib/roles";
import { getPusherClient } from "@/lib/pusherClient";
import { ClientHeader } from "@/components/clientScreen/ClientHeader";
import { ClientInfoCard, ClientStats } from "@/components/clientScreen/ClientInfoCard";
import { ConsumoHistory } from "@/components/clientScreen/ConsumoHistory";
import { OrderModal } from "@/components/clientScreen/OrderModal";
import { Order } from "@/components/clientScreen/OrderCard";
import { ReservationModal } from "@/components/clientScreen/ReservationModal";

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-ES", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

function formatMemberSince(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-ES", { month: "long", year: "numeric" });
}

function mapStatus(status: string): Order["status"] {
  const map: Record<string, Order["status"]> = {
    pending:    "Pendiente",
    in_kitchen: "En cocina",
    ready:      "Listo",
    picked_up:  "En camino",
    in_transit: "En camino",
    delivered:  "Completado",
    paid:       "Completado",
    cancelled:  "Cancelado",
  };
  return map[status] ?? "Pendiente";
}

function mapLocation(order: RawOrder): string {
  if (order.service_type === "delivery") return order.delivery_address?.trim() || "Delivery";
  if (order.service_type === "pick_up") return "Para llevar";
  if (order.table_id) return `Mesa ${order.table_id}`;
  return "Local";
}

// ── Tipos ──────────────────────────────────────────────────────────────────────

interface RawOrderItem {
  _id: string;
  dish_id: { _id: string; name: string; price: number; image_url?: string } | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
  notes?: string;
}

interface RawOrder {
  _id: string;
  service_type: "dine_in" | "delivery" | "pick_up";
  status: string;
  total_amount: number;
  table_id?: string;
  delivery_address?: string;
  payment_method?: string;
  notes?: string;
  createdAt: string;
  items: RawOrderItem[];
}

function toFrontendOrder(raw: RawOrder, index: number): Order {
  return {
    id: String(index + 1001),
    _id: raw._id,
    date: formatDate(raw.createdAt),
    time: formatTime(raw.createdAt),
    location: mapLocation(raw),
    waiter: raw.service_type === "delivery" ? "Delivery" : "—",
    paymentMethod: (raw.payment_method as Order["paymentMethod"]) ?? "Efectivo",
    status: mapStatus(raw.status),
    items: (raw.items ?? []).map((it) => ({
      name: it.dish_id?.name ?? "Plato",
      quantity: it.quantity,
      unitPrice: it.unit_price,
    })),
    total: raw.total_amount,
  };
}

function getBenefits(visits: number, isNew: boolean): string[] {
  if (isNew) return ["Bienvenida especial", "5% descuento en tu próxima visita", "Bebida de cortesía"];
  if (visits >= 10) return ["10% descuento permanente", "Postre de cortesía", "Acceso a eventos exclusivos"];
  if (visits >= 5) return ["7% descuento en tu próxima visita", "Bebida de cortesía"];
  return ["5% descuento en tu próxima visita"];
}

// ── Componente ─────────────────────────────────────────────────────────────────

export default function ClientePage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth(CLIENTE);

  const [orders, setOrders] = useState<Order[]>([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [reservaOpen, setReservaOpen] = useState(false);

  // ── Carga inicial ─────────────────────────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setFetchLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/orders/cliente/history", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message ?? "Error al cargar historial");
      setOrders((json.data as RawOrder[]).map(toFrontendOrder));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red");
    } finally {
      setFetchLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) loadHistory();
  }, [authLoading, user, loadHistory]);

  // ── Pusher: escuchar cambios de estado en tiempo real ─────────────────────────
  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    getPusherClient().then((client) => {
      if (cancelled) return;

      const channel = client.subscribe("restaurant");
      const deliveryChannel = client.subscribe("delivery");

      channel.bind("order:new", () => { loadHistory(); });

      channel.bind("order:status_updated", (data: { orderId: string; status: string }) => {
        setOrders((prev) =>
          prev.map((o) => o._id === data.orderId ? { ...o, status: mapStatus(data.status) } : o)
        );
        setSelectedOrder((prev) =>
          prev && prev._id === data.orderId ? { ...prev, status: mapStatus(data.status) } : prev
        );
      });

      channel.bind("order:updated", (data: { orderId: string; newStatus: string }) => {
        setOrders((prev) =>
          prev.map((o) => o._id === data.orderId ? { ...o, status: mapStatus(data.newStatus) } : o)
        );
        setSelectedOrder((prev) =>
          prev && prev._id === data.orderId ? { ...prev, status: mapStatus(data.newStatus) } : prev
        );
      });

      deliveryChannel.bind("order:status_updated", (data: { orderId: string; status: string }) => {
        setOrders((prev) =>
          prev.map((o) => o._id === data.orderId ? { ...o, status: mapStatus(data.status) } : o)
        );
        setSelectedOrder((prev) =>
          prev && prev._id === data.orderId ? { ...prev, status: mapStatus(data.status) } : prev
        );
      });

      deliveryChannel.bind("order:updated", (data: { orderId: string; newStatus: string }) => {
        setOrders((prev) =>
          prev.map((o) => o._id === data.orderId ? { ...o, status: mapStatus(data.newStatus) } : o)
        );
        setSelectedOrder((prev) =>
          prev && prev._id === data.orderId ? { ...prev, status: mapStatus(data.newStatus) } : prev
        );
      });
    });

    return () => {
      cancelled = true;
      getPusherClient().then((client) => {
        client.unsubscribe("restaurant");
        client.unsubscribe("delivery");
      });
    };
  }, [user, loadHistory]);

  // ── Stats ─────────────────────────────────────────────────────────────────────
  const validOrders = orders.filter((o) => o.status !== "Cancelado");
  const totalSpent  = validOrders.reduce((s, o) => s + o.total, 0);
  const totalVisits = validOrders.length;
  const average     = totalVisits > 0 ? totalSpent / totalVisits : 0;
  const points      = Math.floor(totalSpent);
  const isNew       = totalVisits <= 2;

  const rawUser = (() => {
    try { return JSON.parse(localStorage.getItem("user") ?? "{}"); }
    catch { return {}; }
  })();

  const clientStats: ClientStats = {
    name: user?.name ?? rawUser?.name ?? "Cliente",
    memberSince: rawUser?.createdAt ? formatMemberSince(rawUser.createdAt) : "este año",
    totalVisits,
    totalSpent,
    average,
    points,
    isNew,
    benefits: getBenefits(totalVisits, isNew),
  };

  const handleViewOrder  = (order: Order) => { setSelectedOrder(order); setModalOpen(true); };
  const handleCloseModal = () => { setModalOpen(false); setTimeout(() => setSelectedOrder(null), 200); };

  if (authLoading) {
    return <main style={st.main}><div style={st.centered}>Verificando sesión…</div></main>;
  }

  return (
    <main style={st.main}>
      <ClientHeader
        onDelivery={() => router.push("/dashboard/cliente/delivery")}
        onReservar={() => setReservaOpen(true)}
        onLogout={logout}
      />
      <ClientInfoCard data={clientStats} />

      {fetchLoading ? (
        <div style={st.centered}>Cargando historial…</div>
      ) : error ? (
        <div style={st.errorBox}>
          <p>{error}</p>
          <button style={st.retryBtn} onClick={loadHistory}>Reintentar</button>
        </div>
      ) : (
        <ConsumoHistory orders={orders} onViewOrder={handleViewOrder} />
      )}

      <OrderModal
        order={selectedOrder}
        open={modalOpen}
        onClose={handleCloseModal}
        onReorder={() => { handleCloseModal(); router.push("/dashboard/cliente/delivery"); }}
      />

      <ReservationModal
        open={reservaOpen}
        onClose={() => setReservaOpen(false)}
        onSuccess={() => setReservaOpen(false)}
      />
    </main>
  );
}

const st: { [k: string]: React.CSSProperties } = {
  main:     { minHeight: "100vh", backgroundColor: "#f9fafb", display: "flex", flexDirection: "column" },
  centered: { textAlign: "center", padding: "3rem", color: "#6b7280", fontSize: "1rem" },
  errorBox: { margin: "2rem", padding: "1.5rem", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, textAlign: "center", color: "#b91c1c", display: "flex", flexDirection: "column", gap: "0.75rem", alignItems: "center" },
  retryBtn: { backgroundColor: "#f97316", color: "#fff", border: "none", borderRadius: 8, padding: "0.5rem 1.25rem", fontWeight: 600, cursor: "pointer" },
};