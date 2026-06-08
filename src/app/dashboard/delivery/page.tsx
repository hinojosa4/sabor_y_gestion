// src/app/dashboard/delivery/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Truck, LogOut, Package, User, Phone, MapPin,
  Navigation, ShoppingBag, DollarSign, Clock,
  CheckCircle2, XCircle, RefreshCw, Bike,
} from "lucide-react";
import { useAuth } from "@/lib/useAuth";
import { DELIVERY } from "@/lib/roles";
import { getPusherClient } from "@/lib/pusherClient";
import styles from "./page.module.css";

// ── Tipos ──────────────────────────────────────────────────────────────────────

type BackendStatus =
  | "pending" | "in_kitchen" | "ready"
  | "picked_up" | "in_transit"
  | "delivered" | "paid" | "cancelled";

type DisplayStatus =
  | "Pendiente de Recoger" | "Recogido" | "En Tránsito"
  | "Entregado" | "Cancelado";

interface RawItem {
  _id: string;
  dish_id: { _id: string; name: string; price: number } | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
  notes?: string;
}

interface RawOrder {
  _id: string;
  status: BackendStatus;
  driver_id?: string;
  total_amount: number;
  delivery_fee?: number;              // ← costo de envío
  delivery_distance_km?: number | null; // ← distancia en km
  delivery_address?: string;
  delivery_phone?: string;
  delivery_coords?: { lat?: number; lng?: number };
  notes?: string;
  payment_method?: string;
  user_id?: { name?: string; email?: string } | string;
  createdAt: string;
  items: RawItem[];
  daily_number?: number;
}

