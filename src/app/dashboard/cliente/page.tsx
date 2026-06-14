"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
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
    pending: "Pendiente", in_kitchen: "En cocina", ready: "Listo",
    picked_up: "En camino", in_transit: "En camino",
    delivered: "Completado", paid: "Completado", cancelled: "Cancelado",
  };
  return map[status] ?? "Pendiente";
}

// ── Sorting Helper ─────────────────────────────────────────────────────────────

function sortOrdersPriority(orders: Order[]): Order[] {
  const priority: Record<string, number> = {
    "En camino": 1,
    "En cocina": 2,
    "Listo": 3,
    "Pendiente": 4,
    "Completado": 5,
    "Cancelado": 6,
  };
  return [...orders].sort((a, b) => {
    const pa = priority[a.status] ?? 10;
    const pb = priority[b.status] ?? 10;
    if (pa !== pb) return pa - pb;
    return 0; // maintain original relative order (likely date desc from API)
  });
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
  delivery_coords?: { lat?: number | null; lng?: number | null };
  driver_location?: { lat?: number | null; lng?: number | null; updatedAt?: string | Date | null };
  payment_method?: string;
  payment?: {
    status: "pending" | "completed";
    method: string;
  } | null;
  notes?: string;
  createdAt: string;
  items: RawOrderItem[];
  daily_number?: number;
}

// ── Tipos de reserva ───────────────────────────────────────────────────────────

interface TableRef {
  _id: string;
  number: number;
  capacity: number;
  location: string;
}

interface ClientReservation {
  _id: string;
  contact_name: string;
  contact_lastname: string;
  party_size: number;
  date: string;
  occasion: string;
  status: "pending" | "confirmed" | "seated" | "cancelled";
  table_id: TableRef | null;
  notes: string;
  createdAt: string;
}

const RESERVATION_STATUS_LABEL: Record<string, string> = {
  pending:   "Pendiente de confirmación",
  confirmed: "Confirmada ✅",
  seated:    "En mesa 🪑",
  cancelled: "Cancelada ❌",
};

const RESERVATION_STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  pending:   { bg: "#fef9c3", text: "#854d0e",  border: "#fde68a" },
  confirmed: { bg: "#e8f8ef", text: "#166534",  border: "#86efac" },
  seated:    { bg: "#dbeafe", text: "#1e40af",  border: "#93c5fd" },
  cancelled: { bg: "#fee2e2", text: "#991b1b",  border: "#fca5a5" },
};

// ── Helpers de conversión ──────────────────────────────────────────────────────

function toFrontendOrder(raw: RawOrder, index: number): Order {
  return {
    id: raw.daily_number ? String(raw.daily_number) : String(index + 1001),
    _id: raw._id,
    serviceType: raw.service_type,
    date: formatDate(raw.createdAt),
    time: formatTime(raw.createdAt),
    location: mapLocation(raw),
    waiter: raw.service_type === "delivery" ? "Delivery" : "—",
    paymentMethod: (raw.payment_method as Order["paymentMethod"]) ?? "Efectivo",
    payment: raw.payment,
    status: mapStatus(raw.status),
    rawStatus: raw.status,
    items: (raw.items ?? []).map((it) => ({
      name: it.dish_id?.name ?? "Plato",
      quantity: it.quantity,
      unitPrice: it.unit_price,
    })),
    total: raw.total_amount,
    deliveryCoords:
      raw.delivery_coords?.lat != null && raw.delivery_coords?.lng != null
        ? { lat: raw.delivery_coords.lat, lng: raw.delivery_coords.lng }
        : null,
    driverLocation:
      raw.driver_location?.lat != null && raw.driver_location?.lng != null
        ? {
            lat: raw.driver_location.lat,
            lng: raw.driver_location.lng,
            updatedAt: raw.driver_location.updatedAt
              ? new Date(raw.driver_location.updatedAt).toISOString()
              : undefined,
          }
        : null,
  };
}

function getBenefits(visits: number, isNew: boolean): string[] {
  if (isNew) return ["Bienvenida especial", "5% descuento en tu próxima visita", "Bebida de cortesía"];
  if (visits >= 10) return ["10% descuento permanente", "Postre de cortesía", "Acceso a eventos exclusivos"];
  if (visits >= 5) return ["7% descuento en tu próxima visita", "Bebida de cortesía"];
  return ["5% descuento en tu próxima visita"];
}

// ── Componente tarjeta de reserva ──────────────────────────────────────────────

