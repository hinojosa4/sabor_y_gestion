"use client";

import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { CLIENTE } from "@/lib/roles";
import { getPusherClient } from "@/lib/pusherClient";
import { DeliveryHeader } from "@/components/clientScreen/delivery/DeliveryHeader";
import { DeliveryEstimateBanner } from "@/components/clientScreen/delivery/DeliveryEstimateBanner";
import { CategoryTabs } from "@/components/clientScreen/delivery/CategoryTabs";
import { DishCard, Dish } from "@/components/clientScreen/delivery/DishCard";
import { OrderCart, CartItem } from "@/components/clientScreen/delivery/OrderCart";

// ── Tipos ──────────────────────────────────────────────────────────────────────

interface ApiCategory { _id: string; name: string; isActive: boolean; }
interface ApiDish {
  _id: string; name: string; description?: string; price: number;
  category_id: string | { _id: string; name: string } | null;
  isAvailable: boolean; image_url?: string;
}

type PaymentMethod = "Efectivo" | "QR / Transferencia";
const PAYMENT_METHODS: PaymentMethod[] = ["Efectivo", "QR / Transferencia"];

const BG_COLORS = [
  "#fde68a","#fecaca","#bbf7d0","#fed7aa",
  "#e9d5ff","#fbcfe8","#fef08a","#fcd34d","#a7f3d0","#bfdbfe",
];
function bgForIndex(i: number) { return BG_COLORS[i % BG_COLORS.length]; }

function categoryNameOf(dish: ApiDish, categories: ApiCategory[]): string {
  if (!dish.category_id) return "Sin categoría";
  const id = typeof dish.category_id === "string" ? dish.category_id : dish.category_id._id;
  return categories.find((c) => c._id === id)?.name ?? "Sin categoría";
}

// ── Componente ─────────────────────────────────────────────────────────────────