interface CompletedRaw {
  _id: string;
  status: BackendStatus;
  total_amount: number;
  delivery_fee?: number;
  delivery_distance_km?: number | null;
  delivery_address?: string;
  user_id?: { name?: string } | string;
  createdAt: string;
  daily_number?: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const STATUS_MAP: Record<BackendStatus, DisplayStatus> = {
  pending:    "Pendiente de Recoger",
  in_kitchen: "Pendiente de Recoger",
  ready:      "Pendiente de Recoger",
  picked_up:  "Recogido",
  in_transit: "En Tránsito",
  delivered:  "Entregado",
  paid:       "Entregado",
  cancelled:  "Cancelado",
};

const NEXT_STATUS: Partial<Record<BackendStatus, BackendStatus>> = {
  pending:    "picked_up",
  in_kitchen: "picked_up",
  ready:      "picked_up",
  picked_up:  "in_transit",
  in_transit: "delivered",
};

const ADVANCE_LABEL: Partial<Record<BackendStatus, string>> = {
  pending:    "Marcar como Recogido",
  in_kitchen: "Marcar como Recogido",
  ready:      "Marcar como Recogido",
  picked_up:  "Iniciar Entrega",
  in_transit: "Marcar como Entregado",
};

function formatTime(d: string) {
  return new Date(d).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}
function formatMoney(v: number) { return `Bs. ${v.toFixed(2)}`; }
function customerName(u: RawOrder["user_id"]): string {
  if (!u || typeof u === "string") return "Cliente";
  return u.name ?? u.email ?? "Cliente";
}
function mapsUrl(o: RawOrder) {
  if (o.delivery_coords?.lat && o.delivery_coords?.lng)
    return `https://maps.google.com/?q=${o.delivery_coords.lat},${o.delivery_coords.lng}`;
  if (o.delivery_address)
    return `https://maps.google.com/?q=${encodeURIComponent(o.delivery_address)}`;
  return "https://maps.google.com";
}

const HEADER_CLASS: Record<DisplayStatus, string> = {
  "Pendiente de Recoger": styles.headerPending,
  Recogido:               styles.headerRecogido,
  "En Tránsito":          styles.headerTransito,
  Entregado:              styles.headerEntregado,
  Cancelado:              styles.headerCancelado,
};
const ICON_CLASS: Record<DisplayStatus, string> = {
  "Pendiente de Recoger": styles.iconPending,
  Recogido:               styles.iconRecogido,
  "En Tránsito":          styles.iconTransito,
  Entregado:              styles.iconEntregado,
  Cancelado:              styles.iconCancelado,
};
const TITLE_CLASS: Record<DisplayStatus, string> = {
  "Pendiente de Recoger": styles.titlePending,
  Recogido:               styles.titleRecogido,
  "En Tránsito":          styles.titleTransito,
  Entregado:              styles.titleEntregado,
  Cancelado:              styles.titleCancelado,
};
const BADGE_CLASS: Record<DisplayStatus, string> = {
  "Pendiente de Recoger": styles.badgePending,
  Recogido:               styles.badgeRecogido,
  "En Tránsito":          styles.badgeTransito,
  Entregado:              styles.badgeEntregado,
  Cancelado:              styles.badgeCancelado,
};

// ── Tarjeta de orden activa ────────────────────────────────────────────────────

function ActiveOrderCard({
  order, onAdvance, onCancel, loading,
}: {
  order: RawOrder;
  onAdvance: (id: string, next: BackendStatus) => void;
  onCancel: (id: string) => void;
  loading: boolean;
}) {
  const displayStatus  = STATUS_MAP[order.status];
  const advanceLabel   = ADVANCE_LABEL[order.status];
  const nextStatus     = NEXT_STATUS[order.status];
  const showCancel     = order.status === "picked_up" || order.status === "in_transit";
  const isGreen        = order.status === "in_transit";
  const isPickupAction = nextStatus === "picked_up";
  const canPickup      = order.status === "ready";
  const btnDisabled    = loading || (isPickupAction && !canPickup);

  // Calcular subtotal de items (sin envío)
  const itemsSubtotal = order.items.reduce((s, it) => s + it.subtotal, 0);
  const deliveryFee   = order.delivery_fee ?? 0;
  const hasDistInfo   = typeof order.delivery_distance_km === "number" && order.delivery_distance_km !== null;

  return (
    <div className={styles.orderCard}>
      <div className={`${styles.orderHeader} ${HEADER_CLASS[displayStatus]}`}>
        <div className={styles.orderHeaderLeft}>
          <Package size={24} className={ICON_CLASS[displayStatus]} />
          <div>
            <h3 className={`${styles.orderTitle} ${TITLE_CLASS[displayStatus]}`}>
              Pedido #{order.daily_number ?? order._id.slice(-6).toUpperCase()}
            </h3>
            <p className={styles.orderTime}>Realizado a las {formatTime(order.createdAt)}</p>
          </div>
        </div>
        <span className={`${styles.statusBadge} ${BADGE_CLASS[displayStatus]}`}>
          {displayStatus}
        </span>
      </div>

      <div className={styles.orderBody}>
        {/* Cliente */}
        <div className={`${styles.infoBox} ${styles.infoBoxBlue}`}>
          <div className={styles.infoHeader}>
            <User size={16} className={styles.iconBlue} />
            <h4 className={styles.infoTitle}>Información del Cliente</h4>
          </div>
          <div className={styles.infoList}>
            <div className={styles.infoRow}><User size={16} className={styles.iconGray} /><span>{customerName(order.user_id)}</span></div>
            {order.delivery_phone && <div className={styles.infoRow}><Phone size={16} className={styles.iconGray} /><span>{order.delivery_phone}</span></div>}
            {order.delivery_address && <div className={styles.infoRow}><MapPin size={16} className={styles.iconGray} /><span>{order.delivery_address}</span></div>}
          </div>
          {order.notes && (
            <div className={styles.infoNote}>
              <span className={styles.infoNoteLabel}>Nota:</span> <span>{order.notes}</span>
            </div>
          )}
        </div>

        {/* Ubicación + distancia ── MEJORADO */}
        <div className={`${styles.infoBox} ${styles.infoBoxGreen}`}>
          <div className={styles.infoHeader}>
            <Navigation size={16} className={styles.iconGreen} />
            <h4 className={styles.infoTitle}>Ubicación y Distancia</h4>
          </div>

          {/* Chips de distancia y tarifa */}
          {(hasDistInfo || deliveryFee > 0) && (
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.4rem" }}>
              {hasDistInfo && (
                <span style={chipStyles.distChip}>
                  <Bike size={12} style={{ marginRight: 4 }} />
                  {(order.delivery_distance_km as number).toFixed(2)} km
                </span>
              )}
              {deliveryFee > 0 && (
                <span style={chipStyles.feeChip}>
                  Envío: Bs. {deliveryFee.toFixed(2)}
                </span>
              )}
            </div>
          )}

          {order.delivery_coords?.lat ? (
            <p className={styles.locationCoords}>
              {order.delivery_coords.lat?.toFixed(4)}, {order.delivery_coords.lng?.toFixed(4)}
            </p>
          ) : (
            <p className={styles.locationCoords}>{order.delivery_address ?? "Sin coordenadas"}</p>
          )}
          <a href={mapsUrl(order)} target="_blank" rel="noreferrer" className={styles.mapsBtn}>
            <Navigation size={16} /> Abrir en Maps
          </a>
        </div>

        {/* Comanda */}
        <div className={`${styles.infoBox} ${styles.infoBoxGray}`}>
          <div className={styles.infoHeader}>
            <ShoppingBag size={16} className={styles.iconPurple} />
            <h4 className={styles.infoTitle}>Comanda del Pedido</h4>
          </div>
          <ul className={styles.itemsList}>
            {order.items.map((it, i) => (
              <li key={i} className={styles.itemRow}>
                <span className={styles.itemName}>
                  {it.quantity}x {it.dish_id?.name ?? "Plato"}
                  {it.notes && <span className={styles.itemNote}> ({it.notes})</span>}
                </span>
                <span className={styles.itemPrice}>{formatMoney(it.subtotal)}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Pago ── MEJORADO con desglose envío */}
        <div className={`${styles.infoBox} ${styles.infoBoxPurple}`}>
          <div className={styles.infoHeader}>
            <DollarSign size={16} className={styles.iconPurple} />
            <h4 className={styles.infoTitle}>Resumen de Pago</h4>
          </div>
          <div className={styles.paymentList}>
            {order.payment_method && (
              <div className={styles.paymentRow}>
                <span className={styles.paymentLabel}>Método</span>
                <span className={styles.paymentValue}>{order.payment_method}</span>
              </div>
            )}
            {/* Desglose solo si hay delivery_fee */}
            {deliveryFee > 0 && (
              <>
                <div className={styles.paymentRow}>
                  <span className={styles.paymentLabel}>Subtotal productos</span>
                  <span className={styles.paymentValue}>{formatMoney(itemsSubtotal)}</span>
                </div>
                <div className={styles.paymentRow}>
                  <span className={styles.paymentLabel}>
                    Costo de envío
                    {hasDistInfo && ` (${(order.delivery_distance_km as number).toFixed(2)} km)`}
                  </span>
                  <span className={styles.paymentValue}>{formatMoney(deliveryFee)}</span>
                </div>
              </>
            )}
            <div className={styles.totalRow}>
              <span className={styles.totalLabel}>Total:</span>
              <span className={styles.totalValue}>{formatMoney(order.total_amount)}</span>
            </div>
          </div>
        </div>

        {/* Hora */}
        <div className={styles.estimateRow}>
          <div className={styles.estimateLabel}><Clock size={16} /><span>Pedido realizado:</span></div>
          <span className={styles.estimateValue}>{formatTime(order.createdAt)}</span>
        </div>

        {/* Acciones */}
        {advanceLabel && nextStatus && (
          <div className={`${styles.actionsGrid} ${showCancel ? styles.actionsTwo : styles.actionsOne}`}>
            <button
              type="button"
              disabled={btnDisabled}
              onClick={() => onAdvance(order._id, nextStatus)}
              className={`${styles.advanceBtn} ${isGreen ? styles.advanceGreen : styles.advanceDefault}`}
              title={isPickupAction && !canPickup ? "Espera a que cocina marque la orden como lista" : undefined}
              style={{ opacity: btnDisabled ? 0.5 : 1 }}
            >
              <CheckCircle2 size={16} />
              {loading ? "Actualizando…" : advanceLabel}
            </button>
            {showCancel && (
              <button type="button" disabled={loading} onClick={() => onCancel(order._id)} className={styles.cancelBtn}>
                <XCircle size={16} /> Cancelar
              </button>
            )}
          </div>
        )}

        {isPickupAction && !canPickup && (
          <p className={styles.notReadyNote}>
            ⏳ Esperando que cocina marque la orden como lista…
          </p>
        )}
      </div>
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────────────────────

export default function DeliveryPage() {
  const { user, loading: authLoading, logout } = useAuth(DELIVERY);

  const tokenRef = useRef<string | null>(null);
  useEffect(() => { tokenRef.current = localStorage.getItem("token"); }, []);
  const getToken = () => tokenRef.current;

  const [activeOrders, setActiveOrders]       = useState<RawOrder[]>([]);
  const [completedOrders, setCompletedOrders] = useState<CompletedRaw[]>([]);
  const [fetchLoading, setFetchLoading]       = useState(true);
  const [actionLoading, setActionLoading]     = useState(false);
  const [error, setError]                     = useState<string | null>(null);
  const [newOrderAlert, setNewOrderAlert]     = useState(false);
  const [trackingInfo, setTrackingInfo]       = useState<string | null>(null);

  // ── Carga ─────────────────────────────────────────────────────────────────
  const loadOrders = useCallback(async () => {
    const token = getToken();
    setError(null);
    try {
      const res  = await fetch("/api/orders/delivery", { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message ?? "Error al cargar órdenes");
      setActiveOrders(json.data.active ?? []);
      setCompletedOrders(json.data.completed ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red");
    } finally {
      setFetchLoading(false);
    }
  }, []);

  useEffect(() => { if (!authLoading && user) loadOrders(); }, [authLoading, user, loadOrders]);

  // ── Pusher ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    getPusherClient().then((client) => {
      if (cancelled) return;

      const deliveryChannel = client.subscribe("delivery");

      deliveryChannel.bind("order:new_delivery", (data: { order: RawOrder }) => {
        setActiveOrders((prev) => {
          if (prev.some((o) => o._id === data.order._id)) return prev;
          return [data.order, ...prev];
        });
        setNewOrderAlert(true);
        setTimeout(() => setNewOrderAlert(false), 4000);
      });

      deliveryChannel.bind("order:status_updated", (data: { orderId: string; status: BackendStatus }) => {
        const isFinished = data.status === "delivered" || data.status === "paid" || data.status === "cancelled";
        if (isFinished) {
          setActiveOrders((prev) => {
            const moved = prev.find((o) => o._id === data.orderId);
            if (moved && data.status !== "cancelled") {
              setCompletedOrders((c) => {
                const map = new Map(c.map((o) => [String(o._id), o]));
                map.set(String(data.orderId), { ...moved, status: data.status });
                return Array.from(map.values());
              });
            }
            return prev.filter((o) => o._id !== data.orderId);
          });
        } else {
          setActiveOrders((prev) =>
            prev.map((o) => o._id === data.orderId ? { ...o, status: data.status } : o)
          );
        }
      });

      const restaurantChannel = client.subscribe("restaurant");
      restaurantChannel.bind("order:updated", (data: { orderId: string; newStatus: BackendStatus }) => {
        setActiveOrders((prev) =>
          prev.map((o) => o._id === data.orderId ? { ...o, status: data.newStatus } : o)
        );
      });
    });

    return () => {
      cancelled = true;
      getPusherClient().then((client) => {
        client.unsubscribe("delivery");
        client.unsubscribe("restaurant");
      });
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const token = getToken();
    if (!token || !navigator.geolocation) return;

    const trackedOrder = activeOrders.find((order) =>
      ["picked_up", "in_transit"].includes(order.status) &&
      String(order.driver_id ?? "") === user._id
    );

    if (!trackedOrder) {
      setTrackingInfo(null);
      return;
    }
    setTrackingInfo("Tracking activo: obteniendo GPS...");

    let lastSentAt = 0;
    let latestCoords: { lat: number; lng: number } | null = null;

    const sendLocation = async (lat: number, lng: number) => {
      const now = Date.now();
      if (now - lastSentAt < 3000) return;

      lastSentAt = now;
      latestCoords = { lat, lng };

      try {
        await fetch(`/api/orders/${trackedOrder._id}/driver-location`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ lat, lng }),
        });
        setTrackingInfo(`Tracking activo: ubicacion enviada ${new Date().toLocaleTimeString("es-BO", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })}`);
      } catch {
        // El tracking no debe bloquear la gestion del pedido.
      }
    };

    const requestAndSendLocation = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          sendLocation(pos.coords.latitude, pos.coords.longitude);
        },
        () => {
          setTrackingInfo("Tracking activo: no se pudo refrescar el GPS");
          if (latestCoords) {
            sendLocation(latestCoords.lat, latestCoords.lng);
          }
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 12000 }
      );
    };

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        sendLocation(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        setTrackingInfo("Tracking activo: permiso GPS pendiente o bloqueado");
        // Si el permiso falla, el repartidor puede seguir usando el panel.
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );
    requestAndSendLocation();
    const intervalId = window.setInterval(requestAndSendLocation, 3000);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      window.clearInterval(intervalId);
      setTrackingInfo(null);
    };
  }, [activeOrders, user]);

  // ── Acciones ───────────────────────────────────────────────────────────────
  const handleAdvance = async (orderId: string, nextStatus: BackendStatus) => {
    const token = getToken();
    if (!token) return;
    setActionLoading(true);
    try {
      const res  = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: nextStatus }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message ?? "Error al actualizar");

      const isFinished = nextStatus === "delivered" || nextStatus === "paid";
      if (isFinished) {
        const moved = activeOrders.find((o) => o._id === orderId);
        if (moved) {
          setCompletedOrders((prev) => {
            const map = new Map(prev.map((o) => [String(o._id), o]));
            map.set(String(orderId), { ...moved, status: nextStatus });
            return Array.from(map.values());
          });
        }
        setActiveOrders((prev) => prev.filter((o) => o._id !== orderId));
      } else {
        setActiveOrders((prev) =>
          prev.map((o) =>
            o._id === orderId
              ? {
                  ...o,
                  status: nextStatus,
                  driver_id: ["picked_up", "in_transit"].includes(nextStatus)
                    ? user?._id ?? o.driver_id
                    : o.driver_id,
                }
              : o
          )
        );
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al actualizar la orden");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async (orderId: string) => {
    const token = getToken();
    if (!token || !confirm("¿Cancelar este pedido?")) return;
    setActionLoading(true);
    try {
      const res  = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: "cancelled" }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message);
      setActiveOrders((prev) => prev.filter((o) => o._id !== orderId));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al cancelar");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const pendientes   = activeOrders.filter((o) => ["pending","in_kitchen","ready"].includes(o.status)).length;
    const recogidos    = activeOrders.filter((o) => o.status === "picked_up").length;
    const enTransito   = activeOrders.filter((o) => o.status === "in_transit").length;
    const entregados   = completedOrders.filter((o) => ["delivered","paid"].includes(o.status)).length;
    const recaudado    = completedOrders
      .filter((o) => ["delivered","paid"].includes(o.status))
      .reduce((s, o) => s + o.total_amount, 0);
    // Total solo de fees cobrados hoy
    const feesHoy      = completedOrders
      .filter((o) => ["delivered","paid"].includes(o.status))
      .reduce((s, o) => s + (o.delivery_fee ?? 0), 0);
    return { pendientes, recogidos, enTransito, entregados, recaudado, feesHoy };
  }, [activeOrders, completedOrders]);

  if (authLoading) return <div className={styles.page}><div className={styles.centered}>Verificando sesión…</div></div>;

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.headerRow}>
            <div className={styles.headerLeft}>
              <div className={styles.logo}><Truck size={24} className={styles.logoIcon} /></div>
              <div>
                <h1 className={styles.title}>Panel de Repartidor</h1>
                <p className={styles.subtitle}>Gestión de Entregas</p>
              </div>
            </div>
            <div className={styles.headerRight}>
              <div className={styles.userInfo}>
                <p className={styles.userName}>{user?.name ?? "Repartidor"}</p>
                <p className={styles.userRole}>Repartidor</p>
              </div>
              <button type="button" onClick={loadOrders} className={styles.refreshBtn} title="Actualizar">
                <RefreshCw size={15} />
              </button>
              <button type="button" onClick={() => logout()} className={styles.logoutBtn}>
                <LogOut size={16} /> Salir
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        {newOrderAlert && (
          <div className={styles.newOrderAlert}>🛵 ¡Nueva orden de delivery recibida!</div>
        )}
        {trackingInfo && (
          <div style={{
            marginBottom: "1rem",
            backgroundColor: "#eff6ff",
            border: "1px solid #bfdbfe",
            color: "#1d4ed8",
            borderRadius: 10,
            padding: "0.75rem 1rem",
            fontSize: "0.9rem",
            fontWeight: 700,
          }}>
            {trackingInfo}
          </div>
        )}
        {error && (
          <div className={styles.errorBanner}>
            {error}{" "}
            <button onClick={loadOrders} className={styles.retryLink}>Reintentar</button>
          </div>
        )}

        <div className={styles.grid}>
          {/* Columna izquierda */}
          <div className={styles.leftCol}>
            <section className={styles.card}>
              <div className={styles.cardBody}>
                <h2 className={styles.sectionTitle}>Pedidos Activos</h2>
                <p className={styles.sectionSubtitle}>Pedidos pendientes y en proceso de entrega</p>
                {fetchLoading ? (
                  <div className={styles.emptyState}><p className={styles.emptyText}>Cargando órdenes…</p></div>
                ) : activeOrders.length === 0 ? (
                  <div className={styles.emptyState}>
                    <Package size={64} className={styles.emptyIcon} />
                    <p className={styles.emptyText}>No hay pedidos activos</p>
                  </div>
                ) : (
                  <div className={styles.ordersList}>
                    {activeOrders.map((order) => (
                      <ActiveOrderCard
                        key={order._id}
                        order={order}
                        onAdvance={handleAdvance}
                        onCancel={handleCancel}
                        loading={actionLoading}
                      />
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className={styles.card}>
              <div className={styles.cardBody}>
                <h2 className={styles.sectionTitle}>Pedidos Completados</h2>
                <p className={styles.sectionSubtitle}>Historial de entregas del día</p>
                {completedOrders.length === 0 ? (
                  <p className={styles.completedEmpty}>Aún no hay entregas completadas hoy.</p>
                ) : (
                  <div className={styles.completedList}>
                    {completedOrders.filter((o) => o.status !== "cancelled").map((order) => (
                      <div key={order._id} className={styles.completedItem}>
                        <div className={styles.completedLeft}>
                          <CheckCircle2 size={20} className={styles.completedIcon} />
                          <div>
                            <p className={styles.completedTitle}>Pedido #{order.daily_number ?? order._id.slice(-6).toUpperCase()}</p>
                            <p className={styles.completedSub}>
                              {typeof order.user_id === "object" && order.user_id
                                ? (order.user_id as { name?: string }).name ?? "Cliente"
                                : "Cliente"}
                            </p>
                            {order.delivery_address && <p className={styles.completedDist}>{order.delivery_address}</p>}
                            {/* Distancia en el historial */}
                            {typeof order.delivery_distance_km === "number" && (
                              <p className={styles.completedDist}>
                                📍 {(order.delivery_distance_km as number).toFixed(2)} km
                                {(order.delivery_fee ?? 0) > 0 && ` · Envío: Bs. ${(order.delivery_fee as number).toFixed(2)}`}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className={styles.completedRight}>
                          <span className={`${styles.statusBadge} ${styles.badgeEntregado}`}>Entregado</span>
                          <span className={styles.completedAmount}>{formatMoney(order.total_amount)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <aside className={styles.rightCol}>
            <section className={styles.card}>
              <div className={styles.cardBody}>
                <h2 className={styles.sectionTitle}>Resumen del Día</h2>
                <div className={styles.summaryList}>
                  <div className={styles.summaryRow}><span className={styles.summaryLabel}>Pedidos Pendientes</span><span className={`${styles.summaryValue} ${styles.valueYellow}`}>{stats.pendientes}</span></div>
                  <div className={styles.summaryRow}><span className={styles.summaryLabel}>En Tránsito</span><span className={`${styles.summaryValue} ${styles.valuePurple}`}>{stats.enTransito}</span></div>
                  <div className={styles.summaryRow}><span className={styles.summaryLabel}>Entregados Hoy</span><span className={`${styles.summaryValue} ${styles.valueGreen}`}>{stats.entregados}</span></div>
                  {/* ── Fila de fees recaudados ── */}
                  {stats.feesHoy > 0 && (
                    <div className={styles.summaryRow}>
                      <span className={styles.summaryLabel}>Total en Envíos</span>
                      <span className={`${styles.summaryValue} ${styles.valuePurple}`}>Bs. {stats.feesHoy.toFixed(2)}</span>
                    </div>
                  )}
                  <div className={styles.summaryDivider}><span className={styles.summaryLabel}>Total Recaudado</span><span className={`${styles.summaryValue} ${styles.valuePurpleStrong}`}>Bs. {stats.recaudado.toFixed(2)}</span></div>
                </div>
              </div>
            </section>

            <section className={styles.card}>
              <div className={styles.cardBody}>
                <h2 className={styles.sectionTitle}>Estado de Pedidos</h2>
                <ul className={styles.legendList}>
                  <li className={styles.legendRow}><span className={`${styles.legendSwatch} ${styles.swatchYellow}`} /><span className={styles.legendLabel}>Pendientes ({stats.pendientes})</span></li>
                  <li className={styles.legendRow}><span className={`${styles.legendSwatch} ${styles.swatchBlue}`} /><span className={styles.legendLabel}>Recogidos ({stats.recogidos})</span></li>
                  <li className={styles.legendRow}><span className={`${styles.legendSwatch} ${styles.swatchPurple}`} /><span className={styles.legendLabel}>En Tránsito ({stats.enTransito})</span></li>
                  <li className={styles.legendRow}><span className={`${styles.legendSwatch} ${styles.swatchGreen}`} /><span className={styles.legendLabel}>Entregados ({stats.entregados})</span></li>
                </ul>
              </div>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}

// ── Estilos inline para los chips de distancia/fee ────────────────────────────
// (el resto de estilos ya están en page.module.css)

const chipStyles: { [k: string]: React.CSSProperties } = {
  distChip: {
    display: "inline-flex",
    alignItems: "center",
    backgroundColor: "#ecfdf5",
    border: "1px solid #6ee7b7",
    color: "#065f46",
    fontSize: "0.75rem",
    fontWeight: 600,
    padding: "0.2rem 0.55rem",
    borderRadius: 999,
  },
  feeChip: {
    display: "inline-flex",
    alignItems: "center",
    backgroundColor: "#fff7ed",
    border: "1px solid #fed7aa",
    color: "#c2410c",
    fontSize: "0.75rem",
    fontWeight: 600,
    padding: "0.2rem 0.55rem",
    borderRadius: 999,
  },
};
