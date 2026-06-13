// src/components/clientScreen/ConsumoHistory.tsx
import React from "react";
import { Receipt } from "lucide-react";
import { OrderCard, Order } from "./OrderCard";

interface ConsumoHistoryProps {
    orders: Order[];
    onViewOrder: (order: Order) => void;
}

export function ConsumoHistory({ orders, onViewOrder }: ConsumoHistoryProps) {
    return (
        <section style={styles.section}>
            <header style={styles.header}>
                <div style={styles.titleRow}>
                    <Receipt size={22} color="#111827" />
                    <h2 style={styles.title}>Historial de Consumo</h2>
                </div>
                <p style={styles.subtitle}>Haz clic en cualquier orden para ver los detalles completos</p>
            </header>

            <div style={styles.grid}>
                {orders.map((o) => (
                    <OrderCard key={o._id || o.id} order={o} onView={onViewOrder} />
                ))}
            </div>
        </section>
    );
}

const styles: { [key: string]: React.CSSProperties } = {
    section: {
        padding: "2rem",
        display: "flex",
        flexDirection: "column",
        gap: "1.25rem",
    },
    header: {
        display: "flex",
        flexDirection: "column",
        gap: "0.25rem",
    },
    titleRow: {
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
    },
    title: {
        margin: 0,
        fontSize: "1.4rem",
        fontWeight: 700,
        color: "#111827",
    },
    subtitle: {
        margin: 0,
        marginLeft: "1.85rem",
        fontSize: "0.9rem",
        color: "#6b7280",
    },
    grid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        gap: "1.25rem",
    },
};
