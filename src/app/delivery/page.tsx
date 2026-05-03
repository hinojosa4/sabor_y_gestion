// app/delivery/page.tsx
"use client";

import { useMemo, useState } from "react";
import {
  Truck,
  LogOut,
  Package,
  User,
  Phone,
  MapPin,
  Navigation,
  ShoppingBag,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import styles from "./page.module.css";

type DeliveryStatus =
  | "Pendiente de Recoger"
  | "Recogido"
  | "En Tránsito"
  | "Entregado"
  | "Cancelado";

interface OrderItem {
  quantity: number;
  name: string;
  note?: string;
  price: number;
}

interface DeliveryOrder {
  id: string;
  createdAt: string;
  status: DeliveryStatus;
  customer: {
    name: string;
    phone: string;
    address: string;
    note?: string;
  };
  coordinates: string;
  distanceKm: number;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  estimatedDelivery: string;
}

const INITIAL_ORDERS: DeliveryOrder[] = [
  {
    id: "ORD-1234",
    createdAt: "14:30",
    status: "Pendiente de Recoger",
    customer: {
      name: "Juan Pérez",
      phone: "+52 555-1234",
      address: "Av. Reforma 123, Col. Centro, CDMX",
      note: "Tocar el timbre del apartamento 402",
    },
    coordinates: "19.4350, -99.1400",
    distanceKm: 3.2,
    items: [
      { quantity: 2, name: "Pizza Margarita", price: 25.98 },
      { quantity: 1, name: "Pasta Carbonara", price: 15.99 },
      { quantity: 2, name: "Tiramisú", price: 15.98 },
    ],
    subtotal: 57.95,
    shipping: 4.5,
    estimatedDelivery: "15:15",
  },
  {
    id: "ORD-1236",
    createdAt: "14:15",
    status: "En Tránsito",
    customer: {
      name: "Carlos López",
      phone: "+52 555-9012",
      address: "Insurgentes Sur 789, Col. Del Valle, CDMX",
      note: "Dejar en recepción del edificio",
    },
    coordinates: "19.4100, -99.1600",
    distanceKm: 6.5,
    items: [
      { quantity: 1, name: "Salmón Grillado", note: "Sin limón", price: 22.99 },
      { quantity: 1, name: "Vino Tinto Copa", price: 7.99 },
    ],
    subtotal: 30.98,
    shipping: 6.8,
    estimatedDelivery: "15:00",
  },
];

const COMPLETED_ORDERS: DeliveryOrder[] = [
  {
    id: "ORD-1235",
    createdAt: "13:00",
    status: "Entregado",
    customer: {
      name: "María García",
      phone: "+52 555-5678",
      address: "Polanco 456, CDMX",
    },
    coordinates: "",
    distanceKm: 4.8,
    items: [],
    subtotal: 40.66,
    shipping: 4.5,
    estimatedDelivery: "",
  },
  {
    id: "ORD-1236",
    createdAt: "12:30",
    status: "Entregado",
    customer: {
      name: "Carlos López",
      phone: "",
      address: "",
    },
    coordinates: "",
    distanceKm: 6.5,
    items: [],
    subtotal: 33.28,
    shipping: 4.5,
    estimatedDelivery: "",
  },
];

const HEADER_CLASS: Record<DeliveryStatus, string> = {
  "Pendiente de Recoger": styles.headerPending,
  Recogido: styles.headerRecogido,
  "En Tránsito": styles.headerTransito,
  Entregado: styles.headerEntregado,
  Cancelado: styles.headerCancelado,
};

const ICON_CLASS: Record<DeliveryStatus, string> = {
  "Pendiente de Recoger": styles.iconPending,
  Recogido: styles.iconRecogido,
  "En Tránsito": styles.iconTransito,
  Entregado: styles.iconEntregado,
  Cancelado: styles.iconCancelado,
};

const TITLE_CLASS: Record<DeliveryStatus, string> = {
  "Pendiente de Recoger": styles.titlePending,
  Recogido: styles.titleRecogido,
  "En Tránsito": styles.titleTransito,
  Entregado: styles.titleEntregado,
  Cancelado: styles.titleCancelado,
};

const BADGE_CLASS: Record<DeliveryStatus, string> = {
  "Pendiente de Recoger": styles.badgePending,
  Recogido: styles.badgeRecogido,
  "En Tránsito": styles.badgeTransito,
  Entregado: styles.badgeEntregado,
  Cancelado: styles.badgeCancelado,
};

function formatMoney(value: number): string {
  return `$${value.toFixed(2)}`;
}

function nextStatusLabel(status: DeliveryStatus): string | null {
  if (status === "Pendiente de Recoger") return "Marcar como Recogido";
  if (status === "Recogido") return "Iniciar Entrega";
  if (status === "En Tránsito") return "Marcar como Entregado";
  return null;
}

function getNextStatus(status: DeliveryStatus): DeliveryStatus | null {
  if (status === "Pendiente de Recoger") return "Recogido";
  if (status === "Recogido") return "En Tránsito";
  if (status === "En Tránsito") return "Entregado";
  return null;
}

function OrderCard({
  order,
  onAdvance,
  onCancel,
}: {
  order: DeliveryOrder;
  onAdvance: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  const total = order.subtotal + order.shipping;
  const advanceLabel = nextStatusLabel(order.status);
  const showCancel =
    order.status === "En Tránsito" || order.status === "Recogido";

  const advanceClass =
    order.status === "En Tránsito" ? styles.advanceGreen : styles.advanceDefault;

  return (
    <div className={styles.orderCard}>
      <div className={`${styles.orderHeader} ${HEADER_CLASS[order.status]}`}>
        <div className={styles.orderHeaderLeft}>
          <Package size={24} className={ICON_CLASS[order.status]} />
          <div>
            <h3 className={`${styles.orderTitle} ${TITLE_CLASS[order.status]}`}>
              Pedido #{order.id}
            </h3>
            <p className={styles.orderTime}>
              Realizado a las {order.createdAt}
            </p>
          </div>
        </div>
        <span className={`${styles.statusBadge} ${BADGE_CLASS[order.status]}`}>
          {order.status}
        </span>
      </div>

      <div className={styles.orderBody}>
        {/* Información del Cliente */}
        <div className={`${styles.infoBox} ${styles.infoBoxBlue}`}>
          <div className={styles.infoHeader}>
            <User size={16} className={styles.iconBlue} />
            <h4 className={styles.infoTitle}>Información del Cliente</h4>
          </div>
          <div className={styles.infoList}>
            <div className={styles.infoRow}>
              <User size={16} className={styles.iconGray} />
              <span>{order.customer.name}</span>
            </div>
            <div className={styles.infoRow}>
              <Phone size={16} className={styles.iconGray} />
              <span>{order.customer.phone}</span>
            </div>
            <div className={styles.infoRow}>
              <MapPin size={16} className={styles.iconGray} />
              <span>{order.customer.address}</span>
            </div>
          </div>
          {order.customer.note && (
            <div className={styles.infoNote}>
              <span className={styles.infoNoteLabel}>Nota:</span>{" "}
              <span>{order.customer.note}</span>
            </div>
          )}
        </div>

        {/* Ubicación y Distancia */}
        <div className={`${styles.infoBox} ${styles.infoBoxGreen}`}>
          <div className={styles.infoHeader}>
            <Navigation size={16} className={styles.iconGreen} />
            <h4 className={styles.infoTitle}>Ubicación y Distancia</h4>
          </div>
          <div className={styles.locationGrid}>
            <div>
              <p className={styles.locationLabel}>Coordenadas</p>
              <p className={styles.locationCoords}>{order.coordinates}</p>
            </div>
            <div>
              <p className={styles.locationLabel}>Distancia</p>
              <p className={styles.distanceValue}>{order.distanceKm} km</p>
            </div>
          </div>
          <button type="button" className={styles.mapsBtn}>
            <Navigation size={16} />
            Abrir en Maps
          </button>
        </div>

        {/* Comanda del Pedido */}
        <div className={`${styles.infoBox} ${styles.infoBoxGray}`}>
          <div className={styles.infoHeader}>
            <ShoppingBag size={16} className={styles.iconPurple} />
            <h4 className={styles.infoTitle}>Comanda del Pedido</h4>
          </div>
          <ul className={styles.itemsList}>
            {order.items.map((item, idx) => (
              <li key={`${order.id}-${idx}`} className={styles.itemRow}>
                <span className={styles.itemName}>
                  {item.quantity}x {item.name}
                  {item.note && (
                    <span className={styles.itemNote}> ({item.note})</span>
                  )}
                </span>
                <span className={styles.itemPrice}>
                  {formatMoney(item.price)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Resumen de Pago */}
        <div className={`${styles.infoBox} ${styles.infoBoxPurple}`}>
          <div className={styles.infoHeader}>
            <DollarSign size={16} className={styles.iconPurple} />
            <h4 className={styles.infoTitle}>Resumen de Pago</h4>
          </div>
          <div className={styles.paymentList}>
            <div className={styles.paymentRow}>
              <span className={styles.paymentLabel}>Subtotal:</span>
              <span className={styles.paymentValue}>
                {formatMoney(order.subtotal)}
              </span>
            </div>
            <div className={styles.paymentRow}>
              <span className={styles.paymentLabel}>Envío:</span>
              <span className={styles.paymentValue}>
                {formatMoney(order.shipping)}
              </span>
            </div>
            <div className={styles.totalRow}>
              <span className={styles.totalLabel}>Total:</span>
              <span className={styles.totalValue}>{formatMoney(total)}</span>
            </div>
          </div>
        </div>

        {/* Entrega estimada */}
        <div className={styles.estimateRow}>
          <div className={styles.estimateLabel}>
            <Clock size={16} />
            <span>Entrega estimada:</span>
          </div>
          <span className={styles.estimateValue}>
            {order.estimatedDelivery}
          </span>
        </div>

        {/* Botones de acción */}
        {advanceLabel && (
          <div
            className={`${styles.actionsGrid} ${showCancel ? styles.actionsTwo : styles.actionsOne}`}
          >
            <button
              type="button"
              onClick={() => onAdvance(order.id)}
              className={`${styles.advanceBtn} ${advanceClass}`}
            >
              <CheckCircle2 size={16} />
              {advanceLabel}
            </button>
            {showCancel && (
              <button
                type="button"
                onClick={() => onCancel(order.id)}
                className={styles.cancelBtn}
              >
                <XCircle size={16} />
                Cancelar
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DeliveryPage() {
  const [orders, setOrders] = useState<DeliveryOrder[]>(INITIAL_ORDERS);
  const [completed, setCompleted] =
    useState<DeliveryOrder[]>(COMPLETED_ORDERS);

  const repartidorName = "Roberto Martínez";

  const handleAdvance = (id: string) => {
    const target = orders.find((o) => o.id === id);
    if (!target) return;
    const next = getNextStatus(target.status);
    if (!next) return;

    if (next === "Entregado") {
      setCompleted((c) => [{ ...target, status: "Entregado" }, ...c]);
      setOrders((prev) => prev.filter((o) => o.id !== id));
      return;
    }

    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: next } : o)),
    );
  };

  const handleCancel = (id: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== id));
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
  };

  const stats = useMemo(() => {
    const pendientes = orders.filter(
      (o) => o.status === "Pendiente de Recoger",
    ).length;
    const recogidos = orders.filter((o) => o.status === "Recogido").length;
    const enTransito = orders.filter((o) => o.status === "En Tránsito").length;
    const entregados = completed.length;
    const recaudado = completed.reduce(
      (sum, o) => sum + o.subtotal + o.shipping,
      0,
    );
    const distancia = completed.reduce((sum, o) => sum + o.distanceKm, 0);
    return {
      pendientes,
      recogidos,
      enTransito,
      entregados,
      recaudado,
      distancia,
    };
  }, [orders, completed]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.headerRow}>
            <div className={styles.headerLeft}>
              <div className={styles.logo}>
                <Truck size={24} className={styles.logoIcon} />
              </div>
              <div>
                <h1 className={styles.title}>Panel de Repartidor</h1>
                <p className={styles.subtitle}>Gestión de Entregas</p>
              </div>
            </div>
            <div className={styles.headerRight}>
              <div className={styles.userInfo}>
                <p className={styles.userName}>{repartidorName}</p>
                <p className={styles.userRole}>Repartidor</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className={styles.logoutBtn}
              >
                <LogOut size={16} />
                Salir
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.grid}>
          <div className={styles.leftCol}>
            {/* Pedidos Activos */}
            <section className={styles.card}>
              <div className={styles.cardBody}>
                <h2 className={styles.sectionTitle}>Pedidos Activos</h2>
                <p className={styles.sectionSubtitle}>
                  Pedidos pendientes y en proceso de entrega
                </p>

                {orders.length === 0 ? (
                  <div className={styles.emptyState}>
                    <Package size={64} className={styles.emptyIcon} />
                    <p className={styles.emptyText}>No hay pedidos activos</p>
                  </div>
                ) : (
                  <div className={styles.ordersList}>
                    {orders.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        onAdvance={handleAdvance}
                        onCancel={handleCancel}
                      />
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Pedidos Completados */}
            <section className={styles.card}>
              <div className={styles.cardBody}>
                <h2 className={styles.sectionTitle}>Pedidos Completados</h2>
                <p className={styles.sectionSubtitle}>
                  Historial de entregas del día
                </p>

                {completed.length === 0 ? (
                  <p className={styles.completedEmpty}>
                    Aún no hay entregas completadas hoy.
                  </p>
                ) : (
                  <div className={styles.completedList}>
                    {completed.map((order, idx) => (
                      <div
                        key={`${order.id}-${idx}`}
                        className={styles.completedItem}
                      >
                        <div className={styles.completedLeft}>
                          <CheckCircle2
                            size={20}
                            className={styles.completedIcon}
                          />
                          <div>
                            <p className={styles.completedTitle}>
                              Pedido #{order.id}
                            </p>
                            <p className={styles.completedSub}>
                              {order.customer.name}
                            </p>
                            <p className={styles.completedDist}>
                              {order.distanceKm} km
                            </p>
                          </div>
                        </div>
                        <div className={styles.completedRight}>
                          <span
                            className={`${styles.statusBadge} ${styles.badgeEntregado}`}
                          >
                            Entregado
                          </span>
                          <span className={styles.completedAmount}>
                            {formatMoney(order.subtotal + order.shipping)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>

          <aside className={styles.rightCol}>
            {/* Resumen del Día */}
            <section className={styles.card}>
              <div className={styles.cardBody}>
                <h2 className={styles.sectionTitle}>Resumen del Día</h2>
                <div className={styles.summaryList}>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>
                      Pedidos Pendientes
                    </span>
                    <span
                      className={`${styles.summaryValue} ${styles.valueYellow}`}
                    >
                      {stats.pendientes}
                    </span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>En Tránsito</span>
                    <span
                      className={`${styles.summaryValue} ${styles.valuePurple}`}
                    >
                      {stats.enTransito}
                    </span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>Entregados Hoy</span>
                    <span
                      className={`${styles.summaryValue} ${styles.valueGreen}`}
                    >
                      {stats.entregados}
                    </span>
                  </div>
                  <div className={styles.summaryDivider}>
                    <span className={styles.summaryLabel}>Total Recaudado</span>
                    <span
                      className={`${styles.summaryValue} ${styles.valuePurpleStrong}`}
                    >
                      {formatMoney(stats.recaudado)}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Distancia Total */}
            <section className={styles.card}>
              <div className={styles.cardBody}>
                <h2 className={styles.sectionTitle}>Distancia Total</h2>
                <div className={styles.distanceCenter}>
                  <p>
                    <span className={styles.distanceNumber}>
                      {stats.distancia.toFixed(1)}
                    </span>
                    <span className={styles.distanceUnit}>km</span>
                  </p>
                  <p className={styles.distanceCaption}>Recorridos hoy</p>
                </div>
              </div>
            </section>

            {/* Estado de Pedidos */}
            <section className={styles.card}>
              <div className={styles.cardBody}>
                <h2 className={styles.sectionTitle}>Estado de Pedidos</h2>
                <ul className={styles.legendList}>
                  <li className={styles.legendRow}>
                    <span
                      className={`${styles.legendSwatch} ${styles.swatchYellow}`}
                    />
                    <span className={styles.legendLabel}>
                      Pendientes ({stats.pendientes})
                    </span>
                  </li>
                  <li className={styles.legendRow}>
                    <span
                      className={`${styles.legendSwatch} ${styles.swatchBlue}`}
                    />
                    <span className={styles.legendLabel}>
                      Recogidos ({stats.recogidos})
                    </span>
                  </li>
                  <li className={styles.legendRow}>
                    <span
                      className={`${styles.legendSwatch} ${styles.swatchPurple}`}
                    />
                    <span className={styles.legendLabel}>
                      En Tránsito ({stats.enTransito})
                    </span>
                  </li>
                  <li className={styles.legendRow}>
                    <span
                      className={`${styles.legendSwatch} ${styles.swatchGreen}`}
                    />
                    <span className={styles.legendLabel}>
                      Entregados ({stats.entregados})
                    </span>
                  </li>
                </ul>
              </div>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