function ReservationCard({ r }: { r: ClientReservation }) {
  const sc = RESERVATION_STATUS_COLORS[r.status];
  return (
    <div style={{
      background: "#fff", borderRadius: 14, border: `1.5px solid ${sc.border}`,
      overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
    }}>
      <div style={{ height: 4, background: sc.border }} />
      <div style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>
                {RESERVATION_STATUS_LABEL[r.status]}
              </span>
              {r.occasion && <span style={{ fontSize: 12, color: "#888" }}>🎉 {r.occasion}</span>}
            </div>
            <p style={{ margin: 0, fontSize: 14, color: "#555" }}>
              👥 {r.party_size} persona{r.party_size !== 1 ? "s" : ""}
            </p>
            {r.table_id && r.status !== "pending" && (
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#27ae60", fontWeight: 600 }}>
                🪑 Mesa {r.table_id.number} · {r.table_id.location}
              </p>
            )}
            {r.notes && (
              <p style={{ margin: "6px 0 0", fontSize: 12, color: "#6b7280", fontStyle: "italic" }}>
                📝 {r.notes}
              </p>
            )}
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>
              📅 {new Date(r.date).toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" })}
            </p>
            <p style={{ margin: "3px 0 0", fontSize: 13, color: "#e85d26", fontWeight: 600 }}>
              🕐 {new Date(r.date).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Componente toast de notificación ───────────────────────────────────────────

function ReservationToast({ msg, onClose }: { msg: string; onClose: () => void }) {
  return (
    <div style={{
      position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
      zIndex: 9999, background: "#1a1a1a", color: "#fff",
      padding: "14px 24px", borderRadius: 12, fontSize: 14, fontWeight: 600,
      boxShadow: "0 4px 24px rgba(0,0,0,0.25)", display: "flex", alignItems: "center", gap: 12,
      maxWidth: "90vw", textAlign: "center",
    }}>
      <span>{msg}</span>
      <button onClick={onClose} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: 16, padding: 0 }}>✕</button>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────

export default function ClientePage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth(CLIENTE);

  const [orders, setOrders] = useState<Order[]>([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [reservaOpen, setReservaOpen] = useState(false);

  // ── Estado de reservas ─────────────────────────────────────────────────────
  const [reservations, setReservations] = useState<ClientReservation[]>([]);
  const [reservationToast, setReservationToast] = useState<string | null>(null);

  // ── Estado de fidelización real ───────────────────────────────────────────
  const [loyaltyData, setLoyaltyData] = useState<{
    tier: { name: string; discountPercent: number; benefits: string[]; slug: string };
    discountPercent: number;
    benefits: string[];
  } | null>(null);

  // Ref para evitar stale closures en Pusher
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  // ── Carga de historial de órdenes ──────────────────────────────────────────
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
      const rawHistory = (json.data as RawOrder[]).map((raw, index, arr) =>
        toFrontendOrder(raw, arr.length - 1 - index)
      );
      setOrders(sortOrdersPriority(rawHistory));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red");
    } finally {
      setFetchLoading(false);
    }
  }, []);

  // ── Carga de reservas del cliente ──────────────────────────────────────────
  const loadReservations = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch("/api/reservations", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.ok) {
        // Mostrar solo las no canceladas y ordenar por fecha desc
        const active = (json.data as ClientReservation[])
          .filter((r) => r.status !== "cancelled")
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setReservations(active);
      }
    } catch {
      // silencioso
    }
  }, []);

  // ── Carga de fidelización real del cliente ────────────────────────────────
  const loadLoyalty = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch("/api/customers/me/loyalty", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.ok) {
        setLoyaltyData(json.data);
      }
    } catch (e) {
      console.error("Error al cargar fidelización:", e);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      loadHistory();
      loadReservations();
      loadLoyalty();
    }
  }, [authLoading, user, loadHistory, loadReservations, loadLoyalty]);

  // ── Pusher ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    getPusherClient().then((client) => {
      if (cancelled) return;

      // Canales de órdenes (existentes)
      const channel = client.subscribe("restaurant");
      const deliveryChannel = client.subscribe("delivery");

      channel.bind("order:new", () => { loadHistory(); });
      channel.bind("order:status_updated", (data: { orderId: string; status: string }) => {
        setOrders((prev) =>
          prev.map((o) => o._id === data.orderId ? { ...o, status: mapStatus(data.status), rawStatus: data.status } : o)
        );
        setSelectedOrder((prev) =>
          prev && prev._id === data.orderId ? { ...prev, status: mapStatus(data.status), rawStatus: data.status } : prev
        );
      });
      channel.bind("order:updated", (data: { orderId: string; newStatus: string }) => {
        setOrders((prev) =>
          prev.map((o) => o._id === data.orderId ? { ...o, status: mapStatus(data.newStatus), rawStatus: data.newStatus } : o)
        );
        setSelectedOrder((prev) =>
          prev && prev._id === data.orderId ? { ...prev, status: mapStatus(data.newStatus), rawStatus: data.newStatus } : prev
        );
      });

      deliveryChannel.bind("order:status_updated", (data: { orderId: string; status: string }) => {
        setOrders((prev) =>
          prev.map((o) => o._id === data.orderId ? { ...o, status: mapStatus(data.status), rawStatus: data.status } : o)
        );
        setSelectedOrder((prev) =>
          prev && prev._id === data.orderId ? { ...prev, status: mapStatus(data.status), rawStatus: data.status } : prev
        );
      });
      deliveryChannel.bind("order:updated", (data: { orderId: string; newStatus: string }) => {
        setOrders((prev) =>
          prev.map((o) => o._id === data.orderId ? { ...o, status: mapStatus(data.newStatus), rawStatus: data.newStatus } : o)
        );
        setSelectedOrder((prev) =>
          prev && prev._id === data.orderId ? { ...prev, status: mapStatus(data.newStatus), rawStatus: data.newStatus } : prev
        );
      });

      // ── NUEVO: canal privado del usuario para notificaciones de reserva ──
      const storedUser = (() => {
          try { return JSON.parse(localStorage.getItem("user") ?? "{}"); } catch { return {}; }
        })();
        const userId = userRef.current?._id ?? storedUser._id ?? storedUser.id;
      if (userId) {
        const userChannel = client.subscribe(`user-${userId}`);

        userChannel.bind("reservation:status", (data: {
          reservationId: string;
          status: string;
          message: string;
          table: TableRef | null;
        }) => {
          if (cancelled) return;

          // Actualizar la reserva en el estado local sin re-fetch
          setReservations((prev) =>
            prev.map((r) =>
              r._id === data.reservationId
                ? { ...r, status: data.status as ClientReservation["status"], table_id: data.table ?? r.table_id }
                : r
            ).filter((r) => r.status !== "cancelled")
          );

          // Mostrar toast con el mensaje del servidor
          setReservationToast(data.message);
          // Auto-cerrar después de 6 segundos
          setTimeout(() => setReservationToast(null), 6000);

          // Re-fetch para tener datos frescos (tabla asignada, notas)
          loadReservations();
        });
      }
    });

    return () => {
      cancelled = true;
      getPusherClient().then((client) => {
        client.unsubscribe("restaurant");
        client.unsubscribe("delivery");
        const storedUser = (() => {
            try { return JSON.parse(localStorage.getItem("user") ?? "{}"); } catch { return {}; }
          })();
          const userId = userRef.current?._id ?? storedUser._id ?? storedUser.id;
        if (userId) client.unsubscribe(`user-${userId}`);
      });
    };
  }, [user, loadHistory, loadReservations]);

  // ── Stats ──────────────────────────────────────────────────────────────────
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
    isNew: loyaltyData ? loyaltyData.tier.slug === "nuevo" : isNew,
    tierName: loyaltyData?.tier.name || undefined,
    discountPercent: loyaltyData?.discountPercent ?? undefined,
    benefits: loyaltyData?.benefits ?? getBenefits(totalVisits, isNew),
  };

  const handleViewOrder  = (order: Order) => { setSelectedOrder(order); setModalOpen(true); };
  const handleCloseModal = () => { setModalOpen(false); setTimeout(() => setSelectedOrder(null), 200); };

  if (authLoading) {
    return <main style={st.main}><div style={st.centered}>Verificando sesión…</div></main>;
  }

  return (
    <main style={st.main}>
      {/* Toast de notificación de reserva */}
      {reservationToast && (
        <ReservationToast
          msg={reservationToast}
          onClose={() => setReservationToast(null)}
        />
      )}

      <ClientHeader
        onDelivery={() => router.push("/dashboard/cliente/delivery")}
        onReservar={() => setReservaOpen(true)}
        onLogout={logout}
      />
      <ClientInfoCard data={clientStats} />

      {/* ── Sección de reservas activas ── */}
      {reservations.length > 0 && (
        <div style={{ padding: "20px 20px 0" }}>
          <h2 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700, color: "#1a1a1a" }}>
            📅 Mis reservas
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {reservations.map((r) => (
              <ReservationCard key={r._id} r={r} />
            ))}
          </div>
        </div>
      )}

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
        onSuccess={() => { setReservaOpen(false); loadReservations(); }}
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
