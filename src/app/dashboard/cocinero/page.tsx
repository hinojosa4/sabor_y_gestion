"use client";


import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import type { AuthUser } from "@/lib/useAuth";


// ─── Types ────────────────────────────────────────────────────────────────────
type OrderStatus = "pending" | "in_kitchen" | "ready" | "delivered" | "paid" | "cancelled";
type ItemStatus  = "pending" | "in_kitchen" | "ready" | "served" | "cancelled";


interface OrderItem {
  _id: string;
  quantity: number;
  unit_price: number;
  status: ItemStatus;
  notes?: string;
  prepared_at?: string;
  dish_id: {              // ✅ "dish" → "dish_id"
    _id: string;
    name: string;
    category_id?: { name: string } | null;  // ✅ "nombre" → "name"
  } | null;
}


interface KitchenOrder {
  _id: string;
  status: OrderStatus;
  service_type: "dine_in" | "delivery" | "pick_up";
  table_id?: string;
  createdAt: string;
  items: OrderItem[];
  total_amount: number;
}


// ─── Constantes ───────────────────────────────────────────────────────────────
// ✅ Sin cast doble
const ALLOWED_ROLES: AuthUser["rol"][] = ["cocinero", "admin"];


const STATUS_CONFIG = {
  pending:    { label: "Pendiente",      bg: "#fffbeb", border: "#fbbf24", accent: "#d97706", dot: "#f59e0b" },
  in_kitchen: { label: "En Preparación", bg: "#eff6ff", border: "#60a5fa", accent: "#2563eb", dot: "#3b82f6" },
  ready:      { label: "Listo",          bg: "#f0fdf4", border: "#4ade80", accent: "#16a34a", dot: "#22c55e" },
};


const SERVICE_CONFIG = {
  dine_in:  { label: "Mesa",     icon: "🪑", color: "#6366f1" },
  delivery: { label: "Delivery", icon: "🛵", color: "#8b5cf6" },
  pick_up:  { label: "Pickup",   icon: "🏃", color: "#f59e0b" },
};


// ─── Hook responsive ──────────────────────────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}


