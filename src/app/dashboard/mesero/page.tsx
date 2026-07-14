"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import type { AuthUser } from "@/lib/useAuth";
import { ComandaMeseroModal } from "@/components/comanda/ComandaModals";

// ─── Types ────────────────────────────────────────────────────────
type OrderStatus = "pending" | "in_kitchen" | "ready" | "delivered" | "paid" | "cancelled";

interface Table {
  _id: string;
  number: number;
  seats: number;
  location?: string;
  status: string;
}

interface Category {
  _id: string;
  name: string;
}

interface Dish {
  _id: string;
  name: string;
  price: number;
  description?: string;
  image_url?: string;
  category_id?: { _id: string; name: string } | null;
  isAvailable: boolean;
  ingredients: DishIngredient[];
}

interface OrderItemLocal {
  dish: Dish;
  quantity: number;
  notes: string;
}

interface ActiveOrderItem {
  _id: string;
  quantity: number;
  unit_price: number;
  status: string;
  notes?: string;
  dish_id?: { name: string } | null;
}

interface ActiveOrder {
  _id: string;
  daily_number?: number;
  status: OrderStatus;
  table_id: string;
  table_number?: number | null;
  createdAt: string;
  total_amount: number;
  items: ActiveOrderItem[];
}

interface TableOrderState {
  canRequestBill: boolean;
  activeOrderId: string | null;
  statuses: string[];
}

interface InventoryAlerta {
  ingredientId: string;
  name: string;
  currentStock: number;
  unit: string;
  stockStatus: "low" | "critical";
  minStock: number;
  warningStock: number;
}

interface DishIngredient {
  ingredient_id: {
    _id: string;
    name: string;
    unit: string;
    currentStock: number;
    minStock: number;
    warningStock: number;
    stockStatus: "ok" | "low" | "critical";
  };
  quantity: number;
}

// ─── Tipo para reservas del día ───────────────────────────────────
interface TableRef {
  _id: string;
  number: number;
  capacity: number;
  location: string;
}

interface TodayReservation {
  _id: string;
  contact_name: string;
  contact_lastname: string;
  contact_phone: string;
  party_size: number;
  date: string;
  occasion: string;
  special_requests: string;
  notes: string;
  status: "pending" | "confirmed" | "seated" | "cancelled";
  table_id: TableRef | null;
}

// ─── Constantes ───────────────────────────────────────────────────
const ALLOWED_ROLES: AuthUser["rol"][] = ["mesero", "admin"];

const TABLE_STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; border: string; badgeBg: string; badgeColor: string; dot: string }
> = {
  Libre:              { label: "Libre",              bg: "#f0fdf4", border: "#bbf7d0", badgeBg: "#111",     badgeColor: "#fff",     dot: "#22c55e" },
  Ocupada:            { label: "Ocupada",             bg: "#fff7ed", border: "#fed7aa", badgeBg: "#f3f4f6",  badgeColor: "#374151",  dot: "#f97316" },
  Reservada:          { label: "Reservada",           bg: "#eff6ff", border: "#bfdbfe", badgeBg: "#3b82f6",  badgeColor: "#fff",     dot: "#3b82f6" },
  "Cuenta solicitada":{ label: "Cuenta solicitada",  bg: "#fff7ed", border: "#fed7aa", badgeBg: "#ea580c",  badgeColor: "#fff",     dot: "#ea580c" },
  Activa:             { label: "Activa",              bg: "#f0fdf4", border: "#bbf7d0", badgeBg: "#111",     badgeColor: "#fff",     dot: "#22c55e" },
  Inactiva:           { label: "Inactiva",            bg: "#f9fafb", border: "#e5e7eb", badgeBg: "#e5e7eb",  badgeColor: "#6b7280",  dot: "#9ca3af" },
};

const ORDER_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:    { label: "Pendiente",  color: "#d97706", bg: "#fef3c7" },
  in_kitchen: { label: "En Cocina",  color: "#2563eb", bg: "#dbeafe" },
  ready:      { label: "Listo",      color: "#16a34a", bg: "#dcfce7" },
  delivered:  { label: "Entregado",  color: "#7c3aed", bg: "#ede9fe" },
  paid:       { label: "Pagado",     color: "#374151", bg: "#f3f4f6" },
  cancelled:  { label: "Cancelado",  color: "#dc2626", bg: "#fee2e2" },
};

const formatBOB = (amount: number) =>
  new Intl.NumberFormat("es-BO", { style: "currency", currency: "BOB" }).format(amount);

function getStockIssue(dish: Dish, cartQty: number): { blocked: boolean; reason: string } | null {
  if (!dish.ingredients?.length) return null;
  for (const ing of dish.ingredients) {
    const ingData = ing.ingredient_id;
    if (!ingData) continue;
    if (ingData.stockStatus === "critical") return { blocked: true, reason: `🔴 Sin stock de ${ingData.name}` };
    const needed = ing.quantity * Math.max(cartQty, 1);
    if (ingData.currentStock < needed) {
      return { blocked: true, reason: `⚠️ Stock insuficiente: ${ingData.name} (${ingData.currentStock}/${needed} ${ingData.unit})` };
    }
  }
  return null;
}

function useElapsed(createdAt: string) {
  const [elapsed, setElapsed] = useState("");
  useEffect(() => {
    const calc = () => {
      const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
      if (diff < 60) setElapsed(`${diff}s`);
      else if (diff < 3600) setElapsed(`${Math.floor(diff / 60)}min`);
      else setElapsed(`${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}min`);
    };
    calc();
    const t = setInterval(calc, 1000);
    return () => clearInterval(t);
  }, [createdAt]);
  return elapsed;
}

