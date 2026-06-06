"use client";

// src/app/dashboard/cliente/delivery/page.tsx

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
import { haversineKm, calcDeliveryFee, DELIVERY_CONFIG } from "@/lib/deliveryConfig";
import dynamic from "next/dynamic";
import { FacturaFinal } from "@/components/caja/FacturaFinal";

// ── Tipos ──────────────────────────────────────────────────────────────────────
const DeliveryMap = dynamic(
  () => import("@/components/clientScreen/delivery/DeliveryMap").then(m => m.DeliveryMap),
  { ssr: false, loading: () => <div style={{ height: 240, background: "#f3f4f6", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: "0.85rem" }}>Cargando mapa…</div> }
);

interface ApiCategory { _id: string; name: string; isActive: boolean; }
interface ApiDish {
  _id: string; name: string; description?: string; price: number;
  category_id: string | { _id: string; name: string } | null;
  isAvailable: boolean; image_url?: string;
  hasStock?: boolean;
}

type PaymentMethod = "Efectivo" | "QR / Transferencia";
const PAYMENT_METHODS: PaymentMethod[] = ["Efectivo", "QR / Transferencia"];

type DeliveryLoyalty = {
  tier: { name: string };
  discountPercent: number;
};

// Estado del proceso de geolocalización
type GeoStatus =
  | "idle"          // sin iniciar
  | "requesting"    // solicitando permiso al navegador
  | "locating"      // obteniendo coordenadas
  | "done"          // coordenadas obtenidas, fee calculado
  | "out_of_range"  // fuera del radio de 4 km
  | "denied"        // permiso denegado
  | "error";        // error genérico

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

  const [showFactura, setShowFactura]     = useState(false);
  const [facturaData, setFacturaData]     = useState<{
    orderId: string;
    items: { dish: { name: string; price: number }; quantity: number; subtotal: number }[];
    total: number;
    subtotal: number;
    discountAmount: number;
    discountPercent: number;
    loyaltyTierName: string | null;
    deliveryFeeAmount: number;
  } | null>(null);
  const [categories, setCategories]   = useState<ApiCategory[]>([]);
  const [apiDishes, setApiDishes]     = useState<ApiDish[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadError, setLoadError]     = useState<string | null>(null);
  const [loyalty, setLoyalty]         = useState<DeliveryLoyalty | null>(null);

  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [cart, setCart]         = useState<CartItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [toastMsg, setToastMsg]   = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "info">("success");

  const [showOrderForm, setShowOrderForm] = useState(false);
  const [address, setAddress]             = useState("");
  const [phone, setPhone]                 = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Efectivo");
  const [notes, setNotes]                 = useState("");
  const [lastOrderId, setLastOrderId]     = useState<string | null>(null);

  // ── Estado de geolocalización ─────────────────────────────────────────────
  const [geoStatus, setGeoStatus]       = useState<GeoStatus>("idle");
  const [geoError, setGeoError]         = useState<string | null>(null);
  const [clientCoords, setClientCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [distanceKm, setDistanceKm]     = useState<number | null>(null);
  const [deliveryFee, setDeliveryFee]   = useState<number | null | undefined>(undefined);

  // ── Carga de datos ────────────────────────────────────────────────────────
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

  useEffect(() => {
    if (authLoading) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    let cancelled = false;
    fetch("/api/customers/me/loyalty", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && json.ok) setLoyalty(json.data);
      })
      .catch(() => {
        if (!cancelled) setLoyalty(null);
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading]);

  // ── Geolocalización ───────────────────────────────────────────────────────
  const requestGeolocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoStatus("error");
      setGeoError("Tu navegador no soporta geolocalización. Ingresa tu dirección manualmente.");
      return;
    }

    setGeoStatus("requesting");
    setGeoError(null);
    setClientCoords(null);
    setDistanceKm(null);
    setDeliveryFee(undefined);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setGeoStatus("locating");

        const dist = haversineKm(
          DELIVERY_CONFIG.restaurant.lat,
          DELIVERY_CONFIG.restaurant.lng,
          lat,
          lng,
        );
        const fee = calcDeliveryFee(dist);

        setClientCoords({ lat, lng });
        setDistanceKm(Math.round(dist * 100) / 100);

        if (fee === null) {
          setDeliveryFee(null);
          setGeoStatus("out_of_range");
        } else {
          setDeliveryFee(fee);
          setGeoStatus("done");
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGeoStatus("denied");
          setGeoError("Permiso de ubicación denegado. Ingresa tu dirección manualmente y el costo de envío se calculará al confirmar.");
        } else {
          setGeoStatus("error");
          setGeoError("No pudimos obtener tu ubicación. Verifica tu conexión e intenta de nuevo.");
        }
        setDeliveryFee(undefined);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  // Solicitar geolocalización automáticamente al abrir el modal
  useEffect(() => {
    if (showOrderForm && geoStatus === "idle") {
      requestGeolocation();
    }
  }, [showOrderForm, geoStatus, requestGeolocation]);

  // Limpiar estado geo al cerrar el modal
  const handleCloseModal = useCallback(() => {
    if (submitting) return;
    setShowOrderForm(false);
    setGeoStatus("idle");
    setGeoError(null);
    setClientCoords(null);
    setDistanceKm(null);
    setDeliveryFee(undefined);
  }, [submitting]);

  const handleMapLocationChange = useCallback((result: {
    lat: number; lng: number; address: string;
    distanceKm: number; fee: number | null;
  }) => {
    setClientCoords({ lat: result.lat, lng: result.lng });
    setDistanceKm(result.distanceKm);
    setDeliveryFee(result.fee);
    setAddress(result.address); // llena el campo automáticamente
    if (result.fee === null) {
      setGeoStatus("out_of_range");
    } else {
      setGeoStatus("done");
    }
  }, []);

  // ── Pusher ─────────────────────────────────────────────────────────────────
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

  // ── Mapeos ─────────────────────────────────────────────────────────────────
  const dishes: Dish[] = useMemo(() =>
    apiDishes.map((d, i) => ({
      id: d._id, name: d.name, description: d.description ?? "",
      price: d.price, category: categoryNameOf(d, categories),
      image_url: d.image_url?.trim() || undefined, bgColor: bgForIndex(i),
      hasStock: d.hasStock,
    })),
    [apiDishes, categories]
  );

  const categoryNames = useMemo(() => ["Todos", ...categories.map((c) => c.name)], [categories]);

  const filteredDishes = useMemo(() =>
    selectedCategory === "Todos" ? dishes : dishes.filter((d) => d.category === selectedCategory),
    [dishes, selectedCategory]
  );

  const cartSubtotal = cart.reduce((s, it) => s + it.dish.price * it.quantity, 0);
  const loyaltyDiscountPercent = loyalty?.discountPercent ?? 0;
  const loyaltyDiscountAmount = Math.round(cartSubtotal * (loyaltyDiscountPercent / 100) * 100) / 100;
  const cartSubtotalAfterDiscount = Math.max(0, cartSubtotal - loyaltyDiscountAmount);

  // ── Carrito ────────────────────────────────────────────────────────────────
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

  // ── Confirmar orden ────────────────────────────────────────────────────────
  const handleConfirmOrder = async () => {
    if (!address.trim()) return;
    if (deliveryFee === null) return;
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
          delivery_coords: clientCoords ?? undefined,
          delivery_phone: phone.trim() || undefined,
          payment_method: paymentMethod,
          notes: notes.trim() || undefined,
          delivery_fee: deliveryFee,
          delivery_distance_km: distanceKm,
          items: cart.map((it) => ({
            dish_id: it.dish.id, quantity: it.quantity, unit_price: it.dish.price,
          })),
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message ?? "Error al crear orden");

      const orderId: string = json.data.order._id;
      setLastOrderId(orderId);

      // Limpiar carrito y cerrar modal
      const cartSnapshot = [...cart];
      setCart([]);
      setAddress(""); setPhone(""); setNotes(""); setPaymentMethod("Efectivo");
      handleCloseModal();

      if (paymentMethod === "QR / Transferencia") {
        // Redirigir a la página de pago QR existente
        router.push(`/pago-qr/${orderId}`);
      } else {
        // Efectivo: mostrar factura de confirmación
        setFacturaData({
          orderId,
          items: cartSnapshot.map((it) => ({
            dish: { name: it.dish.name, price: it.dish.price },
            quantity: it.quantity,
            subtotal: it.dish.price * it.quantity,
          })),
          total: Number(json.data.total ?? totalConEnvio),
          subtotal: Number(json.data.subtotal ?? cartSubtotal),
          discountAmount: Number(json.data.discountAmount ?? loyaltyDiscountAmount),
          discountPercent: Number(json.data.discountPercent ?? loyaltyDiscountPercent),
          loyaltyTierName: json.data.loyaltyTierName ?? loyalty?.tier.name ?? null,
          deliveryFeeAmount: Number(json.data.deliveryFee ?? deliveryFee ?? 0),
        });
        setShowFactura(true);
        setToastMsg("✅ ¡Pedido enviado! El repartidor cobrará al entregar.");
        setToastType("success");
        setTimeout(() => setToastMsg(null), 6000);
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al enviar la orden");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Helpers de UI ──────────────────────────────────────────────────────────
  const canConfirm =
    address.trim().length > 0 &&
    !submitting &&
    deliveryFee !== null &&     // no fuera de rango
    geoStatus !== "requesting" &&
    geoStatus !== "locating";

  const totalConEnvio =
    typeof deliveryFee === "number"
      ? cartSubtotalAfterDiscount + deliveryFee
      : cartSubtotalAfterDiscount;

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
            shippingFee={deliveryFee}
            discountAmount={loyaltyDiscountAmount}
            discountPercent={loyaltyDiscountPercent}
            distanceKm={distanceKm}
            onIncrement={handleIncrement}
            onDecrement={handleDecrement}
            onRemove={handleRemove}
            onCheckout={() => cart.length > 0 && setShowOrderForm(true)}
          />
        </aside>
      </div>

      {/* ── Modal de confirmación ─────────────────────────────────────────── */}
      {showOrderForm && (
        <div style={s.overlay} onClick={handleCloseModal}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={s.modalTitle}>Confirmar pedido</h3>

            {/* Resumen de productos */}
            <div style={s.summaryBox}>
              <span style={s.summaryText}>{cart.length} producto{cart.length !== 1 ? "s" : ""}</span>
              <span style={s.summaryTotal}>Bs. {cartSubtotalAfterDiscount.toFixed(2)}</span>
            </div>

            {/* ── Mapa + geolocalización ─────────────────────────────── */}
              <div style={s.geoBlock}>
                <div style={s.geoHeader}>
                  <span style={s.geoTitle}>📍 Ubicación de entrega</span>
                  {(geoStatus === "error" || geoStatus === "denied" || geoStatus === "out_of_range") && (
                    <button style={s.geoRetryBtn} onClick={requestGeolocation} disabled={submitting}>
                      Reintentar GPS
                    </button>
                  )}
                </div>

                {/* Mapa: visible cuando tenemos coordenadas (geoStatus done/out_of_range/denied/error) */}
                {clientCoords && (
                  <DeliveryMap
                    initialLat={clientCoords.lat}
                    initialLng={clientCoords.lng}
                    onLocationChange={handleMapLocationChange}
                  />
                )}

                {/* Solicitando GPS */}
                {(geoStatus === "requesting" || geoStatus === "locating") && (
                  <div style={s.geoStatusRow}>
                    <span style={s.geoSpinner}>⏳</span>
                    <span style={s.geoStatusText}>Obteniendo tu ubicación…</span>
                  </div>
                )}

                {/* Sin GPS aún: mostrar mapa centrado en el restaurante para que el usuario elija */}
                {geoStatus === "idle" && (
                  <DeliveryMap
                    initialLat={DELIVERY_CONFIG.restaurant.lat}
                    initialLng={DELIVERY_CONFIG.restaurant.lng}
                    onLocationChange={handleMapLocationChange}
                  />
                )}

                {/* Éxito */}
                {geoStatus === "done" && distanceKm !== null && typeof deliveryFee === "number" && (
                  <div style={s.geoDetails}>
                    <div style={s.geoDetailItem}>
                      <span style={s.geoDetailLabel}>Distancia</span>
                      <span style={s.geoDetailValue}>{distanceKm.toFixed(2)} km</span>
                    </div>
                    <div style={s.geoDetailItem}>
                      <span style={s.geoDetailLabel}>Envío</span>
                      <span style={{ ...s.geoDetailValue, color: "#f97316", fontWeight: 700 }}>
                        Bs. {deliveryFee.toFixed(2)}
                      </span>
                    </div>
                    <div style={s.geoDetailItem}>
                      <span style={s.geoDetailLabel}>Total</span>
                      <span style={{ ...s.geoDetailValue, color: "#059669", fontWeight: 700 }}>
                        Bs. {totalConEnvio.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Fuera de rango */}
                {geoStatus === "out_of_range" && distanceKm !== null && (
                  <div style={s.geoError}>
                    <span>❌ Tu ubicación está a <strong>{distanceKm.toFixed(2)} km</strong> — fuera del radio de {DELIVERY_CONFIG.maxDistanceKm} km.</span>
                    <span style={s.geoErrorSub}>Mueve el marcador del mapa para ajustar tu punto de entrega.</span>
                  </div>
                )}

                {/* Permiso denegado — igual se puede usar el mapa */}
                {(geoStatus === "denied" || geoStatus === "error") && (
                  <div style={{ ...s.geoError, ...s.geoErrorWarning }}>
                    <span>⚠️ GPS no disponible. Usa el mapa para marcar tu ubicación.</span>
                  </div>
                )}
              </div>

            {/* Dirección */}
            <label style={s.label}>Dirección de entrega *</label>
            <input
              style={s.input}
              placeholder="Ej: Av. Heroínas 123, Zona Centro"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={submitting}
            />

            {/* Teléfono */}
            <label style={s.label}>Teléfono de contacto (opcional)</label>
            <input
              style={s.input}
              placeholder="Ej: +591 70000000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={submitting}
            />

            {/* Forma de pago */}
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

            {/* Notas */}
            <label style={s.label}>Notas adicionales (opcional)</label>
            <textarea
              style={s.textarea}
              placeholder="Ej: Sin cebolla, tocar timbre piso 3…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              disabled={submitting}
            />

            {/* Resumen final visible solo cuando hay fee calculado */}
            {geoStatus === "done" && typeof deliveryFee === "number" && (
              <div style={s.finalSummary}>
                <div style={s.finalRow}>
                  <span style={s.finalLabel}>Subtotal</span>
                  <span style={s.finalValue}>Bs. {cartSubtotal.toFixed(2)}</span>
                </div>
                {loyaltyDiscountAmount > 0 && (
                  <div style={s.finalRow}>
                    <span style={s.finalLabel}>Descuento fidelizacion ({loyaltyDiscountPercent}%)</span>
                    <span style={{ ...s.finalValue, color: "#c2410c" }}>-Bs. {loyaltyDiscountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div style={s.finalRow}>
                  <span style={s.finalLabel}>Envío ({distanceKm?.toFixed(2)} km)</span>
                  <span style={s.finalValue}>Bs. {deliveryFee.toFixed(2)}</span>
                </div>
                <div style={{ ...s.finalRow, ...s.finalRowTotal }}>
                  <span style={s.finalLabelTotal}>Total</span>
                  <span style={s.finalValueTotal}>Bs. {totalConEnvio.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Acciones */}
            <div style={s.modalActions}>
              <button style={s.cancelBtn} onClick={handleCloseModal} disabled={submitting}>
                Cancelar
              </button>
              <button
                style={{
                  ...s.confirmBtn,
                  opacity: !canConfirm ? 0.6 : 1,
                  cursor: !canConfirm ? "not-allowed" : "pointer",
                }}
                onClick={handleConfirmOrder}
                disabled={!canConfirm}
                title={
                  geoStatus === "out_of_range"
                    ? "Tu ubicación está fuera del radio de entrega"
                    : !address.trim()
                    ? "Ingresa una dirección"
                    : undefined
                }
              >
                {submitting ? "Enviando…" : "Confirmar pedido"}
              </button>
            </div>
            {/* ── Factura post-orden (solo efectivo) ───────────────────────── */}
              {showFactura && facturaData && (
                <FacturaFinal
                  isOpen={showFactura}
                  onClose={() => { setShowFactura(false); setFacturaData(null); }}
                  orderId={facturaData.orderId}
                  tableNumber={null}
                  items={facturaData.items}
                  iva={0}
                  total={facturaData.total}
                  subtotal={facturaData.subtotal}
                  discountAmount={facturaData.discountAmount}
                  discountPercent={facturaData.discountPercent}
                  loyaltyTierName={facturaData.loyaltyTierName}
                  deliveryFee={facturaData.deliveryFeeAmount}
                  paymentMethod="cash"
                  paymentDate={new Date()}
                />
              )}
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

  // ── Modal ──────────────────────────────────────────────────────────────────
  overlay:     { position: "fixed", inset: 0, backgroundColor: "rgba(17,24,39,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" },
  modal:       { backgroundColor: "#fff", borderRadius: 16, width: "100%", maxWidth: 500, padding: "1.75rem", display: "flex", flexDirection: "column", gap: "0.85rem", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", maxHeight: "90vh", overflowY: "auto" },
  modalTitle:  { margin: 0, fontSize: "1.25rem", fontWeight: 700, color: "#111827" },
  summaryBox:  { display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 8, padding: "0.65rem 1rem" },
  summaryText: { fontSize: "0.875rem", color: "#92400e" },
  summaryTotal:{ fontSize: "1.1rem", fontWeight: 700, color: "#f97316" },

  // ── Bloque geo ─────────────────────────────────────────────────────────────
  geoBlock:       { backgroundColor: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 10, padding: "0.9rem 1rem", display: "flex", flexDirection: "column", gap: "0.6rem" },
  geoHeader:      { display: "flex", justifyContent: "space-between", alignItems: "center" },
  geoTitle:       { fontSize: "0.9rem", fontWeight: 600, color: "#374151" },
  geoRetryBtn:    { fontSize: "0.78rem", fontWeight: 600, color: "#f97316", background: "none", border: "1px solid #fed7aa", borderRadius: 6, padding: "0.2rem 0.65rem", cursor: "pointer" },
  geoStatusRow:   { display: "flex", alignItems: "center", gap: "0.5rem" },
  geoSpinner:     { fontSize: "1rem" },
  geoStatusText:  { fontSize: "0.875rem", color: "#6b7280" },

  geoSuccess:     { display: "flex", flexDirection: "column", gap: "0.5rem" },
  geoSuccessRow:  { display: "flex", alignItems: "center", gap: "0.4rem" },
  geoSuccessIcon: { fontSize: "0.95rem" },
  geoSuccessText: { fontSize: "0.875rem", color: "#059669", fontWeight: 600 },
  geoDetails:     { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem", backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "0.6rem 0.75rem" },
  geoDetailItem:  { display: "flex", flexDirection: "column", gap: 2 },
  geoDetailLabel: { fontSize: "0.7rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.04em" },
  geoDetailValue: { fontSize: "0.9rem", fontWeight: 600, color: "#111827" },

  geoError:       { display: "flex", flexDirection: "column", gap: "0.3rem", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "0.65rem 0.85rem", fontSize: "0.875rem", color: "#b91c1c" },
  geoErrorWarning:{ backgroundColor: "#fffbeb", borderColor: "#fde68a", color: "#92400e" },
  geoErrorSub:    { fontSize: "0.78rem", color: "#6b7280", marginTop: 2 },

  // ── Inputs ─────────────────────────────────────────────────────────────────
  label:        { fontSize: "0.85rem", fontWeight: 600, color: "#374151" },
  input:        { width: "100%", padding: "0.65rem 0.9rem", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: "0.95rem", color: "#111827", outline: "none", boxSizing: "border-box" },
  textarea:     { width: "100%", padding: "0.65rem 0.9rem", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: "0.9rem", color: "#111827", outline: "none", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" },
  paymentGrid:  { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" },
  paymentBtn:   { padding: "0.85rem 0.5rem", borderRadius: 10, borderWidth: "1.5px", borderStyle: "solid", borderColor: "#e5e7eb", backgroundColor: "#f9fafb", color: "#374151", fontSize: "0.9rem", fontWeight: 500, cursor: "pointer", textAlign: "center" },
  paymentBtnActive: { backgroundColor: "#fff7ed", borderColor: "#f97316", color: "#f97316", fontWeight: 700 },

  // ── Resumen final ──────────────────────────────────────────────────────────
  finalSummary:   { backgroundColor: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 10, padding: "0.85rem 1rem", display: "flex", flexDirection: "column", gap: "0.4rem" },
  finalRow:       { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.875rem" },
  finalLabel:     { color: "#6b7280" },
  finalValue:     { fontWeight: 600, color: "#374151" },
  finalRowTotal:  { paddingTop: "0.5rem", borderTop: "1px solid #e5e7eb", marginTop: "0.2rem" },
  finalLabelTotal:{ fontSize: "1rem", fontWeight: 700, color: "#111827" },
  finalValueTotal:{ fontSize: "1.2rem", fontWeight: 700, color: "#059669" },

  // ── Acciones ───────────────────────────────────────────────────────────────
  modalActions: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginTop: "0.25rem" },
  cancelBtn:    { backgroundColor: "#fff", color: "#111827", border: "1px solid #e5e7eb", borderRadius: 10, padding: "0.75rem", fontWeight: 600, cursor: "pointer", fontSize: "0.95rem" },
  confirmBtn:   { backgroundColor: "#f97316", color: "#fff", border: "none", borderRadius: 10, padding: "0.75rem", fontWeight: 600, fontSize: "0.95rem" },
};
