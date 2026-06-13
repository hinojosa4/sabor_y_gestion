// src/components/clientScreen/OrderModal.tsx
import React, { useEffect, useState } from "react";
import { Receipt, Clock, MapPin, CreditCard, Wallet, Banknote, X } from "lucide-react";
import { getPusherClient } from "@/lib/pusherClient";
import { DeliveryTrackingMap } from "@/components/clientScreen/delivery/DeliveryTrackingMap";
import { Order, PaymentMethod } from "./OrderCard";

interface OrderModalProps {
    order: Order | null;
    open: boolean;
    onClose: () => void;
    onReorder?: (order: Order) => void;
}

function getPaymentIcon(method: PaymentMethod) {
    switch (method) {
        case "Efectivo":
            return <Banknote size={18} color="#6b7280" />;
        case "Tarjeta de Débito":
            return <Wallet size={18} color="#6b7280" />;
        case "Tarjeta de Crédito":
            return <CreditCard size={18} color="#6b7280" />;
    }
}

// ── Status Progress Component ──────────────────────────────────────────────────

function StatusProgress({ status }: { status: Order["status"] }) {
    const steps = ["Pedido recibido", "Preparando", "En camino", "Entregado"];
    const currentStepIndex = (() => {
        if (status === "Pendiente") return 0;
        if (status === "En cocina" || status === "Listo") return 1;
        if (status === "En camino") return 2;
        if (status === "Completado") return 3;
        return -1;
    })();

    return (
        <div style={spStyles.container}>
            <div style={spStyles.lineBackground} />
            <div style={{
                ...spStyles.lineForeground,
                width: `${(Math.max(0, currentStepIndex) / (steps.length - 1)) * 100}%`
            }} />
            
            <div style={spStyles.stepsRow}>
                {steps.map((step, i) => {
                    const isCompleted = i < currentStepIndex;
                    const isCurrent = i === currentStepIndex;
                    return (
                        <div key={step} style={spStyles.stepItem}>
                            <div style={{
                                ...spStyles.dot,
                                backgroundColor: isCompleted || isCurrent ? "#f97316" : "#fff",
                                borderColor: isCompleted || isCurrent ? "#f97316" : "#e5e7eb",
                            }}>
                                {isCompleted && <span style={spStyles.check}>✓</span>}
                                {isCurrent && <div style={spStyles.pulseDot} />}
                            </div>
                            <span style={{
                                ...spStyles.label,
                                color: isCurrent ? "#f97316" : isCompleted ? "#111827" : "#9ca3af",
                                fontWeight: isCurrent || isCompleted ? 700 : 500
                            }}>{step}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

const spStyles: { [key: string]: React.CSSProperties } = {
    container: { position: "relative", padding: "10px 0 25px", marginTop: 10 },
    lineBackground: { position: "absolute", top: 22, left: "12%", right: "12%", height: 3, backgroundColor: "#f3f4f6", borderRadius: 2 },
    lineForeground: { position: "absolute", top: 22, left: "12%", height: 3, backgroundColor: "#f97316", borderRadius: 2, transition: "width 0.5s ease" },
    stepsRow: { display: "flex", justifyContent: "space-between", position: "relative", zIndex: 1 },
    stepItem: { display: "flex", flexDirection: "column", alignItems: "center", gap: 8, width: "25%" },
    dot: { width: 24, height: 24, borderRadius: "50%", border: "2px solid", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#fff", transition: "all 0.3s ease" },
    check: { color: "#fff", fontSize: 12, fontWeight: 900 },
    pulseDot: { width: 8, height: 8, borderRadius: "50%", backgroundColor: "#fff" },
    label: { fontSize: 11, textAlign: "center", lineHeight: 1.2 },
};

export function OrderModal({ order, open, onClose, onReorder }: OrderModalProps) {
    const [liveDriverCoords, setLiveDriverCoords] = useState<{
        orderId: string;
        coords: NonNullable<Order["driverLocation"]>;
    } | null>(null);

    useEffect(() => {
        if (!open || !order?._id) return;

        const orderId = order._id;
        const token = localStorage.getItem("token");
        let cancelled = false;

        const applyDriverLocation = (location: {
            lat?: number | null;
            lng?: number | null;
            updatedAt?: string | Date | null;
        }) => {
            if (cancelled || location?.lat == null || location?.lng == null) return;
            setLiveDriverCoords({
                orderId,
                coords: {
                    lat: location.lat,
                    lng: location.lng,
                    updatedAt: location.updatedAt
                        ? new Date(location.updatedAt).toISOString()
                        : new Date().toISOString(),
                },
            });
        };

        const refreshDriverLocation = () => {
            if (!token) return;
            fetch(`/api/orders/cliente/${orderId}`, {
                headers: { Authorization: `Bearer ${token}` },
            })
                .then((res) => res.json())
                .then((json) => {
                    if (json?.ok) applyDriverLocation(json.data?.driver_location);
                })
                .catch(() => {
                    // Pusher seguira intentando actualizar en vivo.
                });
        };

        refreshDriverLocation();
        const pollId = window.setInterval(refreshDriverLocation, 3000);

        getPusherClient().then((client) => {
            if (cancelled) return;
            const channel = client.subscribe(`order-${orderId}`);
            channel.bind("driver:location", (data: {
                orderId: string;
                lat: number;
                lng: number;
                updatedAt: string;
            }) => {
                if (data.orderId !== orderId) return;
                applyDriverLocation(data);
            });
        });

        return () => {
            cancelled = true;
            window.clearInterval(pollId);
            getPusherClient().then((client) => {
                client.unsubscribe(`order-${orderId}`);
            });
        };
    }, [open, order?._id]);

    if (!open || !order) return null;

    const driverCoords =
        liveDriverCoords && liveDriverCoords.orderId === order._id
            ? liveDriverCoords.coords
            : order.driverLocation ?? null;

    const showTrackingMap =
        order.serviceType === "delivery" &&
        !!order.deliveryCoords &&
        order.rawStatus === "in_transit";

    const showTrackingSection = 
        order.serviceType === "delivery" &&
        order.status !== "Completado" &&
        order.status !== "Cancelado";

    const getPaymentStatus = () => {
        if (order.paymentMethod === "Efectivo") return "Pago al recibir";
        if (order.payment?.status === "completed") return "Pago confirmado";
        return "Pago pendiente de verificación";
    };

    const getTrackingSubtitle = () => {
        if (order.rawStatus === "in_transit") return "Tu pedido está en camino a tu ubicación";
        if (order.rawStatus === "picked_up") return "El repartidor ha recogido tu pedido y está por iniciar el viaje";
        return "El seguimiento estará disponible cuando el repartidor recoja tu pedido";
    };

    return (
        <div style={styles.overlay} onClick={onClose}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                <button style={styles.closeBtn} onClick={onClose} aria-label="Cerrar">
                    <X size={20} color="#6b7280" />
                </button>

                <div style={styles.headerRow}>
                    <div style={styles.headerIcon}>
                        <Receipt size={24} color="#f97316" />
                    </div>
                    <div>
                        <h2 style={styles.title}>Orden #{order.id}</h2>
                        <p style={styles.subtitle}>Detalle completo de tu orden</p>
                    </div>
                </div>

                <div style={styles.infoCard}>
                    <div style={styles.infoHeader}>
                        <div>
                            <h3 style={styles.infoTitle}>Estado del Pedido</h3>
                            <p style={styles.infoDate}>{order.date}</p>
                        </div>
                        <span style={styles.statusBadge}>{order.status}</span>
                    </div>
                    
                    <div style={{ padding: "0 1.5rem" }}>
                        <StatusProgress status={order.status} />
                    </div>

                    <div style={styles.infoGrid}>
                        <InfoItem icon={<Clock size={18} color="#6b7280" />} label="Hora" value={order.time} />
                        <InfoItem icon={<MapPin size={18} color="#6b7280" />} label="Ubicación" value={order.location} />
                        <InfoItem
                            icon={getPaymentIcon(order.paymentMethod)}
                            label="Método de Pago"
                            value={order.paymentMethod}
                        />
                         <InfoItem 
                            icon={<CreditCard size={18} color="#6b7280" />} 
                            label="Estado de Pago" 
                            value={getPaymentStatus()} 
                        />
                    </div>
                </div>

                {showTrackingSection && (
                    <div style={styles.trackingCard}>
                        <div style={styles.trackingHeader}>
                            <div>
                                <h3 style={styles.trackingTitle}>Seguimiento del delivery</h3>
                                <p style={styles.trackingSubtitle}>
                                    {getTrackingSubtitle()}
                                </p>
                            </div>
                        </div>
                        
                        {showTrackingMap ? (
                            <>
                                <DeliveryTrackingMap
                                    customerCoords={order.deliveryCoords!}
                                    driverCoords={driverCoords}
                                />
                                <div style={styles.trackingLegend}>
                                    <span>R: restaurante</span>
                                    <span>C: entrega</span>
                                    <span>D: repartidor</span>
                                </div>
                                {driverCoords?.updatedAt && (
                                    <p style={styles.trackingUpdated}>
                                        Ultima actualizacion: {new Date(driverCoords.updatedAt).toLocaleTimeString("es-BO", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                            second: "2-digit",
                                        })}
                                    </p>
                                )}
                            </>
                        ) : order.rawStatus === "in_transit" && !driverCoords ? (
                            <p style={styles.trackingWaiting}>
                                El repartidor ha iniciado la entrega. Esperando señal de ubicación...
                            </p>
                        ) : order.rawStatus === "picked_up" ? (
                             <p style={styles.trackingWaiting}>
                                El repartidor ya tiene tu pedido. El mapa aparecerá cuando inicie el viaje.
                            </p>
                        ) : null}
                    </div>
                )}

                <div style={styles.productsCard}>
                    <h3 style={styles.productsTitle}>Productos</h3>

                    <ul style={styles.productList}>
                        {order.items.map((item, i) => (
                            <li key={i} style={styles.productItem}>
                                <div>
                                    <p style={styles.productName}>{item.name}</p>
                                    <p style={styles.productMeta}>
                                        Cantidad: {item.quantity} × Bs. {item.unitPrice.toFixed(2)}
                                    </p>
                                </div>
                                <span style={styles.productPrice}>
                                    Bs. {(item.quantity * item.unitPrice).toFixed(2)}
                                </span>
                            </li>
                        ))}
                    </ul>

                    <div style={styles.totalRow}>
                        <span style={styles.totalLabel}>Total</span>
                        <span style={styles.totalValue}>Bs. {order.total.toFixed(2)}</span>
                    </div>
                </div>

                <div style={styles.actions}>
                    <button style={styles.secondaryBtn} onClick={onClose}>
                        Cerrar
                    </button>
                    <button style={styles.primaryBtn} onClick={() => onReorder?.(order)}>
                        Volver a Pedir
                    </button>
                </div>
            </div>
        </div>
    );
}

interface InfoItemProps {
    icon: React.ReactNode;
    label: string;
    value: string;
}

function InfoItem({ icon, label, value }: InfoItemProps) {
    return (
        <div style={styles.infoItem}>
            <div style={styles.infoItemIcon}>{icon}</div>
            <div>
                <p style={styles.infoItemLabel}>{label}</p>
                <p style={styles.infoItemValue}>{value}</p>
            </div>
        </div>
    );
}

const styles: { [key: string]: React.CSSProperties } = {
    overlay: {
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(17, 24, 39, 0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "1rem",
    },
    modal: {
        backgroundColor: "#ffffff",
        borderRadius: 16,
        width: "100%",
        maxWidth: 560,
        maxHeight: "90vh",
        overflowY: "auto",
        position: "relative",
        padding: "1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
    },
    closeBtn: {
        position: "absolute",
        top: 14,
        right: 14,
        background: "transparent",
        border: "none",
        cursor: "pointer",
        padding: 4,
        borderRadius: 6,
    },
    headerRow: {
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        paddingRight: "2rem",
        flexShrink: 0,
    },
    headerIcon: {
        width: 44,
        height: 44,
        borderRadius: 10,
        backgroundColor: "#fff7ed",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    title: {
        margin: 0,
        fontSize: "1.4rem",
        fontWeight: 700,
        color: "#111827",
    },
    subtitle: {
        margin: 0,
        marginTop: 2,
        fontSize: "0.875rem",
        color: "#6b7280",
    },
    infoCard: {
        border: "1px solid #f3f4f6",
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: "#ffffff",
        flexShrink: 0,
    },
    infoHeader: {
        backgroundColor: "#f97316",
        padding: "1.1rem 1.5rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "0.5rem",
    },
    infoTitle: {
        margin: 0,
        color: "#ffffff",
        fontSize: "1.05rem",
        fontWeight: 700,
    },
    infoDate: {
        margin: 0,
        marginTop: 4,
        color: "rgba(255,255,255,0.95)",
        fontSize: "0.9rem",
    },
    statusBadge: {
        backgroundColor: "#ffffff",
        color: "#f97316",
        fontSize: "0.78rem",
        fontWeight: 600,
        padding: "0.3rem 0.85rem",
        borderRadius: 999,
        whiteSpace: "nowrap",
    },
    infoGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: "1.25rem 1rem",
        padding: "1.25rem 1.5rem",
    },
    infoItem: {
        display: "flex",
        alignItems: "flex-start",
        gap: "0.65rem",
    },
    infoItemIcon: {
        marginTop: 3,
        flexShrink: 0,
    },
    infoItemLabel: {
        margin: 0,
        fontSize: "0.82rem",
        color: "#6b7280",
    },
    infoItemValue: {
        margin: 0,
        marginTop: 3,
        fontSize: "1rem",
        fontWeight: 700,
        color: "#111827",
    },
    productsCard: {
        border: "1px solid #f3f4f6",
        borderRadius: 12,
        padding: "1.1rem 1.25rem",
        flexShrink: 0,
    },
    trackingCard: {
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: "1rem",
        backgroundColor: "#ffffff",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        flexShrink: 0,
    },
    trackingHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: "1rem",
    },
    trackingTitle: {
        margin: 0,
        fontSize: "1rem",
        fontWeight: 700,
        color: "#111827",
    },
    trackingSubtitle: {
        margin: "0.25rem 0 0",
        fontSize: "0.85rem",
        color: "#6b7280",
    },
    trackingLegend: {
        display: "flex",
        gap: "0.75rem",
        flexWrap: "wrap",
        color: "#6b7280",
        fontSize: "0.75rem",
        fontWeight: 600,
    },
    trackingUpdated: {
        margin: 0,
        color: "#4b5563",
        fontSize: "0.78rem",
        fontWeight: 600,
    },
    trackingWaiting: {
        margin: 0,
        color: "#92400e",
        backgroundColor: "#fffbeb",
        border: "1px solid #fde68a",
        borderRadius: 8,
        padding: "0.65rem 0.75rem",
        fontSize: "0.85rem",
    },
    productsTitle: {
        margin: 0,
        fontSize: "1rem",
        fontWeight: 700,
        color: "#111827",
        marginBottom: "0.5rem",
    },
    productList: {
        listStyle: "none",
        padding: 0,
        margin: 0,
    },
    productItem: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        padding: "0.75rem 0",
        borderBottom: "1px solid #f3f4f6",
        gap: "0.5rem",
    },
    productName: {
        margin: 0,
        fontSize: "0.95rem",
        fontWeight: 600,
        color: "#111827",
    },
    productMeta: {
        margin: 0,
        marginTop: 2,
        fontSize: "0.8rem",
        color: "#6b7280",
    },
    productPrice: {
        fontSize: "0.95rem",
        fontWeight: 700,
        color: "#f97316",
        whiteSpace: "nowrap",
    },
    totalRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: "0.85rem",
        marginTop: "0.25rem",
    },
    totalLabel: {
        fontSize: "1.05rem",
        fontWeight: 700,
        color: "#111827",
    },
    totalValue: {
        fontSize: "1.4rem",
        fontWeight: 700,
        color: "#10b981",
    },
    actions: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "0.75rem",
        marginTop: "0.25rem",
        flexShrink: 0,
    },
    secondaryBtn: {
        backgroundColor: "#ffffff",
        color: "#111827",
        border: "1px solid #e5e7eb",
        borderRadius: 10,
        padding: "0.75rem 1rem",
        fontSize: "0.95rem",
        fontWeight: 600,
        cursor: "pointer",
    },
    primaryBtn: {
        backgroundColor: "#f97316",
        color: "#ffffff",
        border: "none",
        borderRadius: 10,
        padding: "0.75rem 1rem",
        fontSize: "0.95rem",
        fontWeight: 600,
        cursor: "pointer",
    },
};
