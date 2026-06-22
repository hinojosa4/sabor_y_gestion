// src/components/clientScreen/ClientHeader.tsx
import React, { useState, useEffect } from "react";
import { User, Truck, CalendarDays, LogOut } from "lucide-react";

interface ClientHeaderProps {
    onDelivery?: () => void;
    onReservar?: () => void;
    onLogout?: () => void;
}

export function ClientHeader({ onDelivery, onReservar, onLogout }: ClientHeaderProps) {
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 640);
        check();
        window.addEventListener("resize", check);
        return () => window.removeEventListener("resize", check);
    }, []);

    return (
        <header style={{ ...styles.header, padding: isMobile ? "0.75rem 1rem" : "1rem 2rem" }}>
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
                <button style={styles.outlineBtn} onClick={onDelivery} title="Pedir delivery">
                    <Truck size={16} />
                    {!isMobile && <span>Pedir delivery</span>}
                </button>
                <button style={styles.outlineBtn} onClick={onReservar} title="Reservar mesa">
                    <CalendarDays size={16} />
                    {!isMobile && <span>Reservar mesa</span>}
                </button>
                <button style={styles.outlineBtn} onClick={onLogout} title="Salir">
                    <LogOut size={16} />
                    {!isMobile && <span>Salir</span>}
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