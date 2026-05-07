// src/components/clientScreen/delivery/OngoingOrder.tsx
import React, { useState } from "react";
import { Package, ChefHat, Clock, ArrowRight, Bike, CheckCircle2, PackageOpen, PlayCircle } from "lucide-react";

type OrderStatus = "Preparando" | "En camino" | "Entregado";

const STATUS_ORDER: OrderStatus[] = ["Preparando", "En camino", "Entregado"];

interface OngoingOrderProps {
    orderId?: string;
    placedAt?: string;
    estimatedTime?: string;
    totalPaid?: number;
}

export function OngoingOrder({
    orderId = "ORD-001",
    placedAt = "14:30",
    estimatedTime = "15:15",
    totalPaid = 45.99,
}: OngoingOrderProps) {
    const [hasOrder, setHasOrder] = useState(false);
    const [statusIndex, setStatusIndex] = useState(0);
    const status = STATUS_ORDER[statusIndex];
    const nextStatus = STATUS_ORDER[statusIndex + 1];

    const handleAdvance = () => {
        if (statusIndex < STATUS_ORDER.length - 1) {
            setStatusIndex(statusIndex + 1);
        }
    };

    const handleStartSimulation = () => {
        setStatusIndex(0);
        setHasOrder(true);
    };

    const progress = ((statusIndex + 1) / STATUS_ORDER.length) * 100;

    const meta = STATUS_META[status];

    if (!hasOrder) {
        return (
            <section style={styles.card}>
                <header style={styles.header}>
                    <Package size={18} color="#f97316" />
                    <h3 style={styles.title}>Pedido en curso</h3>
                </header>

                <div style={styles.emptyBody}>
                    <div style={styles.emptyIcon}>
                        <PackageOpen size={36} color="#fdba74" />
                    </div>
                    <p style={styles.emptyTitle}>No tienes pedidos en curso</p>
                    <p style={styles.emptyText}>
                        Cuando realices un pedido podrás seguir su estado aquí en tiempo real.
                    </p>

                    <button style={styles.simulateStartBtn} onClick={handleStartSimulation}>
                        <PlayCircle size={16} />
                        <span>Simular pedido en curso</span>
                    </button>
                </div>
            </section>
        );
    }

    return (
        <section style={styles.card}>
            <header style={styles.header}>
                <Package size={18} color="#f97316" />
                <h3 style={styles.title}>Pedido en Curso</h3>
            </header>

            <div style={styles.body}>
                <div style={styles.orderRow}>
                    <span style={styles.orderId}>Pedido #{orderId}</span>
                    <span style={styles.orderTime}>{placedAt}</span>
                </div>

                <div style={styles.statusBox}>
                    <div style={styles.statusHeader}>
                        {meta.icon}
                        <div>
                            <div style={styles.statusLabel}>{meta.label}</div>
                            <div style={styles.statusDescription}>{meta.description}</div>
                        </div>
                    </div>

                    <div style={styles.steps}>
                        {STATUS_ORDER.map((s, i) => (
                            <span
                                key={s}
                                style={{
                                    ...styles.stepLabel,
                                    color: i <= statusIndex ? "#f97316" : "#9ca3af",
                                    fontWeight: i === statusIndex ? 700 : 500,
                                }}
                            >
                                {s}
                            </span>
                        ))}
                    </div>

                    <div style={styles.progressTrack}>
                        <div style={{ ...styles.progressFill, width: `${progress}%` }} />
                    </div>
                </div>

                <div style={styles.metaRow}>
                    <div style={styles.metaLeft}>
                        <Clock size={15} color="#6b7280" />
                        <span style={styles.metaLabel}>Tiempo estimado:</span>
                    </div>
                    <span style={styles.metaValue}>{estimatedTime}</span>
                </div>

                <div style={styles.divider} />

                <div style={styles.metaRow}>
                    <span style={styles.metaLabel}>Total pagado:</span>
                    <span style={styles.totalPaid}>${totalPaid.toFixed(2)}</span>
                </div>

                <div style={styles.simulateBox}>
                    <p style={styles.simulateLabel}>Simular cambio de estado:</p>
                    <button
                        style={{
                            ...styles.simulateBtn,
                            ...(nextStatus ? null : styles.simulateBtnDisabled),
                        }}
                        onClick={handleAdvance}
                        disabled={!nextStatus}
                    >
                        <ArrowRight size={14} />
                        <span>{nextStatus ?? "Pedido finalizado"}</span>
                    </button>
                </div>
            </div>
        </section>
    );
}