export default function DeliveryPage() {
  const router = useRouter();
  const { loading: authLoading, logout } = useAuth(CLIENTE);

  const [categories, setCategories]   = useState<ApiCategory[]>([]);
  const [apiDishes, setApiDishes]     = useState<ApiDish[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadError, setLoadError]     = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [cart, setCart]         = useState<CartItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [toastMsg, setToastMsg]     = useState<string | null>(null);
  const [toastType, setToastType]   = useState<"success" | "info">("success");

  const [showOrderForm, setShowOrderForm]   = useState(false);
  const [address, setAddress]               = useState("");
  const [phone, setPhone]                   = useState("");
  const [paymentMethod, setPaymentMethod]   = useState<PaymentMethod>("Efectivo");
  const [notes, setNotes]                   = useState("");
  const [lastOrderId, setLastOrderId]       = useState<string | null>(null);

  // ── Carga de datos ────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoadingData(true);
    setLoadError(null);
    try {
      const [catRes, dishRes] = await Promise.all([fetch("/api/categories"), fetch("/api/dishes")]);
      const [catJson, dishJson] = await Promise.all([catRes.json(), dishRes.json()]);
      if (!catJson.ok) throw new Error(catJson.message ?? "Error al cargar categorías");
      if (!dishJson.ok) throw new Error(dishJson.message ?? "Error al cargar platos");
      setCategories((catJson.data ?? catJson).filter((c: ApiCategory) => c.isActive));
      setApiDishes((dishJson.data ?? dishJson).filter((d: ApiDish) => d.isAvailable));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Error de red");
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => { if (!authLoading) loadData(); }, [authLoading, loadData]);

  // ── Pusher: escuchar cambios de estado de MI última orden ─────────────────────
  useEffect(() => {
    if (!lastOrderId) return;

    const STATUS_LABELS: Record<string, string> = {
      in_kitchen: "🍳 Tu pedido está en cocina",
      ready:      "✅ Tu pedido está listo",
      picked_up:  "🛵 El repartidor recogió tu pedido",
      in_transit: "🚗 Tu pedido está en camino",
      delivered:  "🎉 ¡Tu pedido fue entregado!",
      cancelled:  "❌ Tu pedido fue cancelado",
    };

    const handleStatusUpdate = (data: { orderId: string; status: string }) => {
      if (data.orderId !== lastOrderId) return;
      const label = STATUS_LABELS[data.status];
      if (label) {
        setToastMsg(label);
        setToastType(data.status === "cancelled" ? "info" : "success");
        setTimeout(() => setToastMsg(null), 5000);
      }
      if (data.status === "delivered" || data.status === "cancelled") {
        setTimeout(() => setLastOrderId(null), 6000);
      }
    };

    const handleKitchenUpdate = (data: { orderId: string; newStatus: string }) => {
      handleStatusUpdate({ orderId: data.orderId, status: data.newStatus });
    };

    let cancelled = false;

    getPusherClient().then((client) => {
      if (cancelled) return;
      const channel = client.subscribe("restaurant");
      const deliveryChannel = client.subscribe("delivery");

      channel.bind("order:status_updated", handleStatusUpdate);
      channel.bind("order:updated", handleKitchenUpdate);
      deliveryChannel.bind("order:status_updated", handleStatusUpdate);
      deliveryChannel.bind("order:updated", handleKitchenUpdate);
    });

    return () => {
      cancelled = true;
      getPusherClient().then((client) => {
        client.unsubscribe("restaurant");
        client.unsubscribe("delivery");
      });
    };
  }, [lastOrderId]);

  // ── Mapeos ────────────────────────────────────────────────────────────────────
  const dishes: Dish[] = useMemo(() =>
    apiDishes.map((d, i) => ({
      id: d._id, name: d.name, description: d.description ?? "",
      price: d.price, category: categoryNameOf(d, categories),
      image_url: d.image_url?.trim() || undefined, bgColor: bgForIndex(i),
    })),
    [apiDishes, categories]
  );

  const categoryNames = useMemo(() => ["Todos", ...categories.map((c) => c.name)], [categories]);

  const filteredDishes = useMemo(() =>
    selectedCategory === "Todos" ? dishes : dishes.filter((d) => d.category === selectedCategory),
    [dishes, selectedCategory]
  );

  const cartTotal = cart.reduce((s, it) => s + it.dish.price * it.quantity, 0);

  // ── Carrito ───────────────────────────────────────────────────────────────────
  const handleAdd = (dish: Dish) =>
    setCart((prev) => {
      const ex = prev.find((it) => it.dish.id === dish.id);
      return ex
        ? prev.map((it) => it.dish.id === dish.id ? { ...it, quantity: it.quantity + 1 } : it)
        : [...prev, { dish, quantity: 1 }];
    });

  const handleIncrement = (id: string) =>
    setCart((prev) => prev.map((it) => it.dish.id === id ? { ...it, quantity: it.quantity + 1 } : it));

  const handleDecrement = (id: string) =>
    setCart((prev) =>
      prev.map((it) => it.dish.id === id ? { ...it, quantity: it.quantity - 1 } : it)
          .filter((it) => it.quantity > 0)
    );

  const handleRemove = (id: string) => setCart((prev) => prev.filter((it) => it.dish.id !== id));

  // ── Confirmar orden ───────────────────────────────────────────────────────────
  const handleConfirmOrder = async () => {
    if (!address.trim()) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/orders/cliente", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          service_type: "delivery",
          delivery_address: address.trim(),
          delivery_phone: phone.trim() || undefined,
          payment_method: paymentMethod,
          notes: notes.trim() || undefined,
          items: cart.map((it) => ({
            dish_id: it.dish.id, quantity: it.quantity, unit_price: it.dish.price,
          })),
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message ?? "Error al crear orden");

      setLastOrderId(json.data.order._id);
      setCart([]); setAddress(""); setPhone(""); setNotes(""); setPaymentMethod("Efectivo");
      setShowOrderForm(false);
      setToastMsg("✅ ¡Pedido enviado! Te avisaremos cuando esté en camino.");
      setToastType("success");
      setTimeout(() => setToastMsg(null), 5000);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al enviar la orden");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) return <main style={s.main}><div style={s.centered}>Verificando sesión…</div></main>;

  return (
    <main style={s.main}>
      <DeliveryHeader onComerEnRestaurante={() => router.push("/dashboard/cliente")} onLogout={logout} />

      {toastMsg && (
        <div style={{ ...s.toast, ...(toastType === "info" ? s.toastInfo : {}) }}>
          {toastMsg}
        </div>
      )}

      <div style={s.layout}>
        <div style={s.menuColumn}>
          <DeliveryEstimateBanner />
          {loadingData ? (
            <div style={s.centered}>Cargando menú…</div>
          ) : loadError ? (
            <div style={s.errorBox}>
              <p>{loadError}</p>
              <button style={s.retryBtn} onClick={loadData}>Reintentar</button>
            </div>
          ) : (
            <>
              <CategoryTabs categories={categoryNames} selected={selectedCategory} onSelect={setSelectedCategory} />
              {filteredDishes.length === 0 ? (
                <div style={s.centered}>No hay platos en esta categoría.</div>
              ) : (
                <div style={s.dishGrid}>
                  {filteredDishes.map((dish) => <DishCard key={dish.id} dish={dish} onAdd={handleAdd} />)}
                </div>
              )}
            </>
          )}
        </div>

        <aside style={s.sidebar}>
          <OrderCart
            items={cart}
            onIncrement={handleIncrement}
            onDecrement={handleDecrement}
            onRemove={handleRemove}
            onCheckout={() => cart.length > 0 && setShowOrderForm(true)}
          />
        </aside>
      </div>

      {showOrderForm && (
        <div style={s.overlay} onClick={() => !submitting && setShowOrderForm(false)}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={s.modalTitle}>Confirmar pedido</h3>

            <div style={s.summaryBox}>
              <span style={s.summaryText}>{cart.length} producto{cart.length !== 1 ? "s" : ""}</span>
              <span style={s.summaryTotal}>${cartTotal.toFixed(2)}</span>
            </div>

            <label style={s.label}>Dirección de entrega *</label>
            <input
              style={s.input}
              placeholder="Ej: Av. Heroínas 123, Zona Centro"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={submitting}
            />

            <label style={s.label}>Teléfono de contacto (opcional)</label>
            <input
              style={s.input}
              placeholder="Ej: +591 70000000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={submitting}
            />

            <label style={s.label}>Forma de pago *</label>
            <div style={s.paymentGrid}>
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  disabled={submitting}
                  onClick={() => setPaymentMethod(m)}
                  style={{
                    ...s.paymentBtn,
                    ...(paymentMethod === m ? s.paymentBtnActive : {}),
                  }}
                >
                  {m === "Efectivo" ? "💵 Efectivo" : "📱 QR / Transferencia"}
                </button>
              ))}
            </div>

            <label style={s.label}>Notas adicionales (opcional)</label>
            <textarea
              style={s.textarea}
              placeholder="Ej: Sin cebolla, tocar timbre piso 3…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              disabled={submitting}
            />

            <div style={s.modalActions}>
              <button style={s.cancelBtn} onClick={() => setShowOrderForm(false)} disabled={submitting}>
                Cancelar
              </button>
              <button
                style={{ ...s.confirmBtn, opacity: !address.trim() || submitting ? 0.6 : 1 }}
                onClick={handleConfirmOrder}
                disabled={!address.trim() || submitting}
              >
                {submitting ? "Enviando…" : "Confirmar pedido"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// ── Estilos ────────────────────────────────────────────────────────────────────

const s: { [k: string]: React.CSSProperties } = {
  main:        { minHeight: "100vh", backgroundColor: "#f9fafb", display: "flex", flexDirection: "column" },
  layout:      { display: "grid", gridTemplateColumns: "minmax(0,1fr) 360px", gap: "1.5rem", padding: "1.5rem 2rem", alignItems: "flex-start" },
  menuColumn:  { display: "flex", flexDirection: "column", gap: "1rem", minWidth: 0 },
  dishGrid:    { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: "1rem" },
  sidebar:     { display: "flex", flexDirection: "column", gap: "1rem", position: "sticky", top: "1rem" },
  centered:    { textAlign: "center", padding: "3rem", color: "#6b7280" },
  errorBox:    { padding: "1.5rem", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, textAlign: "center", color: "#b91c1c", display: "flex", flexDirection: "column", gap: "0.75rem", alignItems: "center" },
  retryBtn:    { backgroundColor: "#f97316", color: "#fff", border: "none", borderRadius: 8, padding: "0.5rem 1.25rem", fontWeight: 600, cursor: "pointer" },
  toast:       { margin: "1rem 2rem 0", padding: "0.85rem 1.25rem", backgroundColor: "#ecfdf5", border: "1px solid #6ee7b7", borderRadius: 10, color: "#065f46", fontWeight: 600, fontSize: "0.95rem" },
  toastInfo:   { backgroundColor: "#fef3c7", border: "1px solid #fcd34d", color: "#92400e" },
  overlay:     { position: "fixed", inset: 0, backgroundColor: "rgba(17,24,39,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" },
  modal:       { backgroundColor: "#fff", borderRadius: 16, width: "100%", maxWidth: 480, padding: "1.75rem", display: "flex", flexDirection: "column", gap: "0.75rem", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", maxHeight: "90vh", overflowY: "auto" },
  modalTitle:  { margin: 0, fontSize: "1.25rem", fontWeight: 700, color: "#111827" },
  summaryBox:  { display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 8, padding: "0.65rem 1rem" },
  summaryText: { margin: 0, fontSize: "0.875rem", color: "#92400e" },
  summaryTotal:{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#f97316" },
  label:       { fontSize: "0.85rem", fontWeight: 600, color: "#374151", marginTop: "0.25rem" },
  input:       { width: "100%", padding: "0.65rem 0.9rem", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: "0.95rem", color: "#111827", outline: "none", boxSizing: "border-box" },
  textarea:    { width: "100%", padding: "0.65rem 0.9rem", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: "0.9rem", color: "#111827", outline: "none", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" },
  paymentGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" },
  paymentBtn:  { padding: "0.85rem 0.5rem", borderRadius: 10, borderWidth: "1.5px", borderStyle: "solid", borderColor: "#e5e7eb", backgroundColor: "#f9fafb", color: "#374151", fontSize: "0.9rem", fontWeight: 500, cursor: "pointer", textAlign: "center" },
  paymentBtnActive: { backgroundColor: "#fff7ed", borderColor: "#f97316", color: "#f97316", fontWeight: 700 },
  modalActions:{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginTop: "0.25rem" },
  cancelBtn:   { backgroundColor: "#fff", color: "#111827", border: "1px solid #e5e7eb", borderRadius: 10, padding: "0.75rem", fontWeight: 600, cursor: "pointer", fontSize: "0.95rem" },
  confirmBtn:  { backgroundColor: "#f97316", color: "#fff", border: "none", borderRadius: 10, padding: "0.75rem", fontWeight: 600, cursor: "pointer", fontSize: "0.95rem" },
};