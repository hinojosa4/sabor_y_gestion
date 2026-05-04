"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import type { AuthUser } from "@/lib/useAuth";

// ─── Types ────────────────────────────────────────────────────────
type TableStatus = "available" | "occupied" | "reserved";
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
  status: OrderStatus;
  table_id: string;
  table_number?: number | null; // ← agregar
  createdAt: string;
  total_amount: number;
  items: ActiveOrderItem[];
}

// ─── Constantes ───────────────────────────────────────────────────
const ALLOWED_ROLES: AuthUser["rol"][] = ["mesero", "admin"];

const TABLE_STATUS_CONFIG: Record<string, { label: string; bg: string; border: string; badgeBg: string; badgeColor: string; dot: string }> = {
  "Libre":              { label: "Libre",              bg: "#f0fdf4", border: "#bbf7d0", badgeBg: "#111",     badgeColor: "#fff",     dot: "#22c55e" },
  "Ocupada":            { label: "Ocupada",            bg: "#fff7ed", border: "#fed7aa", badgeBg: "#f3f4f6", badgeColor: "#374151", dot: "#f97316" },
  "Reservada":          { label: "Reservada",          bg: "#eff6ff", border: "#bfdbfe", badgeBg: "#3b82f6", badgeColor: "#fff",     dot: "#3b82f6" },
  "Cuenta solicitada":  { label: "Cuenta solicitada",  bg: "#fff7ed", border: "#fed7aa", badgeBg: "#ea580c", badgeColor: "#fff",     dot: "#ea580c" },
  "Activa":             { label: "Activa",             bg: "#f0fdf4", border: "#bbf7d0", badgeBg: "#111",     badgeColor: "#fff",     dot: "#22c55e" },
  "Inactiva":           { label: "Inactiva",           bg: "#f9fafb", border: "#e5e7eb", badgeBg: "#e5e7eb", badgeColor: "#6b7280", dot: "#9ca3af" },
};

const ORDER_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:    { label: "Pendiente",    color: "#d97706", bg: "#fef3c7" },
  in_kitchen: { label: "En Cocina",    color: "#2563eb", bg: "#dbeafe" },
  ready:      { label: "Listo",        color: "#16a34a", bg: "#dcfce7" },
  delivered:  { label: "Entregado",    color: "#7c3aed", bg: "#ede9fe" },
  paid:       { label: "Pagado",       color: "#374151", bg: "#f3f4f6" },
  cancelled:  { label: "Cancelado",    color: "#dc2626", bg: "#fee2e2" },
};

// ─── Hook: tiempo transcurrido ────────────────────────────────────
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

// ─── Componente: Tarjeta de mesa ──────────────────────────────────
function TableCard({ table, onClick }: { table: Table; onClick: () => void }) {
  const cfg = TABLE_STATUS_CONFIG[table.status] ?? TABLE_STATUS_CONFIG["Libre"];
  const isClickable = !["Reservada", "Inactiva"].includes(table.status);

  return (
    <div
      onClick={isClickable ? onClick : undefined}
      style={{
        background: cfg.bg,
        border: `1.5px solid ${cfg.border}`,
        borderRadius: 16,
        padding: "24px 16px 20px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        cursor: isClickable ? "pointer" : "default",
        transition: "transform 0.15s, box-shadow 0.15s",
        position: "relative",
        minHeight: 160,
        justifyContent: "center",
      }}
      onMouseEnter={e => {
        if (isClickable) {
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
          (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)";
        }
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.transform = "none";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
      }}
    >
      {/* Ícono personas */}
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={table.status === "reserved" ? "#94a3b8" : "#374151"} strokeWidth="1.5">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>

      <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: table.status === "reserved" ? "#94a3b8" : "#111" }}>
        Mesa {table.number}
      </p>
      <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>{table.seats} personas</p>
      {table.location && (
        <p style={{ margin: 0, fontSize: 11, color: "#9ca3af", display: "flex", alignItems: "center", gap: 4 }}>
          <span>📍</span> {table.location}
        </p>
      )}

      {/* Badge estado */}
      <span style={{
        marginTop: 4,
        padding: "4px 14px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 700,
        background: cfg.badgeBg,
        color: cfg.badgeColor,
      }}>
        {cfg.label}
      </span>
    </div>
  );
}