// ─── Helpers ──────────────────────────────────────────────────────────────────
function getElapsed(createdAt: string): string {
  const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}min`;
}


function getOrderNumber(id: string): string {
  return "#" + id.slice(-4).toUpperCase();
}


function getUrgency(createdAt: string): "normal" | "warning" | "critical" {
  const mins = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  if (mins >= 20) return "critical";
  if (mins >= 12) return "warning";
  return "normal";
}


const URGENCY_COLORS = {
  normal:   { timer: "#888" },
  warning:  { timer: "#d97706" },
  critical: { timer: "#dc2626" },
};


// ─── Componente: Timer vivo ───────────────────────────────────────────────────
function LiveTimer({ createdAt }: { createdAt: string }) {
  const [elapsed, setElapsed] = useState(getElapsed(createdAt));
  const urgency = getUrgency(createdAt);


  useEffect(() => {
    const t = setInterval(() => setElapsed(getElapsed(createdAt)), 1000);
    return () => clearInterval(t);
  }, [createdAt]);


  return (
    <span style={{
      fontSize: 12, fontWeight: 700,
      color: URGENCY_COLORS[urgency].timer,
      display: "flex", alignItems: "center", gap: 4,
      fontVariantNumeric: "tabular-nums",
    }}>
      ⏱ {elapsed}
      {urgency === "critical" && (
        <span style={{ fontSize: 10, background: "#dc2626", color: "#fff", borderRadius: 4, padding: "1px 6px" }}>
          URGENTE
        </span>
      )}
    </span>
  );
}


// ─── Componente: Badge de estado ──────────────────────────────────────────────
function StatusBadge({ status }: { status: OrderStatus }) {
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
  if (!cfg) return null;
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
      background: cfg.bg, color: cfg.accent,
      border: `1.5px solid ${cfg.border}`, whiteSpace: "nowrap",
    }}>
      {cfg.label}
    </span>
  );
}


// ─── Componente: Tarjeta de orden ─────────────────────────────────────────────
function OrderCard({
  order, onStatusChange, onItemToggle, loading,
}: {
  order: KitchenOrder;
  onStatusChange: (orderId: string, status: OrderStatus) => Promise<void>;
  onItemToggle: (itemId: string, currentStatus: ItemStatus) => Promise<void>;
  loading: boolean;
}) {
  const cfg = STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;
  const svc = SERVICE_CONFIG[order.service_type];
  const urgency = getUrgency(order.createdAt);
  const activeItems = order.items.filter(i => i.status !== "cancelled");
  const readyItems  = activeItems.filter(i => i.status === "ready" || i.status === "served");
  const allReady    = activeItems.length > 0 && readyItems.length === activeItems.length;


  return (
    <div style={{
      background: "#fff", borderRadius: 16,
      border: `2px solid ${urgency === "critical" && order.status === "pending" ? "#fca5a5" : cfg.border}`,
      overflow: "hidden", display: "flex", flexDirection: "column",
      boxShadow: urgency === "critical" && order.status === "pending"
        ? "0 0 0 3px rgba(220,38,38,0.12)"
        : "0 2px 12px rgba(0,0,0,0.06)",
      transition: "box-shadow 0.2s",
    }}>
      {/* Header */}
      <div style={{
        background: cfg.bg, padding: "14px 16px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 8, borderBottom: `1.5px solid ${cfg.border}`,
        flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: "#1a1a1a", fontFamily: "monospace" }}>
            {getOrderNumber(order._id)}
          </span>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
            background: svc.color + "18", color: svc.color, border: `1px solid ${svc.color}40`,
          }}>
            {svc.icon} {svc.label}
          </span>
          {order.service_type === "dine_in" && order.table_id && (
            <span style={{ fontSize: 11, color: "#888" }}>Mesa {order.table_id}</span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <LiveTimer createdAt={order.createdAt} />
          <StatusBadge status={order.status} />
        </div>
      </div>


      {/* Items */}
      <div style={{ padding: "12px 16px", flex: 1 }}>
        {activeItems.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: "#94a3b8", textAlign: "center", padding: "8px 0" }}>
            Sin ítems activos
          </p>
        ) : (
          activeItems.map((item, idx) => {
            const isReady = item.status === "ready" || item.status === "served";
            // ✅ "dish" → "dish_id", "nombre" → "name"
            const catName = item.dish_id?.category_id?.name;


            return (
              <div key={item._id}>
                {idx > 0 && <div style={{ height: 1, background: "#f3f4f6", margin: "8px 0" }} />}
                <div style={{
                  display: "flex", alignItems: "flex-start",
                  justifyContent: "space-between", gap: 8,
                  opacity: isReady ? 0.5 : 1, transition: "opacity 0.2s",
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      margin: 0, fontSize: 14, fontWeight: 700, color: "#1a1a1a",
                      textDecoration: isReady ? "line-through" : "none",
                    }}>
                      {/* ✅ "dish" → "dish_id" */}
                      {item.quantity}× {item.dish_id?.name ?? "Plato"}
                    </p>
                    {catName && (
                      <p style={{ margin: "2px 0 0", fontSize: 11, color: "#94a3b8" }}>{catName}</p>
                    )}
                    {item.notes && (
                      <p style={{
                        margin: "4px 0 0", fontSize: 11, color: "#d97706",
                        background: "#fffbeb", border: "1px solid #fde68a",
                        borderRadius: 6, padding: "3px 8px", display: "inline-block",
                      }}>
                        ⚠ {item.notes}
                      </p>
                    )}
                  </div>


                  {/* Toggle item — solo en in_kitchen */}
                  {order.status === "in_kitchen" && (
                    <button
                      onClick={() => onItemToggle(item._id, item.status)}
                      disabled={loading}
                      title={isReady ? "Marcar como pendiente" : "Marcar como listo"}
                      style={{
                        width: 32, height: 32, borderRadius: "50%",
                        border: `2px solid ${isReady ? "#22c55e" : "#d1d5db"}`,
                        background: isReady ? "#22c55e" : "#fff",
                        cursor: loading ? "not-allowed" : "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 14, color: isReady ? "#fff" : "#9ca3af",
                        flexShrink: 0, transition: "all 0.15s",
                      }}
                    >
                      {isReady ? "✓" : "○"}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>


      {/* Progress bar — in_kitchen */}
      {order.status === "in_kitchen" && activeItems.length > 0 && (
        <div style={{ padding: "0 16px 8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: "#94a3b8" }}>Progreso</span>
            <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700 }}>
              {readyItems.length}/{activeItems.length}
            </span>
          </div>
          <div style={{ height: 4, background: "#f3f4f6", borderRadius: 2, overflow: "hidden" }}>
            <div style={{
              height: "100%", background: "#22c55e", borderRadius: 2,
              width: `${(readyItems.length / activeItems.length) * 100}%`,
              transition: "width 0.3s ease",
            }} />
          </div>
        </div>
      )}


      {/* Footer CTA */}
      <div style={{ padding: "12px 16px", borderTop: "1.5px solid #f3f4f6" }}>
        {order.status === "pending" && (
          <button
            onClick={() => onStatusChange(order._id, "in_kitchen")}
            disabled={loading}
            style={{
              width: "100%", padding: "11px", borderRadius: 10, border: "none",
              background: loading ? "#94a3b8" : "#1a1a1a", color: "#fff",
              fontSize: 13, fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "inherit", display: "flex", alignItems: "center",
              justifyContent: "center", gap: 8, transition: "background 0.15s",
              minHeight: 44,
            }}
          >
            🔥 Comenzar a Preparar
          </button>
        )}


        {order.status === "in_kitchen" && (
          <button
            onClick={() => onStatusChange(order._id, "ready")}
            disabled={loading || !allReady}
            style={{
              width: "100%", padding: "11px", borderRadius: 10, border: "none",
              background: !allReady ? "#e5e7eb" : loading ? "#94a3b8" : "#16a34a",
              color: !allReady ? "#9ca3af" : "#fff",
              fontSize: 13, fontWeight: 700,
              cursor: loading || !allReady ? "not-allowed" : "pointer",
              fontFamily: "inherit", display: "flex", alignItems: "center",
              justifyContent: "center", gap: 8, transition: "background 0.15s",
              minHeight: 44,
            }}
          >
            {allReady
              ? "✓ Marcar como Listo"
              : `Faltan ${activeItems.length - readyItems.length} ítem(s)`}
          </button>
        )}


        {order.status === "ready" && (
          <div style={{
            textAlign: "center", padding: "8px", fontSize: 13,
            color: "#16a34a", fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}>
            ✓ Esperando ser servido
          </div>
        )}
      </div>
    </div>
  );
}


// ─── Page principal ───────────────────────────────────────────────────────────
export default function CocineroPage() {
  const router = useRouter();
  const isMobile = useIsMobile();
  // ✅ Sin cast doble
  const { user, loading: userLoading, logout } = useAuth(ALLOWED_ROLES);


  const [orders, setOrders]           = useState<KitchenOrder[]>([]);
  const [loading, setLoading]         = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast]             = useState("");
  const [filterCat, setFilterCat]     = useState("all");
  const [lastUpdate, setLastUpdate]   = useState(new Date());


  // ✅ useCallback para showToast
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    const t = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(t);
  }, []);


  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/Kitchen");
      const data = await res.json();
      if (data.ok) {
        setOrders(data.data);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error("Error al cargar órdenes:", error);
    } finally {
      setLoading(false);
    }
  }, []);


  // Fetch inicial + polling cada 15 segundos
  useEffect(() => {
    if (userLoading || !user) return;
    fetchOrders();
    const interval = setInterval(fetchOrders, 15000);
    return () => clearInterval(interval);
  }, [userLoading, user, fetchOrders]);


  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/Kitchen", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, newStatus }),
      });
      const data = await res.json();
      if (!data.ok) { showToast("❌ " + data.message); return; }


      const msgs: Record<string, string> = {
        in_kitchen: "🔥 Orden en preparación — inventario descontado",
        ready:      "✓ Orden marcada como lista",
        cancelled:  "Orden cancelada — stock restaurado",
      };
      showToast(msgs[newStatus] ?? "Estado actualizado");
      await fetchOrders();
    } catch (error) {
      console.error("Error al cambiar estado:", error);
      showToast("❌ Error al actualizar estado");
    } finally {
      setActionLoading(false);
    }
  };


  const handleItemToggle = async (itemId: string, currentStatus: ItemStatus) => {
    const newStatus: ItemStatus = currentStatus === "ready" ? "in_kitchen" : "ready";
    setActionLoading(true);
    try {
      const res = await fetch(`/api/Kitchen/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, chef_id: user?._id }),
      });
      const data = await res.json();
      if (!data.ok) { showToast("❌ " + data.message); return; }
      await fetchOrders();
    } catch (error) {
      console.error("Error al actualizar ítem:", error);
      showToast("❌ Error al actualizar ítem");
    } finally {
      setActionLoading(false);
    }
  };


  // ── Filtros ───────────────────────────────────────────────────────────────
  const pendingOrders   = orders.filter(o => o.status === "pending");
  const inKitchenOrders = orders.filter(o => o.status === "in_kitchen");
  const readyOrders     = orders.filter(o => o.status === "ready");


  // ✅ Categorías únicas — campo .name corregido
  const allCategories = Array.from(
    new Set(
      orders.flatMap(o =>
        o.items
          .map(i => i.dish_id?.category_id?.name)
          .filter(Boolean) as string[]
      )
    )
  );


  // ✅ Filtro por categoría — campo .name corregido
  const filterByCategory = (orderList: KitchenOrder[]) => {
    if (filterCat === "all") return orderList;
    return orderList.filter(o =>
      o.items.some(i => i.dish_id?.category_id?.name === filterCat)
    );
  };


  const px = isMobile ? "12px" : "24px";


  if (userLoading) {
    return (
      <div style={{
        minHeight: "100vh", background: "#f1f5f9",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Georgia', serif",
      }}>
        <p style={{ color: "#64748b", fontSize: 15 }}>Verificando sesión...</p>
      </div>
    );
  }
  if (!user) return null;


  const columns = [
    { key: "pending" as const,    title: "Pendientes",     orders: filterByCategory(pendingOrders),   color: "#d97706", dot: "#f59e0b" },
    { key: "in_kitchen" as const, title: "En Preparación", orders: filterByCategory(inKitchenOrders), color: "#2563eb", dot: "#3b82f6" },
    { key: "ready" as const,      title: "Listos",         orders: filterByCategory(readyOrders),     color: "#16a34a", dot: "#22c55e" },
  ];


  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", fontFamily: "'Georgia', serif" }}>


      {/* ── Header ── */}
      <div style={{
        background: "#fff", borderBottom: "2px solid #1a1a1a",
        padding: isMobile ? "12px 16px" : "14px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 12, position: "sticky", top: 0, zIndex: 100,
        flexWrap: isMobile ? "wrap" : "nowrap",
      }}>
        {/* Logo + título */}
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 10 : 14, minWidth: 0 }}>
          <button
            onClick={() => router.push("/dashboard/cocinero")}
            style={{
              width: 36, height: 36, borderRadius: 9,
              background: "#f4f4f4", border: "1.5px solid #e0e0e0",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", fontSize: 16, flexShrink: 0,
            }}
          >←</button>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: "#e85d26", flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
          }}>👨‍🍳</div>
          <div style={{ minWidth: 0 }}>
            <p style={{
              margin: 0, fontSize: isMobile ? 14 : 16, fontWeight: 700, color: "#1a1a1a",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              Panel de Cocina
            </p>
            {!isMobile && (
              <p style={{ margin: 0, fontSize: 11, color: "#94a3b8" }}>
                Actualizado {lastUpdate.toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </p>
            )}
          </div>
        </div>


        {/* Stats + usuario + salir */}
        <div style={{ display: "flex", gap: isMobile ? 6 : 12, alignItems: "center", flexShrink: 0 }}>
          {/* Stats resumen */}
          <div style={{ display: "flex", gap: isMobile ? 6 : 10 }}>
            {[
              { label: "Pend.",  value: pendingOrders.length,   color: "#d97706" },
              { label: "Prep.",  value: inKitchenOrders.length, color: "#2563eb" },
              { label: "Listo",  value: readyOrders.length,     color: "#16a34a" },
              { label: "Total",  value: orders.length,          color: "#1a1a1a" },
            ].map(s => (
              <div key={s.label} style={{
                textAlign: "center",
                padding: isMobile ? "5px 8px" : "8px 12px",
                background: "#f8fafc", borderRadius: 10,
                border: "1.5px solid #e2e8f0",
                minWidth: isMobile ? 38 : 50,
              }}>
                <p style={{ margin: 0, fontSize: isMobile ? 16 : 20, fontWeight: 800, color: s.color, lineHeight: 1 }}>
                  {s.value}
                </p>
                <p style={{ margin: 0, fontSize: 9, color: "#94a3b8", fontWeight: 600, marginTop: 2 }}>
                  {s.label}
                </p>
              </div>
            ))}
          </div>


          {/* Usuario + salir */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {!isMobile && (
              <div style={{ textAlign: "right" }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#1a1a1a" }}>{user.name}</p>
                <p style={{ margin: 0, fontSize: 10, color: "#e85d26", fontWeight: 600 }}>Chef</p>
              </div>
            )}
            <button
              onClick={() => logout()}
              style={{
                background: "#fff0ee", border: "1.5px solid #e85d26", borderRadius: 8,
                padding: isMobile ? "6px 10px" : "6px 14px",
                cursor: "pointer", fontSize: isMobile ? 11 : 12, fontWeight: 600,
                color: "#e85d26", fontFamily: "inherit", whiteSpace: "nowrap",
                minHeight: 36,
              }}
            >
              {isMobile ? "Salir" : "→ Salir"}
            </button>
          </div>
        </div>
      </div>


      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: "fixed", top: 20,
          left: "50%", transform: "translateX(-50%)",
          zIndex: 9999, background: "#1a1a1a", color: "#fff",
          padding: "12px 24px", borderRadius: 10,
          fontSize: 13, fontWeight: 600,
          boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
          whiteSpace: "nowrap", maxWidth: "90vw",
          overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {toast}
        </div>
      )}


      {/* ── Filtros de categoría ── */}
      {allCategories.length > 0 && (
        <div style={{
          padding: `12px ${px} 0`,
          display: "flex", gap: 8,
          overflowX: "auto", paddingBottom: 4,
          WebkitOverflowScrolling: "touch",
          msOverflowStyle: "none",
          scrollbarWidth: "none",
        }}>
          {["all", ...allCategories].map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCat(cat)}
              style={{
                padding: "7px 16px", borderRadius: 30,
                border: "1.5px solid",
                borderColor: filterCat === cat ? "#1a1a1a" : "#e2e8f0",
                background: filterCat === cat ? "#1a1a1a" : "#fff",
                color: filterCat === cat ? "#fff" : "#64748b",
                fontSize: 12, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
                flexShrink: 0, whiteSpace: "nowrap", minHeight: 36,
              }}
            >
              {cat === "all" ? "Todos" : cat}
            </button>
          ))}


          {/* Botón refresh manual */}
          <button
            onClick={fetchOrders}
            disabled={actionLoading}
            style={{
              marginLeft: "auto", padding: "7px 14px", borderRadius: 30,
              border: "1.5px solid #e2e8f0", background: "#fff",
              color: "#64748b", fontSize: 12, fontWeight: 600,
              cursor: actionLoading ? "not-allowed" : "pointer",
              fontFamily: "inherit", flexShrink: 0,
              display: "flex", alignItems: "center", gap: 4,
              minHeight: 36, opacity: actionLoading ? 0.5 : 1,
            }}
          >
            ↻ {isMobile ? "" : "Actualizar"}
          </button>
        </div>
      )}


      {/* ── Contenido principal ── */}
      <div style={{ padding: `16px ${px} 48px` }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 80, color: "#94a3b8" }}>
            <p style={{ fontSize: 32, margin: "0 0 12px" }}>👨‍🍳</p>
            <p style={{ fontSize: 15 }}>Cargando órdenes...</p>
          </div>
        ) : orders.length === 0 ? (
          <div style={{
            textAlign: "center", padding: isMobile ? 48 : 80,
            background: "#fff", borderRadius: 20,
            border: "2px dashed #e2e8f0",
          }}>
            <p style={{ fontSize: 48, margin: "0 0 12px" }}>🍽️</p>
            <p style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a", margin: "0 0 8px" }}>
              Sin órdenes activas
            </p>
            <p style={{ fontSize: 14, color: "#94a3b8", margin: 0 }}>
              Las órdenes nuevas aparecerán aquí automáticamente
            </p>
          </div>
        ) : isMobile ? (
          /* ── Vista mobile: tabs por estado ── */
          <MobileKanban
            columns={columns}
            onStatusChange={handleStatusChange}
            onItemToggle={handleItemToggle}
            actionLoading={actionLoading}
          />
        ) : (
          /* ── Grid kanban 3 columnas desktop ── */
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 20, alignItems: "start",
          }}>
            {columns.map(col => (
              <KanbanColumn
                key={col.key}
                col={col}
                onStatusChange={handleStatusChange}
                onItemToggle={handleItemToggle}
                actionLoading={actionLoading}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


// ─── Columna Kanban (desktop) ─────────────────────────────────────────────────
function KanbanColumn({ col, onStatusChange, onItemToggle, actionLoading }: {
  col: { key: string; title: string; orders: KitchenOrder[]; color: string; dot: string };
  onStatusChange: (orderId: string, status: OrderStatus) => Promise<void>;
  onItemToggle: (itemId: string, currentStatus: ItemStatus) => Promise<void>;
  actionLoading: boolean;
}) {
  return (
    <div>
      {/* Cabecera columna */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        marginBottom: 14, padding: "0 4px",
      }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: col.dot, flexShrink: 0 }} />
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#1a1a1a" }}>
          {col.title}
        </h2>
        <span style={{
          fontSize: 12, fontWeight: 700,
          background: col.color + "18", color: col.color,
          padding: "2px 10px", borderRadius: 20,
          border: `1px solid ${col.color}30`,
        }}>
          {col.orders.length}
        </span>
      </div>


      {/* Tarjetas */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {col.orders.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "32px 16px",
            background: "#fff", borderRadius: 12,
            border: "2px dashed #e2e8f0",
          }}>
            <p style={{ margin: 0, fontSize: 13, color: "#cbd5e1" }}>Sin órdenes</p>
          </div>
        ) : (
          col.orders.map(order => (
            <OrderCard
              key={order._id}
              order={order}
              onStatusChange={onStatusChange}
              onItemToggle={onItemToggle}
              loading={actionLoading}
            />
          ))
        )}
      </div>
    </div>
  );
}


