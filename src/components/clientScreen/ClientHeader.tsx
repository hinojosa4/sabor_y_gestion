// src/components/clientScreen/ClientHeader.tsx
import React from "react";
import { User, Truck, CalendarDays, LogOut } from "lucide-react";

interface ClientHeaderProps {
    onDelivery?: () => void;
    onReservar?: () => void;
    onLogout?: () => void;
}

export function ClientHeader({ onDelivery, onReservar, onLogout }: ClientHeaderProps) {
    return (
        <header style={styles.header}>
            <div style={styles.left}>
                <div style={styles.iconBox}>
                    <User size={22} color="#ffffff" />
                </div>
                <div>
                    <h1 style={styles.title}>Mi Cuenta</h1>
                    <p style={styles.subtitle}>Panel de Cliente</p>
                </div>
            </div>

            <div style={styles.right}>
                <button style={styles.outlineBtn} onClick={onDelivery}>
                    <Truck size={16} />
                    <span>Pedir delivery</span>
                </button>
                <button style={styles.outlineBtn} onClick={onReservar}>
                    <CalendarDays size={16} />
                    <span>Reservar mesa</span>
                </button>
                <button style={styles.outlineBtn} onClick={onLogout}>
                    <LogOut size={16} />
                    <span>Salir</span>
                </button>
            </div>
        </header>
    );
}

const styles: { [key: string]: React.CSSProperties } = {
    header: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "1rem 2rem",
        borderBottom: "1px solid #e5e7eb",
        backgroundColor: "#ffffff",
        flexWrap: "wrap",
        gap: "1rem",
    },
    left: {
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: "#f97316",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    title: {
        fontSize: "1.25rem",
        fontWeight: 700,
        color: "#111827",
        margin: 0,
        lineHeight: 1.2,
    },
    subtitle: {
        fontSize: "0.85rem",
        color: "#6b7280",
        margin: 0,
        marginTop: 2,
    },
    right: {
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
    },
    outlineBtn: {
        display: "inline-flex",
        alignItems: "center",
        gap: "0.4rem",
        padding: "0.5rem 0.85rem",
        backgroundColor: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        cursor: "pointer",
        fontSize: "0.875rem",
        fontWeight: 500,
        color: "#111827",
        transition: "background 0.2s",
    },
};