// ─── Banner de alerta de inventario ──────────────────────────────
function InventoryAlertBanner({ alertas, onClose }: { alertas: InventoryAlerta[]; onClose: () => void }) {
  const criticos = alertas.filter((a) => a.stockStatus === "critical");
  const bajos    = alertas.filter((a) => a.stockStatus === "low");
  return (
    <div role="alert" style={{ position: "fixed", top: 70, left: "50%", transform: "translateX(-50%)", zIndex: 9998, width: "min(480px, 92vw)", background: "#fff", borderRadius: 14, border: "2px solid #e85d26", boxShadow: "0 8px 32px rgba(232,93,38,0.18)", overflow: "hidden" }}>
      <div style={{ background: criticos.length > 0 ? "#fff0ee" : "#fffbeb", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1.5px solid #f0f0f0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>{criticos.length > 0 ? "🚨" : "⚠️"}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: criticos.length > 0 ? "#e85d26" : "#d97706" }}>Alerta de Inventario</span>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#888" }}>✕</button>
      </div>
      <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        {criticos.map((a) => (
          <div key={a.ingredientId} style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px", background: "#fff0ee", borderRadius: 8, border: "1px solid #fecaca" }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{a.name}</span>
            <span style={{ fontSize: 12, color: "#e85d26", fontWeight: 700 }}>{a.currentStock} {a.unit} / mín {a.minStock}</span>
          </div>
        ))}
        {bajos.map((a) => (
          <div key={a.ingredientId} style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px", background: "#fffbeb", borderRadius: 8, border: "1px solid #fde68a" }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{a.name}</span>
            <span style={{ fontSize: 12, color: "#d97706", fontWeight: 700 }}>{a.currentStock} {a.unit} / adv {a.warningStock}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Modal datos de reserva — NUEVO ──────────────────────────────
function ReservationSeatModal({
  reservation,
  tableNumber,
  onSeat,
  onClose,
  loading,
}: {
  reservation: TodayReservation;
  tableNumber: number;
  onSeat: () => void;
  onClose: () => void;
  loading: boolean;
}) {
  const hora = new Date(reservation.date).toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" });
  const fecha = new Date(reservation.date).toLocaleDateString("es-BO", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 440, boxShadow: "0 24px 64px rgba(0,0,0,0.2)", overflow: "hidden" }}>
        {/* Header azul — identifica visualmente que es una reserva */}
        <div style={{ background: "linear-gradient(135deg, #3b82f6, #1d4ed8)", padding: "20px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>📅</div>
              <div>
                <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.7)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Reserva confirmada</p>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#fff" }}>Mesa {tableNumber}</h2>
              </div>
            </div>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", color: "#fff", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>
        </div>

        {/* Datos del cliente */}
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Nombre y hora */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <InfoBlock icon="👤" label="Cliente" value={`${reservation.contact_name} ${reservation.contact_lastname}`} />
            <InfoBlock icon="🕐" label="Hora reserva" value={hora} valueColor="#3b82f6" />
          </div>

          {/* Fecha y personas */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <InfoBlock icon="📅" label="Fecha" value={fecha} />
            <InfoBlock icon="👥" label="Personas" value={`${reservation.party_size} persona${reservation.party_size !== 1 ? "s" : ""}`} />
          </div>

          {/* Teléfono */}
          <InfoBlock icon="📞" label="Teléfono" value={reservation.contact_phone} />

          {/* Ocasión (si hay) */}
          {reservation.occasion && (
            <InfoBlock icon="🎉" label="Ocasión" value={reservation.occasion} valueColor="#7c3aed" />
          )}

          {/* Peticiones especiales */}
          {reservation.special_requests && (
            <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "10px 14px" }}>
              <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "#92400e", textTransform: "uppercase", letterSpacing: "0.05em" }}>⚠️ Petición especial</p>
              <p style={{ margin: 0, fontSize: 13, color: "#78350f" }}>{reservation.special_requests}</p>
            </div>
          )}

          {/* Nota interna */}
          {reservation.notes && (
            <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 10, padding: "10px 14px" }}>
              <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "#0369a1", textTransform: "uppercase" }}>📝 Nota interna</p>
              <p style={{ margin: 0, fontSize: 13, color: "#0c4a6e" }}>{reservation.notes}</p>
            </div>
          )}

          {/* Botones */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 4 }}>
            <button onClick={onClose} style={{ padding: "12px", borderRadius: 10, border: "1.5px solid #e5e7eb", background: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", color: "#374151" }}>
              Cancelar
            </button>
            <button
              onClick={onSeat}
              disabled={loading}
              style={{ padding: "12px", borderRadius: 10, border: "none", background: loading ? "#94a3b8" : "#16a34a", color: "#fff", fontSize: 13, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
            >
              {loading ? "Asignando…" : "🪑 Asentar cliente"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoBlock({ icon, label, value, valueColor }: { icon: string; label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ background: "#f9fafb", borderRadius: 10, padding: "10px 12px" }}>
      <p style={{ margin: "0 0 3px", fontSize: 11, color: "#6b7280", fontWeight: 600 }}>{icon} {label}</p>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: valueColor ?? "#111827", wordBreak: "break-word" }}>{value}</p>
    </div>
  );
}

// ─── TableCard ────────────────────────────────────────────────────
function TableCard({
  table,
  tableOrderState,
  todayReservation,
  onClick,
  onRequestBill,
  onViewComanda,
  onAddToOrder,
  onSeatReservation,
}: {
  table: Table;
  tableOrderState: TableOrderState | undefined;
  todayReservation: TodayReservation | undefined;
  onClick: () => void;
  onRequestBill: (tableId: string) => void;
  onViewComanda: (tableId: string) => void;
  onAddToOrder: (tableId: string) => void;
  onSeatReservation: (reservation: TodayReservation, tableNumber: number) => void;
}) {
  const cfg = TABLE_STATUS_CONFIG[table.status] ?? TABLE_STATUS_CONFIG["Libre"];
  const isReservada = table.status === "Reservada";
  const isOcupada   = table.status === "Ocupada" || table.status === "Cuenta solicitada";
  const isLibre     = table.status === "Libre" || table.status === "Activa";
  const canRequestBill = tableOrderState?.canRequestBill ?? false;

  // NUEVO: mesa marcada "Ocupada" pero sin ninguna orden activa (ej. reserva
  // asentada por el admin, o cualquier caso donde la mesa quedó huérfana)
  const hasActiveOrder    = !!tableOrderState?.activeOrderId;
  const isOcupadaSinOrden = isOcupada && !hasActiveOrder;
  const clickable = isLibre || isOcupadaSinOrden || isReservada;

  return (
    <div
      onClick={
        clickable
          ? (isReservada
              ? () => onSeatReservation(
                  todayReservation ?? {
                    _id: "", contact_name: "Cliente", contact_lastname: "", contact_phone: "",
                    party_size: 0, date: new Date().toISOString(), occasion: "",
                    special_requests: "", notes: "", status: "confirmed", table_id: null,
                  },
                  table.number
                )
              : onClick)
          : undefined
      }
      style={{
        background: cfg.bg, border: `1.5px solid ${cfg.border}`, borderRadius: 16,
        padding: "20px 16px 18px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
        cursor: clickable ? "pointer" : "default", transition: "transform 0.15s, box-shadow 0.15s",
        position: "relative", minHeight: 170, justifyContent: "center",
      }}
      onMouseEnter={(e) => { if (clickable) { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)"; } }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "none"; (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}
    >
      <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="1.5">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
      <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#111" }}>Mesa {table.number}</p>
      <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>{table.seats} personas</p>
      {table.location && <p style={{ margin: 0, fontSize: 11, color: "#9ca3af" }}>📍 {table.location}</p>}
      <span style={{ marginTop: 4, padding: "4px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: cfg.badgeBg, color: cfg.badgeColor }}>
        {cfg.label}
      </span>

      {/* ── Mesa RESERVADA — botón de asentar ── */}
      {isReservada && todayReservation && (
        <div style={{ width: "100%", marginTop: 6, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ background: "#dbeafe", border: "1px solid #93c5fd", borderRadius: 8, padding: "7px 10px" }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#1e40af" }}>
              👤 {todayReservation.contact_name} {todayReservation.contact_lastname}
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: "#1d4ed8" }}>
              🕐 {new Date(todayReservation.date).toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" })} · 👥 {todayReservation.party_size} personas
            </p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onSeatReservation(todayReservation, table.number); }}
            style={{ width: "100%", padding: "9px", borderRadius: 10, border: "none", background: "#16a34a", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}
          >
            🪑 Asentar cliente
          </button>
        </div>
      )}

      {isReservada && !todayReservation && (
        <button
          onClick={(e) => { e.stopPropagation(); onSeatReservation({ _id: "", contact_name: "Cliente", contact_lastname: "", contact_phone: "", party_size: 0, date: new Date().toISOString(), occasion: "", special_requests: "", notes: "", status: "confirmed", table_id: null }, table.number); }}
          style={{ width: "100%", marginTop: 4, padding: "9px", borderRadius: 10, border: "none", background: "#16a34a", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
        >
          🪑 Asentar cliente
        </button>
      )}

      {/* Mesa OCUPADA */}
      {isOcupada && (
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
          {isOcupadaSinOrden ? (
              <>
                <div style={{ background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 8, padding: "7px 10px" }}>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#92400e" }}>
                    {todayReservation
                      ? `📅 Llegó ${todayReservation.contact_name} — falta el pedido`
                      : "⚠️ Sin pedido activo"}
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onClick(); }}
                  style={{ width: "100%", padding: "9px", borderRadius: 10, border: "none", background: "#16a34a", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                >
                  🧾 Iniciar Pedido
                </button>
              </>
            ) : (
            <>
              <button onClick={(e) => { e.stopPropagation(); onAddToOrder(table._id); }} style={{ width: "100%", padding: "7px", borderRadius: 10, border: "1.5px solid #ea580c", background: "#fff7ed", color: "#ea580c", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                ➕ Agregar a Orden
              </button>
              <button onClick={(e) => { e.stopPropagation(); onViewComanda(table._id); }} style={{ width: "100%", padding: "7px", borderRadius: 10, border: "1.5px solid #2563eb", background: "#eff6ff", color: "#2563eb", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                📋 Ver Comanda
              </button>
              {canRequestBill ? (
                <button onClick={(e) => { e.stopPropagation(); onRequestBill(table._id); }} style={{ width: "100%", padding: "7px", borderRadius: 10, border: "1.5px solid #ea580c", background: "#fff7ed", color: "#ea580c", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  🧾 Pedir Cuenta
                </button>
              ) : (
                <div style={{ width: "100%", padding: "7px", borderRadius: 10, border: "1.5px solid #e5e7eb", background: "#f9fafb", color: "#9ca3af", fontSize: 12, fontWeight: 600, textAlign: "center" }}>
                  Esperando que el plato esté listo
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
// ─── ActiveOrderCard ──────────────────────────────────────────────
function ActiveOrderCard({ order, onMarkServed, onRequestBill, loading }: {
  order: ActiveOrder; onMarkServed: (id: string) => void; onRequestBill: (tableId: string) => void; loading: boolean;
}) {
  const elapsed   = useElapsed(order.createdAt);
  const statusCfg = ORDER_STATUS_CONFIG[order.status] ?? ORDER_STATUS_CONFIG.pending;
  const tableNum  = order.table_number ?? order.table_id;
  const isReady   = order.status === "ready";

  return (
    <div style={{ border: `1.5px solid ${isReady ? "#86efac" : "#e5e7eb"}`, borderRadius: 14, overflow: "hidden", background: "#fff", boxShadow: isReady ? "0 0 0 3px rgba(34,197,94,0.1)" : "none" }}>
      <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #f3f4f6" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "#fff7ed", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 18 }}>📋</span>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#111" }}>Mesa {tableNum}</p>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: "#1a1a1a", padding: "2px 7px", borderRadius: 6, fontFamily: "monospace" }}>
                #{order.daily_number ?? order._id.slice(-6).toUpperCase()}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 11, color: "#9ca3af" }}>{elapsed}</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: statusCfg.color, background: statusCfg.bg, padding: "3px 10px", borderRadius: 20 }}>{statusCfg.label}</span>
          <span style={{ fontSize: 15, fontWeight: 800, color: "#111" }}>{formatBOB(order.total_amount ?? 0)}</span>
        </div>
      </div>
      <div style={{ padding: "12px 16px" }}>
        {order.items?.map((item) => (
          <div key={item._id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#374151", marginBottom: 4 }}>
            <span>{item.quantity}x {item.dish_id?.name ?? "Plato"}</span>
            <span style={{ color: "#6b7280" }}>{formatBOB(item.unit_price * item.quantity)}</span>
          </div>
        ))}
      </div>
      {isReady && (
        <div style={{ padding: "0 16px 8px" }}>
          <button onClick={() => onMarkServed(order._id)} disabled={loading} style={{ width: "100%", padding: "12px", borderRadius: 10, border: "none", background: loading ? "#94a3b8" : "#111", color: "#fff", fontSize: 13, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            ✓ Marcar como Servido
          </button>
        </div>
      )}
      {order.status === "delivered" && (
        <div style={{ padding: "0 16px 14px" }}>
          <button onClick={() => onRequestBill(order.table_id)} disabled={loading} style={{ width: "100%", padding: "10px", borderRadius: 10, border: "1.5px solid #ea580c", background: "#fff7ed", color: "#ea580c", fontSize: 13, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            🧾 Pedir Cuenta
          </button>
        </div>
      )}
      {(order.status === "pending" || order.status === "in_kitchen") && (
        <div style={{ padding: "0 16px 12px" }}>
          <div style={{ padding: "8px 12px", borderRadius: 8, background: "#fef3c7", border: "1px solid #fcd34d", fontSize: 12, color: "#92400e", textAlign: "center" }}>
            ⏳ {order.status === "pending" ? "Esperando que cocina tome la orden" : "En preparación en cocina"}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── OrderModal (nuevo pedido o agregar a existente) ──────────────
function OrderModal({ table, onClose, onOrderCreated, mode = "new", existingOrderId }: {
  table: Table; onClose: () => void; onOrderCreated: () => void; mode?: "new" | "add"; existingOrderId?: string;
}) {
  const [dishes, setDishes]       = useState<Dish[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCat, setSelectedCat] = useState<string>("all");
  const [cart, setCart]           = useState<OrderItemLocal[]>([]);
  const [loading, setLoading]     = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState("");
  const [isMobile, setIsMobile]   = useState(false);
  const [mobileTab, setMobileTab] = useState<"menu" | "cart">("menu");
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const fetchMenuData = async () => {
      try {
        const [dishRes, catRes] = await Promise.all([fetch("/api/dishes"), fetch("/api/categories")]);
        const dishData = await dishRes.json();
        const catData  = await catRes.json();
        if (dishData.ok) setDishes(dishData.data.filter((d: Dish) => d.isAvailable));
        if (catData.ok)  setCategories(catData.data);
      } catch { setError("Error al cargar el menú"); }
      finally { setLoading(false); }
    };
    fetchMenuData();
  }, []);

  const filteredDishes = selectedCat === "all" ? dishes : dishes.filter((d) => d.category_id?._id === selectedCat);
  const addToCart    = (dish: Dish) => setCart((prev) => { const ex = prev.find((i) => i.dish._id === dish._id); return ex ? prev.map((i) => i.dish._id === dish._id ? { ...i, quantity: i.quantity + 1 } : i) : [...prev, { dish, quantity: 1, notes: "" }]; });
  const removeFromCart = (dishId: string) => setCart((prev) => { const ex = prev.find((i) => i.dish._id === dishId); if (!ex) return prev; if (ex.quantity <= 1) return prev.filter((i) => i.dish._id !== dishId); return prev.map((i) => i.dish._id === dishId ? { ...i, quantity: i.quantity - 1 } : i); });
  const getQty = (dishId: string) => cart.find((i) => i.dish._id === dishId)?.quantity ?? 0;
  const total  = cart.reduce((sum, i) => sum + i.dish.price * i.quantity, 0);

  const handleSubmit = async () => {
    if (cart.length === 0) { setError("Agrega al menos un platillo"); return; }
    const token = localStorage.getItem("token");
    if (!token) { setError("Sesión expirada."); return; }
    setSubmitting(true); setError("");
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
      let res: Response;
      if (mode === "add" && existingOrderId) {
        res = await fetch(`/api/orders/${existingOrderId}/add-items`, { method: "PUT", headers, body: JSON.stringify({ items: cart.map((i) => ({ dish_id: i.dish._id, quantity: i.quantity, unit_price: i.dish.price, notes: i.notes || undefined })) }) });
      } else {
        res = await fetch("/api/orders", { method: "POST", headers, body: JSON.stringify({ table_id: table._id, service_type: "dine_in", items: cart.map((i) => ({ dish_id: i.dish._id, quantity: i.quantity, unit_price: i.dish.price, notes: i.notes || undefined })) }) });
      }
      const data = await res.json();
      if (!data.ok) { setError(data.message || "Error al procesar la orden"); return; }
      onOrderCreated(); onClose();
    } catch { setError("Error de conexión."); }
    finally { setSubmitting(false); }
  };

  return (
    <div ref={overlayRef} onClick={(e) => { if (e.target === overlayRef.current) onClose(); }} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center", padding: isMobile ? 0 : 16 }}>
      <div style={{ background: "#fff", borderRadius: isMobile ? "20px 20px 0 0" : 20, width: "100%", maxWidth: 760, height: isMobile ? "92vh" : "auto", maxHeight: isMobile ? "92vh" : "90vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.2)" }}>
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#111" }}>{mode === "add" ? `Agregar a Orden — Mesa ${table.number}` : `Nueva Orden — Mesa ${table.number}`}</h2>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6b7280" }}>{mode === "add" ? "Los nuevos platillos irán a cocina por separado" : "Selecciona los platillos y envía la orden a cocina"}</p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: "50%", border: "1.5px solid #e5e7eb", background: "#fff", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280", flexShrink: 0 }}>×</button>
        </div>

        <div style={{ display: "flex", flex: 1, flexDirection: isMobile ? "column" : "row", overflow: "hidden" }}>
          {/* Menú */}
          {(!isMobile || mobileTab === "menu") && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", borderRight: isMobile ? "none" : "1px solid #f3f4f6", overflow: "hidden" }}>
              <div style={{ padding: "16px 20px 8px" }}><p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#111" }}>Menú Disponible</p></div>
              <div style={{ padding: "0 20px 12px", display: "flex", gap: 8, overflowX: "auto", flexShrink: 0 }}>
                <button onClick={() => setSelectedCat("all")} style={{ padding: "6px 16px", borderRadius: 20, border: "1.5px solid", borderColor: selectedCat === "all" ? "#111" : "#e5e7eb", background: selectedCat === "all" ? "#111" : "#fff", color: selectedCat === "all" ? "#fff" : "#6b7280", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>Todos</button>
                {categories.map((cat) => (
                  <button key={cat._id} onClick={() => setSelectedCat(cat._id)} style={{ padding: "6px 16px", borderRadius: 20, border: "1.5px solid", borderColor: selectedCat === cat._id ? "#111" : "#e5e7eb", background: selectedCat === cat._id ? "#111" : "#fff", color: selectedCat === cat._id ? "#fff" : "#6b7280", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>{cat.name}</button>
                ))}
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                {loading ? <p style={{ color: "#9ca3af", fontSize: 13, textAlign: "center", padding: 32 }}>Cargando menú...</p>
                  : filteredDishes.length === 0 ? <p style={{ color: "#9ca3af", fontSize: 13, textAlign: "center", padding: 32 }}>Sin platillos</p>
                  : filteredDishes.map((dish) => {
                    const qty = getQty(dish._id);
                    const stockIssue = getStockIssue(dish, qty);
                    const isBlocked = stockIssue !== null;
                    return (
                      <div key={dish._id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px", borderRadius: 12, border: isBlocked ? "1.5px solid #fecaca" : "1.5px solid #f3f4f6", background: isBlocked ? "#fff5f5" : qty > 0 ? "#f0fdf4" : "#fff", opacity: isBlocked ? 0.75 : 1 }}>
                        <div style={{ width: 64, height: 64, borderRadius: 10, flexShrink: 0, background: dish.image_url ? "transparent" : "#f3f4f6", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {dish.image_url ? <img src={dish.image_url} alt={dish.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 24 }}>🍽</span>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#111" }}>{dish.name}</p>
                          {dish.description && <p style={{ margin: "2px 0 0", fontSize: 11, color: "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{dish.description}</p>}
                          <p style={{ margin: "4px 0 0", fontSize: 14, fontWeight: 700, color: "#ea580c" }}>{formatBOB(dish.price)}</p>
                          {isBlocked && <p style={{ margin: "4px 0 0", fontSize: 11, fontWeight: 700, color: "#dc2626", background: "#fee2e2", border: "1px solid #fecaca", borderRadius: 6, padding: "2px 8px", display: "inline-block" }}>{stockIssue!.reason}</p>}
                        </div>
                        {isBlocked ? <div style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid #fecaca", background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>🚫</div>
                          : qty === 0 ? <button onClick={() => addToCart(dish)} style={{ width: 32, height: 32, borderRadius: "50%", border: "none", background: "#ea580c", color: "#fff", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>+</button>
                          : <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                              <button onClick={() => removeFromCart(dish._id)} style={{ width: 28, height: 28, borderRadius: "50%", border: "1.5px solid #e5e7eb", background: "#fff", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                              <span style={{ fontSize: 14, fontWeight: 700, minWidth: 20, textAlign: "center" }}>{qty}</span>
                              <button onClick={() => addToCart(dish)} style={{ width: 28, height: 28, borderRadius: "50%", border: "none", background: "#ea580c", color: "#fff", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                            </div>
                        }
                      </div>
                    );
                  })}
              </div>
              {isMobile && cart.length > 0 && (
                <div style={{ padding: "12px 16px", borderTop: "1px solid #f3f4f6", background: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 11, color: "#888" }}>Total provisional</p>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#ea580c" }}>{formatBOB(total)}</p>
                  </div>
                  <button onClick={() => setMobileTab("cart")} style={{ background: "#ea580c", color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    🛒 Ver Pedido ({cart.reduce((sum, i) => sum + i.quantity, 0)})
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Carrito */}
          {(!isMobile || mobileTab === "cart") && (
            <div style={{ width: isMobile ? "100%" : 280, display: "flex", flexDirection: "column", flexShrink: 0, height: "100%", overflow: "hidden" }}>
              {isMobile && (
                <div style={{ padding: "12px 16px 0", flexShrink: 0 }}>
                  <button onClick={() => { setMobileTab("menu"); setError(""); }} style={{ background: "none", border: "1px solid #e5e7eb", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, color: "#374151", cursor: "pointer" }}>← Volver al Menú</button>
                </div>
              )}
              <div style={{ padding: "16px 20px 8px" }}><p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#111" }}>{mode === "add" ? "Ítems a agregar" : "Orden Actual"}</p></div>
              <div style={{ flex: 1, overflowY: "auto", padding: "0 20px" }}>
                {cart.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "48px 16px", border: "2px dashed #e5e7eb", borderRadius: 12, color: "#d1d5db" }}>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>📋</div>
                    <p style={{ margin: 0, fontSize: 13 }}>Selecciona platillos del menú</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {cart.map((item) => (
                      <div key={item.dish._id} style={{ padding: "10px 12px", background: "#f9fafb", borderRadius: 10, border: "1px solid #f3f4f6" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#111" }}>{item.quantity}x {item.dish.name}</p>
                            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#ea580c", fontWeight: 600 }}>{formatBOB(item.dish.price * item.quantity)}</p>
                          </div>
                          <button onClick={() => setCart((prev) => prev.filter((i) => i.dish._id !== item.dish._id))} style={{ border: "none", background: "none", cursor: "pointer", color: "#9ca3af", fontSize: 14, padding: "0 0 0 8px" }}>✕</button>
                        </div>
                        <input type="text" placeholder="Notas (opcional)..." value={item.notes} onChange={(e) => setCart((prev) => prev.map((i) => i.dish._id === item.dish._id ? { ...i, notes: e.target.value } : i))} style={{ marginTop: 6, width: "100%", padding: "5px 8px", fontSize: 11, border: "1px solid #e5e7eb", borderRadius: 6, outline: "none", color: "#374151", boxSizing: "border-box" }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ padding: "16px 20px", borderTop: "1px solid #f3f4f6" }}>
                {error && <p style={{ margin: "0 0 10px", fontSize: 12, color: "#dc2626", background: "#fef2f2", padding: "8px 10px", borderRadius: 8 }}>{error}</p>}
                {cart.length > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                    <span style={{ fontSize: 13, color: "#6b7280" }}>Total a agregar</span>
                    <span style={{ fontSize: 16, fontWeight: 800, color: "#111" }}>{formatBOB(total)}</span>
                  </div>
                )}
                <button onClick={handleSubmit} disabled={submitting || cart.length === 0} style={{ width: "100%", padding: "13px", borderRadius: 12, border: "none", background: cart.length === 0 ? "#e5e7eb" : submitting ? "#94a3b8" : "#ea580c", color: cart.length === 0 ? "#9ca3af" : "#fff", fontSize: 14, fontWeight: 700, cursor: cart.length === 0 || submitting ? "not-allowed" : "pointer" }}>
                  {submitting ? "Enviando..." : mode === "add" ? "Agregar a Orden" : "Enviar a Cocina"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page principal ───────────────────────────────────────────────
export default function MeseroPage() {
  const router = useRouter();
  const { user, loading: userLoading, logout } = useAuth(ALLOWED_ROLES);
  const [tables, setTables]           = useState<Table[]>([]);
  const [isMobile, setIsMobile]       = useState(false);
  const [activeOrders, setActiveOrders] = useState<ActiveOrder[]>([]);
  const [tableOrderStates, setTableOrderStates] = useState<Record<string, TableOrderState>>({});
  const [todayReservations, setTodayReservations] = useState<TodayReservation[]>([]);  // NUEVO
  const [loadingData, setLoadingData] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [addToTable, setAddToTable]   = useState<Table | null>(null);
  const [toast, setToast]             = useState("");
  const [refreshKey, setRefreshKey]   = useState(0);
  const [comandaOrderId, setComandaOrderId]         = useState<string | null>(null);
  const [comandaTableNumber, setComandaTableNumber] = useState<number | null>(null);
  const [inventoryAlertas, setInventoryAlertas]     = useState<InventoryAlerta[] | null>(null);

  // NUEVO — estado del modal de reserva
  const [seatModal, setSeatModal] = useState<{ reservation: TodayReservation; tableNumber: number } | null>(null);
  const [seatLoading, setSeatLoading] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }, []);

  // ── Fetch reservas del día ─────────────────────────────────────
  const fetchTodayReservations = useCallback(async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const today = new Date().toISOString().split("T")[0];
        const res = await fetch(`/api/reservations?date=${today}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (json.ok) {
          setTodayReservations(
            (json.data as TodayReservation[]).filter(
              (r) => ["confirmed", "pending", "seated"].includes(r.status) // ← agregamos "seated"
            )
          );
        }
      } catch { /* silencioso */ }
    }, []);

  const fetchData = useCallback(async () => {
    const token = localStorage.getItem("token");
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      const [tablesRes, ordersRes, tableStatesRes] = await Promise.all([
        fetch("/api/tables"),
        fetch("/api/orders/active", { headers }),
        fetch("/api/orders/by-table", { headers }),
      ]);
      const tablesRaw      = await tablesRes.json();
      const ordersData     = await ordersRes.json();
      const tableStatesRaw = await tableStatesRes.json();
      setTables(Array.isArray(tablesRaw) ? tablesRaw : []);
      if (ordersData.ok) { setActiveOrders(ordersData.data); setRefreshKey((k) => k + 1); }
      if (tableStatesRaw.ok) setTableOrderStates(tableStatesRaw.data);
    } catch { /* silencioso */ }
    finally { setLoadingData(false); }
  }, []);

  useEffect(() => {
    if (userLoading || !user) return;
    fetchData();
    fetchTodayReservations();

    let pusherInstance: InstanceType<typeof import("pusher-js")["default"]> | null = null;
    let mounted = true;
    const setup = async () => {
      const { default: Pusher } = await import("pusher-js/with-encryption");
      if (!mounted) return;
      pusherInstance = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, { cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!, forceTLS: true });
      const channel = pusherInstance.subscribe("restaurant");
      channel.bind("order:new", () => { if (mounted) fetchData(); });
      channel.bind("order:updated", (data: { newStatus: string }) => {
        if (!mounted) return;
        fetchData();
        if (data.newStatus === "ready") showToast("🔔 ¡Una orden está lista para servir!");
      });
      channel.bind("table:updated", () => { if (mounted) { fetchData(); fetchTodayReservations(); } });
      channel.bind("table:bill_requested", () => { if (mounted) fetchData(); });
      // NUEVO — actualizar reservas cuando cambia una
      channel.bind("reservation:updated", () => { if (mounted) fetchTodayReservations(); });
      channel.bind("reservation:seated", (data: { tableNumber?: number; contactName: string; partySize: number }) => {
        if (!mounted) return;
        showToast(`📅🪑 Mesa ${data.tableNumber ?? "?"} — llegó ${data.contactName} (${data.partySize} pers.) · falta iniciar pedido`);
        fetchData();
        fetchTodayReservations();
      });
      channel.bind("inventory:alert", (data: { alertas: InventoryAlerta[] }) => {
        if (!mounted) return;
        if (data.alertas?.length > 0) { setInventoryAlertas(data.alertas); setTimeout(() => setInventoryAlertas(null), 12000); }
      });
    };
    setup();
    return () => { mounted = false; pusherInstance?.unsubscribe("restaurant"); pusherInstance?.disconnect(); };
  }, [userLoading, user, fetchData, fetchTodayReservations, showToast]);

  const handleMarkServed = async (orderId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/Kitchen", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId, newStatus: "delivered" }) });
      const data = await res.json();
      if (!data.ok) { showToast("❌ " + data.message); return; }
      showToast("✓ Orden marcada como entregada");
      await fetchData();
    } catch { showToast("❌ Error al actualizar"); }
    finally { setActionLoading(false); }
  };

  const handleRequestBill = async (tableId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/tables/${tableId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "Cuenta solicitada" }) });
      const data = await res.json();
      if (!data.error) {
        showToast("🧾 Cuenta solicitada al cajero");
        await fetchData();
        await fetch("/api/notify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event: "table:bill_requested", tableId }) });
      } else { showToast("❌ " + data.error); }
    } catch { showToast("❌ Error al solicitar cuenta"); }
    finally { setActionLoading(false); }
  };

  const handleViewComanda = (tableId: string) => {
    const tableState = tableOrderStates[tableId];
    if (!tableState?.activeOrderId) { showToast("❌ No hay orden activa para esta mesa"); return; }
    const table = tables.find((t) => t._id === tableId);
    setComandaOrderId(tableState.activeOrderId);
    setComandaTableNumber(table?.number ?? null);
  };

  const handleAddToOrder = (tableId: string) => {
    const tableState = tableOrderStates[tableId];
    if (!tableState?.activeOrderId) { showToast("❌ No hay orden activa para esta mesa"); return; }
    const table = tables.find((t) => t._id === tableId);
    if (table) setAddToTable(table);
  };

  // ── NUEVO — asentar cliente con reserva ───────────────────────
  const handleSeatReservation = (reservation: TodayReservation, tableNumber: number) => {
    setSeatModal({ reservation, tableNumber });
  };

  const handleConfirmSeat = async () => {
    if (!seatModal || !seatModal.reservation._id) {
      // Si no tenemos ID de reserva, solo cambiamos la mesa manualmente
      showToast("❌ No se pudo identificar la reserva");
      setSeatModal(null);
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) return;
    setSeatLoading(true);
    try {
      const res = await fetch(`/api/reservations/${seatModal.reservation._id}/seat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.ok) { showToast("❌ " + data.message); return; }
      showToast(`✓ Cliente asentado en Mesa ${seatModal.tableNumber} — ¡A tomar la orden!`);
      setSeatModal(null);
      await fetchData();
      await fetchTodayReservations();
      // Abrir automáticamente el modal de nueva orden para la mesa
      const table = tables.find((t) => t.number === seatModal.tableNumber);
      if (table) setTimeout(() => setSelectedTable(table), 400);
    } catch { showToast("❌ Error al asentar al cliente"); }
    finally { setSeatLoading(false); }
  };

  // ── Mapa tabla_id → reserva de hoy ────────────────────────────
  const reservationByTableId = todayReservations.reduce<Record<string, TodayReservation>>((acc, r) => {
    if (r.table_id) acc[r.table_id._id] = r;
    return acc;
  }, {});

  const visibleOrders = activeOrders.filter((o) => !["paid", "cancelled"].includes(o.status));
  const occupiedCount  = tables.filter((t) => ["Ocupada", "Cuenta solicitada"].includes(t.status)).length;
  const reservedCount  = tables.filter((t) => t.status === "Reservada").length;
  const availableCount = tables.filter((t) => ["Libre", "Activa"].includes(t.status)).length;
  const readyCount     = activeOrders.filter((o) => o.status === "ready").length;
  const activeOrdersCount = activeOrders.filter((o) => ["pending", "in_kitchen"].includes(o.status)).length;

  if (userLoading) return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "#6b7280", fontSize: 14 }}>Verificando sesión...</p>
    </div>
  );
  if (!user) return null;

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "'Georgia', serif" }}>
      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1.5px solid #f3f4f6", padding: isMobile ? "10px 16px" : "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 14 }}>
          <div style={{ width: isMobile ? 32 : 40, height: isMobile ? 32 : 40, borderRadius: 12, background: "#ea580c", display: "flex", alignItems: "center", justifyContent: "center", fontSize: isMobile ? 16 : 20 }}>🍽</div>
          <div>
            <p style={{ margin: 0, fontSize: isMobile ? 15 : 17, fontWeight: 800, color: "#111" }}>Panel de Mesero</p>
            {!isMobile && <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>Gestión de Mesas y Órdenes</p>}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 16 }}>
          {!isMobile && (
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#111" }}>{user.name}</p>
              <p style={{ margin: 0, fontSize: 11, color: "#9ca3af" }}>Mesero</p>
            </div>
          )}
          {/* Badge de reservas del día */}
          {todayReservations.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, background: "#dbeafe", border: "1px solid #93c5fd", borderRadius: 20, padding: "4px 10px" }}>
              <span style={{ fontSize: 13 }}>📅</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#1e40af" }}>{todayReservations.length} reserva{todayReservations.length !== 1 ? "s" : ""} hoy</span>
            </div>
          )}
          <button onClick={() => logout()} style={{ display: "flex", alignItems: "center", gap: 4, padding: isMobile ? "6px 10px" : "8px 14px", borderRadius: 10, border: "1.5px solid #e5e7eb", background: "#fff", fontSize: isMobile ? 12 : 13, fontWeight: 600, color: "#374151", cursor: "pointer" }}>
            <span>→</span> {!isMobile && "Salir"}
          </button>
        </div>
      </div>

      {/* Banner inventario */}
      {inventoryAlertas && inventoryAlertas.length > 0 && (
        <InventoryAlertBanner alertas={inventoryAlertas} onClose={() => setInventoryAlertas(null)} />
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 9999, background: "#111", color: "#fff", padding: "12px 24px", borderRadius: 10, fontSize: 13, fontWeight: 600, boxShadow: "0 8px 32px rgba(0,0,0,0.25)", whiteSpace: "nowrap" }}>
          {toast}
        </div>
      )}

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? "16px 12px 32px" : "24px 24px 48px", display: "flex", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 16 : 24, alignItems: isMobile ? "stretch" : "flex-start" }}>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Mesas */}
          <div style={{ background: "#fff", borderRadius: 20, border: "1.5px solid #f3f4f6", padding: "24px", marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#111" }}>Mesas del Restaurante</h2>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#9ca3af" }}>Las mesas en azul tienen reserva para hoy</p>
              </div>
            </div>
            {loadingData ? (
              <p style={{ color: "#9ca3af", fontSize: 13, textAlign: "center", padding: 32 }}>Cargando mesas...</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14 }}>
                {tables.map((table) => (
                  <TableCard
                    key={table._id}
                    table={table}
                    tableOrderState={tableOrderStates[table._id]}
                    todayReservation={reservationByTableId[table._id]}
                    onClick={() => setSelectedTable(table)}
                    onRequestBill={handleRequestBill}
                    onViewComanda={handleViewComanda}
                    onAddToOrder={handleAddToOrder}
                    onSeatReservation={handleSeatReservation}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Órdenes activas */}
          <div style={{ background: "#fff", borderRadius: 20, border: "1.5px solid #f3f4f6", padding: "24px" }}>
            <h2 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 800, color: "#111" }}>Mis Órdenes</h2>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: "#9ca3af" }}>Órdenes activas de este turno</p>
            {loadingData ? (
              <p style={{ color: "#9ca3af", fontSize: 13, textAlign: "center", padding: 32 }}>Cargando órdenes...</p>
            ) : visibleOrders.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 16px", border: "2px dashed #e5e7eb", borderRadius: 14 }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>📋</div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#6b7280" }}>No tienes órdenes activas</p>
                <p style={{ margin: "6px 0 0", fontSize: 12, color: "#9ca3af" }}>Las nuevas órdenes aparecerán aquí automáticamente</p>
              </div>
            ) : (
              <div key={refreshKey} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {visibleOrders.map((order) => (
                  <ActiveOrderCard key={`${order._id}-${order.status}`} order={order} onMarkServed={handleMarkServed} onRequestBill={handleRequestBill} loading={actionLoading} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ width: isMobile ? "100%" : 280, flexShrink: 0, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "#fff", borderRadius: 20, border: "1.5px solid #f3f4f6", padding: "20px 24px" }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 800, color: "#111" }}>Resumen del Turno</h3>
            {[
              { label: "Mesas Ocupadas",       value: `${occupiedCount}/${tables.length}`, color: "#111" },
              { label: "Mesas Reservadas Hoy", value: reservedCount,                       color: reservedCount > 0 ? "#3b82f6" : "#111" },
              { label: "Mis Órdenes Activas",  value: activeOrdersCount,                  color: "#111" },
              { label: "Listas para Servir",   value: readyCount,                          color: readyCount > 0 ? "#16a34a" : "#111" },
            ].map((item) => (
              <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f9fafb" }}>
                <span style={{ fontSize: 13, color: "#6b7280" }}>{item.label}</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: item.color }}>{item.value}</span>
              </div>
            ))}
          </div>

          {/* Reservas de hoy en sidebar */}
          {todayReservations.length > 0 && (
            <div style={{ background: "#eff6ff", borderRadius: 20, border: "1.5px solid #bfdbfe", padding: "20px 24px" }}>
              <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 800, color: "#1e40af" }}>📅 Reservas de Hoy</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {todayReservations.map((r) => (
                  <div key={r._id} style={{ background: "#fff", borderRadius: 10, padding: "10px 12px", border: "1px solid #bfdbfe" }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#1e3a8a" }}>{r.contact_name} {r.contact_lastname}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 11, color: "#3b82f6" }}>
                      🕐 {new Date(r.date).toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" })}
                      {" · "}👥 {r.party_size} pers.
                      {r.table_id && ` · Mesa ${r.table_id.number}`}
                    </p>
                    {r.occasion && <p style={{ margin: "2px 0 0", fontSize: 11, color: "#7c3aed" }}>🎉 {r.occasion}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ background: "#fff", borderRadius: 20, border: "1.5px solid #f3f4f6", padding: "20px 24px" }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 800, color: "#111" }}>Estado de Mesas</h3>
            {[
              { label: `Disponible (${availableCount})`, dot: "#22c55e" },
              { label: `Ocupada (${occupiedCount})`,     dot: "#f97316" },
              { label: `Reservada (${reservedCount})`,   dot: "#3b82f6" },
            ].map((item) => (
              <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: item.dot, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: "#374151" }}>{item.label}</span>
              </div>
            ))}
          </div>

          <button onClick={() => router.push("/dashboard")} style={{ width: "100%", padding: "12px", borderRadius: 12, border: "1.5px solid #e5e7eb", background: "#fff", fontSize: 13, fontWeight: 600, color: "#374151", cursor: "pointer" }}>
            ← Volver al Dashboard
          </button>
        </div>
      </div>

      {/* Modales */}
      {selectedTable && (
        <OrderModal table={selectedTable} mode="new" onClose={() => setSelectedTable(null)} onOrderCreated={() => { showToast("✓ Orden enviada a cocina"); fetchData(); }} />
      )}
      {addToTable && (
        <OrderModal table={addToTable} mode="add" existingOrderId={tableOrderStates[addToTable._id]?.activeOrderId ?? undefined} onClose={() => setAddToTable(null)} onOrderCreated={() => { showToast("✓ Ítems agregados a la orden"); fetchData(); }} />
      )}
      {comandaOrderId && (
        <ComandaMeseroModal orderId={comandaOrderId} tableNumber={comandaTableNumber} onClose={() => { setComandaOrderId(null); setComandaTableNumber(null); }} />
      )}

      {/* NUEVO — Modal de reserva para asentar */}
      {seatModal && (
        <ReservationSeatModal
          reservation={seatModal.reservation}
          tableNumber={seatModal.tableNumber}
          onSeat={handleConfirmSeat}
          onClose={() => setSeatModal(null)}
          loading={seatLoading}
        />
      )}
    </div>
  );
}