// ─── Vista mobile: tabs por estado ───────────────────────────────────────────
function MobileKanban({ columns, onStatusChange, onItemToggle, actionLoading }: {
  columns: { key: string; title: string; orders: KitchenOrder[]; color: string; dot: string }[];
  onStatusChange: (orderId: string, status: OrderStatus) => Promise<void>;
  onItemToggle: (itemId: string, currentStatus: ItemStatus) => Promise<void>;
  actionLoading: boolean;
}) {
  const [activeTab, setActiveTab] = useState(0);
  const col = columns[activeTab];


  return (
    <div>
      {/* Tabs */}
      <div style={{
        display: "flex", gap: 0, marginBottom: 16,
        background: "#fff", borderRadius: 12,
        border: "1.5px solid #e2e8f0", overflow: "hidden",
      }}>
        {columns.map((c, i) => (
          <button
            key={c.key}
            onClick={() => setActiveTab(i)}
            style={{
              flex: 1, padding: "11px 8px",
              border: "none", borderRight: i < columns.length - 1 ? "1.5px solid #e2e8f0" : "none",
              background: activeTab === i ? c.color + "15" : "#fff",
              color: activeTab === i ? c.color : "#94a3b8",
              fontSize: 12, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit",
              display: "flex", flexDirection: "column",
              alignItems: "center", gap: 4,
              transition: "background 0.15s",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{
                width: 8, height: 8, borderRadius: "50%",
                background: activeTab === i ? c.color : "#e2e8f0",
              }} />
              <span>{c.title}</span>
            </div>
            <span style={{
              fontSize: 18, fontWeight: 800,
              color: activeTab === i ? c.color : "#94a3b8",
              lineHeight: 1,
            }}>
              {c.orders.length}
            </span>
          </button>
        ))}
      </div>


      {/* Tarjetas del tab activo */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {col.orders.length === 0 ? (
          <div style={{
            textAlign: "center", padding: 48,
            background: "#fff", borderRadius: 12,
            border: "2px dashed #e2e8f0",
          }}>
            <p style={{ margin: 0, fontSize: 13, color: "#cbd5e1" }}>Sin órdenes</p>
          </div>
        ) : (
          col.orders.map(order => (
            <OrderCard
              key={order._id}
              order={order}
              onStatusChange={onStatusChange}
              onItemToggle={onItemToggle}
              loading={actionLoading}
            />
          ))
        )}
      </div>
    </div>
  );
}