const STATUS_META: Record<
    OrderStatus,
    { icon: React.ReactNode; label: string; description: string }
> = {
    Preparando: {
        icon: <ChefHat size={20} color="#c2410c" />,
        label: "En Preparación",
        description: "Tu pedido está siendo preparado en la cocina",
    },
    "En camino": {
        icon: <Bike size={20} color="#c2410c" />,
        label: "En Camino",
        description: "El repartidor ya salió hacia tu dirección",
    },
    Entregado: {
        icon: <CheckCircle2 size={20} color="#15803d" />,
        label: "Entregado",
        description: "Disfruta tu comida. ¡Buen provecho!",
    },
};

const styles: { [key: string]: React.CSSProperties } = {
    card: {
        backgroundColor: "#ffffff",
        borderRadius: 14,
        border: "1px solid #fed7aa",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
    },
    header: {
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        backgroundColor: "#fff7ed",
        padding: "0.85rem 1.1rem",
        borderBottom: "1px solid #fed7aa",
    },
    title: {
        margin: 0,
        fontSize: "1rem",
        fontWeight: 700,
        color: "#9a3412",
    },
    body: {
        padding: "1rem 1.1rem 1.1rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.85rem",
    },
    emptyBody: {
        padding: "1.5rem 1.25rem 1.25rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.5rem",
        textAlign: "center",
    },
    emptyIcon: {
        width: 64,
        height: 64,
        borderRadius: 12,
        backgroundColor: "#fff7ed",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: "0.25rem",
    },
    emptyTitle: {
        margin: 0,
        fontSize: "0.95rem",
        fontWeight: 600,
        color: "#111827",
    },
    emptyText: {
        margin: 0,
        fontSize: "0.8rem",
        color: "#6b7280",
        lineHeight: 1.4,
    },
    simulateStartBtn: {
        marginTop: "0.75rem",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.4rem",
        padding: "0.6rem 1rem",
        backgroundColor: "#f97316",
        color: "#ffffff",
        border: "none",
        borderRadius: 8,
        cursor: "pointer",
        fontSize: "0.85rem",
        fontWeight: 600,
    },
    orderRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
    },
    orderId: {
        fontSize: "0.875rem",
        color: "#374151",
        fontWeight: 500,
    },
    orderTime: {
        fontSize: "0.875rem",
        color: "#111827",
        fontWeight: 600,
    },
    statusBox: {
        backgroundColor: "#fff7ed",
        border: "1px solid #fdba74",
        borderRadius: 10,
        padding: "0.85rem 1rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.7rem",
    },
    statusHeader: {
        display: "flex",
        alignItems: "flex-start",
        gap: "0.6rem",
    },
    statusLabel: {
        fontSize: "0.95rem",
        fontWeight: 700,
        color: "#9a3412",
    },
    statusDescription: {
        fontSize: "0.8rem",
        color: "#9a3412",
        marginTop: 2,
    },
    steps: {
        display: "flex",
        justifyContent: "space-between",
        fontSize: "0.75rem",
    },
    stepLabel: {
        textAlign: "center",
        flex: 1,
    },
    progressTrack: {
        position: "relative",
        height: 6,
        borderRadius: 999,
        backgroundColor: "#fed7aa",
        overflow: "hidden",
    },
    progressFill: {
        height: "100%",
        background: "linear-gradient(90deg, #f97316, #ea580c)",
        transition: "width 0.4s ease",
    },
    metaRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: "0.875rem",
    },
    metaLeft: {
        display: "flex",
        alignItems: "center",
        gap: "0.4rem",
    },
    metaLabel: {
        color: "#6b7280",
    },
    metaValue: {
        color: "#111827",
        fontWeight: 700,
    },
    totalPaid: {
        color: "#8b5cf6",
        fontWeight: 700,
        fontSize: "1.05rem",
    },
    divider: {
        height: 1,
        backgroundColor: "#f3f4f6",
    },
    simulateBox: {
        display: "flex",
        flexDirection: "column",
        gap: "0.4rem",
    },
    simulateLabel: {
        margin: 0,
        fontSize: "0.78rem",
        color: "#6b7280",
        textAlign: "center",
    },
    simulateBtn: {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.4rem",
        padding: "0.55rem 0.85rem",
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        backgroundColor: "#ffffff",
        color: "#111827",
        cursor: "pointer",
        fontSize: "0.8rem",
        fontWeight: 600,
        transition: "background 0.15s",
    },
    simulateBtnDisabled: {
        opacity: 0.5,
        cursor: "not-allowed",
    },
};