// ─── Componente: Orden activa ─────────────────────────────────────
function ActiveOrderCard({
  order,
  onMarkServed,
  loading,
}: {
  order: ActiveOrder;
  onMarkServed: (orderId: string) => void;
  loading: boolean;
}) {
  const elapsed = useElapsed(order.createdAt);
  const statusCfg = ORDER_STATUS_CONFIG[order.status] ?? ORDER_STATUS_CONFIG.pending;
  const tableNum = order.table_number ?? order.table_id;
  const isReady = order.status === "ready";

  return (
    <div style={{
      border: `1.5px solid ${isReady ? "#86efac" : "#e5e7eb"}`,
      borderRadius: 14,
      overflow: "hidden",
      background: "#fff",
      boxShadow: isReady ? "0 0 0 3px rgba(34,197,94,0.1)" : "none",
      transition: "box-shadow 0.2s",
    }}>
      {/* Header */}
      <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #f3f4f6" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "#fff7ed", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 18 }}>📋</span>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#111" }}>Mesa {tableNum}</p>
            <p style={{ margin: 0, fontSize: 11, color: "#9ca3af" }}>{elapsed}</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: statusCfg.color, background: statusCfg.bg, padding: "3px 10px", borderRadius: 20 }}>
            {statusCfg.label}
          </span>
          <span style={{ fontSize: 15, fontWeight: 800, color: "#111" }}>
            ${order.total_amount?.toFixed(2) ?? "0.00"}
          </span>
        </div>
      </div>

      {/* Items */}
      <div style={{ padding: "12px 16px" }}>
        {order.items?.map(item => (
          <div key={item._id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#374151", marginBottom: 4 }}>
            <span>{item.quantity}x {item.dish_id?.name ?? "Plato"}</span>
            <span style={{ color: "#6b7280" }}>${(item.unit_price * item.quantity).toFixed(2)}</span>
          </div>
        ))}
      </div>

      {/* CTA si está listo */}
      {isReady && (
        <div style={{ padding: "0 16px 14px" }}>
          <button
            onClick={() => onMarkServed(order._id)}
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: 10,
              border: "none",
              background: loading ? "#94a3b8" : "#111",
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            ✓ Marcar como Servido
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Componente: Modal nueva orden ────────────────────────────────
function OrderModal({
  table,
  onClose,
  onOrderCreated,
}: {
  table: Table;
  onClose: () => void;
  onOrderCreated: () => void;
}) {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCat, setSelectedCat] = useState<string>("all");
  const [cart, setCart] = useState<OrderItemLocal[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const overlayRef = useRef<HTMLDivElement>(null);

  // Cerrar al click fuera
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dishRes, catRes] = await Promise.all([
          fetch("/api/dishes"),
          fetch("/api/categories"),
        ]);
        const dishData = await dishRes.json();
        const catData = await catRes.json();
        if (dishData.ok) setDishes(dishData.data.filter((d: Dish) => d.isAvailable));
        if (catData.ok) setCategories(catData.data);
      } catch {
        setError("Error al cargar el menú");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredDishes = selectedCat === "all"
    ? dishes
    : dishes.filter(d => d.category_id?._id === selectedCat);

  const addToCart = (dish: Dish) => {
    setCart(prev => {
      const existing = prev.find(i => i.dish._id === dish._id);
      if (existing) return prev.map(i => i.dish._id === dish._id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { dish, quantity: 1, notes: "" }];
    });
  };

  const removeFromCart = (dishId: string) => {
    setCart(prev => {
      const existing = prev.find(i => i.dish._id === dishId);
      if (!existing) return prev;
      if (existing.quantity <= 1) return prev.filter(i => i.dish._id !== dishId);
      return prev.map(i => i.dish._id === dishId ? { ...i, quantity: i.quantity - 1 } : i);
    });
  };

  const getQty = (dishId: string) => cart.find(i => i.dish._id === dishId)?.quantity ?? 0;
  const total = cart.reduce((sum, i) => sum + i.dish.price * i.quantity, 0);

  const handleSubmit = async () => {
  if (cart.length === 0) { setError("Agrega al menos un platillo"); return; }
  setSubmitting(true);
  setError("");
  try {
    const token = localStorage.getItem("token");
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        table_id: table._id,
        service_type: "dine_in",
        items: cart.map(i => ({
          dish_id: i.dish._id,
          quantity: i.quantity,
          unit_price: i.dish.price,
          notes: i.notes || undefined,
        })),
      }),
    });
    const data = await res.json();
    if (!data.ok) { setError(data.message || "Error al crear la orden"); return; }
    onOrderCreated();
    onClose();
  } catch {
    setError("Error de conexión. Intenta de nuevo.");
  } finally {
    setSubmitting(false);
  }
};

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
    >
      <div style={{
        background: "#fff",
        borderRadius: 20,
        width: "100%",
        maxWidth: 760,
        maxHeight: "90vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
      }}>
        {/* Header modal */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#111" }}>
              Nueva Orden — Mesa {table.number}
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6b7280" }}>
              Selecciona los platillos y envía la orden a cocina
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: "50%", border: "1.5px solid #e5e7eb", background: "#fff", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280", flexShrink: 0 }}
          >×</button>
        </div>

        {/* Body — dos columnas */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Izquierda: menú */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", borderRight: "1px solid #f3f4f6", overflow: "hidden" }}>
            {/* Título columna */}
            <div style={{ padding: "16px 20px 8px" }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#111" }}>Menú Disponible</p>
            </div>

            {/* Filtros de categoría */}
            <div style={{ padding: "0 20px 12px", display: "flex", gap: 8, overflowX: "auto", flexShrink: 0 }}>
              <button
                onClick={() => setSelectedCat("all")}
                style={{
                  padding: "6px 16px", borderRadius: 20,
                  border: "1.5px solid", borderColor: selectedCat === "all" ? "#111" : "#e5e7eb",
                  background: selectedCat === "all" ? "#111" : "#fff",
                  color: selectedCat === "all" ? "#fff" : "#6b7280",
                  fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
                }}
              >Todos</button>
              {categories.map(cat => (
                <button
                  key={cat._id}
                  onClick={() => setSelectedCat(cat._id)}
                  style={{
                    padding: "6px 16px", borderRadius: 20,
                    border: "1.5px solid", borderColor: selectedCat === cat._id ? "#111" : "#e5e7eb",
                    background: selectedCat === cat._id ? "#111" : "#fff",
                    color: selectedCat === cat._id ? "#fff" : "#6b7280",
                    fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
                  }}
                >{cat.name}</button>
              ))}
            </div>

            {/* Lista de platillos */}
            <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
              {loading ? (
                <p style={{ color: "#9ca3af", fontSize: 13, textAlign: "center", padding: 32 }}>Cargando menú...</p>
              ) : filteredDishes.length === 0 ? (
                <p style={{ color: "#9ca3af", fontSize: 13, textAlign: "center", padding: 32 }}>Sin platillos en esta categoría</p>
              ) : filteredDishes.map(dish => {
                const qty = getQty(dish._id);
                return (
                  <div key={dish._id} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px", borderRadius: 12, border: "1.5px solid #f3f4f6",
                    background: qty > 0 ? "#f0fdf4" : "#fff",
                    transition: "background 0.15s",
                  }}>
                    {/* Imagen o placeholder */}
                    <div style={{
                      width: 64, height: 64, borderRadius: 10, flexShrink: 0,
                      background: dish.image_url ? "transparent" : "#f3f4f6",
                      overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {dish.image_url
                        ? <img src={dish.image_url} alt={dish.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <span style={{ fontSize: 24 }}>🍽</span>
                      }
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#111" }}>{dish.name}</p>
                      {dish.description && (
                        <p style={{ margin: "2px 0 0", fontSize: 11, color: "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{dish.description}</p>
                      )}
                      <p style={{ margin: "4px 0 0", fontSize: 14, fontWeight: 700, color: "#ea580c" }}>${dish.price.toFixed(2)}</p>
                    </div>

                    {/* Controles cantidad */}
                    {qty === 0 ? (
                      <button
                        onClick={() => addToCart(dish)}
                        style={{
                          width: 32, height: 32, borderRadius: "50%", border: "none",
                          background: "#ea580c", color: "#fff", fontSize: 20, cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                        }}
                      >+</button>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                        <button onClick={() => removeFromCart(dish._id)} style={{ width: 28, height: 28, borderRadius: "50%", border: "1.5px solid #e5e7eb", background: "#fff", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                        <span style={{ fontSize: 14, fontWeight: 700, minWidth: 20, textAlign: "center" }}>{qty}</span>
                        <button onClick={() => addToCart(dish)} style={{ width: 28, height: 28, borderRadius: "50%", border: "none", background: "#ea580c", color: "#fff", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Derecha: orden actual */}
          <div style={{ width: 280, display: "flex", flexDirection: "column", flexShrink: 0 }}>
            <div style={{ padding: "16px 20px 8px" }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#111" }}>Orden Actual</p>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "0 20px" }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px 16px", border: "2px dashed #e5e7eb", borderRadius: 12, color: "#d1d5db" }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>📋</div>
                  <p style={{ margin: 0, fontSize: 13 }}>Selecciona platillos del menú</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {cart.map(item => (
                    <div key={item.dish._id} style={{ padding: "10px 12px", background: "#f9fafb", borderRadius: 10, border: "1px solid #f3f4f6" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#111" }}>{item.quantity}x {item.dish.name}</p>
                          <p style={{ margin: "2px 0 0", fontSize: 12, color: "#ea580c", fontWeight: 600 }}>${(item.dish.price * item.quantity).toFixed(2)}</p>
                        </div>
                        <button
                          onClick={() => setCart(prev => prev.filter(i => i.dish._id !== item.dish._id))}
                          style={{ border: "none", background: "none", cursor: "pointer", color: "#9ca3af", fontSize: 14, padding: "0 0 0 8px" }}
                        >✕</button>
                      </div>
                      {/* Notas */}
                      <input
                        type="text"
                        placeholder="Notas (opcional)..."
                        value={item.notes}
                        onChange={e => setCart(prev => prev.map(i => i.dish._id === item.dish._id ? { ...i, notes: e.target.value } : i))}
                        style={{
                          marginTop: 6, width: "100%", padding: "5px 8px", fontSize: 11,
                          border: "1px solid #e5e7eb", borderRadius: 6, outline: "none",
                          color: "#374151", boxSizing: "border-box",
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Total + enviar */}
            <div style={{ padding: "16px 20px", borderTop: "1px solid #f3f4f6" }}>
              {error && (
                <p style={{ margin: "0 0 10px", fontSize: 12, color: "#dc2626", background: "#fef2f2", padding: "8px 10px", borderRadius: 8 }}>{error}</p>
              )}
              {cart.length > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <span style={{ fontSize: 13, color: "#6b7280" }}>Total</span>
                  <span style={{ fontSize: 16, fontWeight: 800, color: "#111" }}>${total.toFixed(2)}</span>
                </div>
              )}
              <button
                onClick={handleSubmit}
                disabled={submitting || cart.length === 0}
                style={{
                  width: "100%", padding: "13px", borderRadius: 12, border: "none",
                  background: cart.length === 0 ? "#e5e7eb" : submitting ? "#94a3b8" : "#ea580c",
                  color: cart.length === 0 ? "#9ca3af" : "#fff",
                  fontSize: 14, fontWeight: 700, cursor: cart.length === 0 || submitting ? "not-allowed" : "pointer",
                  transition: "background 0.15s",
                }}
              >
                {submitting ? "Enviando..." : "Enviar a Cocina"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page principal ───────────────────────────────────────────────
export default function MeseroPage() {
  const router = useRouter();
  const { user, loading: userLoading, logout } = useAuth(ALLOWED_ROLES);

  const [tables, setTables] = useState<Table[]>([]);
  const [activeOrders, setActiveOrders] = useState<ActiveOrder[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [toast, setToast] = useState("");

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [tablesRes, ordersRes] = await Promise.all([
        fetch("/api/tables"),
        fetch("/api/orders/active"),
      ]);
      const tablesRaw = await tablesRes.json();
      const ordersData = await ordersRes.json();

      // Tu /api/tables devuelve el array directo, no { ok, data }
      const tablesArray = Array.isArray(tablesRaw) ? tablesRaw : [];
      setTables(tablesArray);

      if (ordersData.ok) setActiveOrders(ordersData.data);
    } catch {
      // silencioso en polling
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (userLoading || !user) return;
    fetchData();
    const interval = setInterval(fetchData, 10000); // polling cada 10s
    return () => clearInterval(interval);
  }, [userLoading, user, fetchData]);

  const handleMarkServed = async (orderId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/Kitchen", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, newStatus: "delivered" }),
      });
      const data = await res.json();
      if (!data.ok) { showToast("❌ " + data.message); return; }
      showToast("✓ Orden marcada como entregada");
      await fetchData();
    } catch {
      showToast("❌ Error al actualizar");
    } finally {
      setActionLoading(false);
    }
  };

  // Stats
  const occupiedCount = tables.filter(t => ["Ocupada", "Cuenta solicitada"].includes(t.status)).length;
  const reservedCount = tables.filter(t => t.status === "Reservada").length;
  const availableCount = tables.filter(t => ["Libre", "Activa"].includes(t.status)).length;
  const activeOrdersCount = activeOrders.filter(o => ["pending", "in_kitchen"].includes(o.status)).length;
  const readyCount = activeOrders.filter(o => o.status === "ready").length;

  if (userLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif" }}>
        <p style={{ color: "#6b7280", fontSize: 14 }}>Verificando sesión...</p>
      </div>
    );
  }
  if (!user) return null;

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "'Georgia', serif" }}>
      {/* ── Header ── */}
      <div style={{
        background: "#fff",
        borderBottom: "1.5px solid #f3f4f6",
        padding: "14px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 100,
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "#ea580c", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
            🍽
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#111" }}>Panel de Mesero</p>
            <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>Gestión de Mesas y Órdenes</p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ textAlign: "right" }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#111" }}>{user.name}</p>
            <p style={{ margin: 0, fontSize: 11, color: "#9ca3af" }}>Mesero</p>
          </div>
          <button
            onClick={() => logout()}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 14px", borderRadius: 10,
              border: "1.5px solid #e5e7eb", background: "#fff",
              fontSize: 13, fontWeight: 600, color: "#374151",
              cursor: "pointer",
            }}
          >
            <span>→</span> Salir
          </button>
        </div>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
          zIndex: 9999, background: "#111", color: "#fff",
          padding: "12px 24px", borderRadius: 10, fontSize: 13, fontWeight: 600,
          boxShadow: "0 8px 32px rgba(0,0,0,0.25)", whiteSpace: "nowrap",
        }}>
          {toast}
        </div>
      )}

      {/* ── Contenido ── */}
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 24px 48px", display: "flex", gap: 24, alignItems: "flex-start" }}>
        {/* Columna izquierda: mesas + órdenes activas */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Mesas */}
          <div style={{ background: "#fff", borderRadius: 20, border: "1.5px solid #f3f4f6", padding: "24px", marginBottom: 24 }}>
            <h2 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 800, color: "#111" }}>Mesas del Restaurante</h2>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: "#9ca3af" }}>Selecciona una mesa para tomar una orden</p>

            {loadingData ? (
              <p style={{ color: "#9ca3af", fontSize: 13, textAlign: "center", padding: 32 }}>Cargando mesas...</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14 }}>
                {tables.map(table => (
                  <TableCard
                    key={table._id}
                    table={table}
                    onClick={() => setSelectedTable(table)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Órdenes activas */}
          {activeOrders.filter(o => !["paid", "cancelled", "delivered"].includes(o.status)).length > 0 && (
            <div style={{ background: "#fff", borderRadius: 20, border: "1.5px solid #f3f4f6", padding: "24px" }}>
              <h2 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 800, color: "#111" }}>Órdenes Activas</h2>
              <p style={{ margin: "0 0 20px", fontSize: 13, color: "#9ca3af" }}>Seguimiento de órdenes en proceso</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {activeOrders
                  .filter(o => !["paid", "cancelled", "delivered"].includes(o.status))
                  .map(order => (
                    <ActiveOrderCard
                      key={order._id}
                      order={order}
                      onMarkServed={handleMarkServed}
                      loading={actionLoading}
                    />
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar derecha */}
        <div style={{ width: 280, flexShrink: 0, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Resumen del turno */}
          <div style={{ background: "#fff", borderRadius: 20, border: "1.5px solid #f3f4f6", padding: "20px 24px" }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 800, color: "#111" }}>Resumen del Turno</h3>
            {[
              { label: "Mesas Ocupadas", value: `${occupiedCount}/${tables.length}`, color: "#111" },
              { label: "Órdenes Activas", value: activeOrdersCount, color: "#111" },
              { label: "Listas para Servir", value: readyCount, color: readyCount > 0 ? "#16a34a" : "#111" },
            ].map(item => (
              <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f9fafb" }}>
                <span style={{ fontSize: 13, color: "#6b7280" }}>{item.label}</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: item.color }}>{item.value}</span>
              </div>
            ))}
          </div>

          {/* Estado de mesas */}
          <div style={{ background: "#fff", borderRadius: 20, border: "1.5px solid #f3f4f6", padding: "20px 24px" }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 800, color: "#111" }}>Estado de Mesas</h3>
            {[
              { label: `Disponible (${availableCount})`, dot: "#22c55e" },
              { label: `Ocupada (${occupiedCount})`, dot: "#f97316" },
              { label: `Reservada (${reservedCount})`, dot: "#3b82f6" },
            ].map(item => (
              <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: item.dot, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: "#374151" }}>{item.label}</span>
              </div>
            ))}
          </div>

          {/* Botón ir a dashboard */}
          <button
            onClick={() => router.push("/dashboard")}
            style={{
              width: "100%", padding: "12px", borderRadius: 12,
              border: "1.5px solid #e5e7eb", background: "#fff",
              fontSize: 13, fontWeight: 600, color: "#374151",
              cursor: "pointer",
            }}
          >
            ← Volver al Dashboard
          </button>
        </div>
      </div>

      {/* ── Modal nueva orden ── */}
      {selectedTable && (
        <OrderModal
          table={selectedTable}
          onClose={() => setSelectedTable(null)}
          onOrderCreated={() => {
            showToast("✓ Orden enviada a cocina");
            fetchData();
          }}
        />
      )}
    </div>
  );
}