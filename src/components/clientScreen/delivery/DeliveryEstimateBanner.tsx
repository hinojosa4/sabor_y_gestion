// src/components/clientScreen/delivery/DeliveryEstimateBanner.tsx
import React from "react";
import { Clock } from "lucide-react";

interface DeliveryEstimateBannerProps {
    minMinutes?: number;
    maxMinutes?: number;
}

export function DeliveryEstimateBanner({
    minMinutes = 30,
    maxMinutes = 45,
}: DeliveryEstimateBannerProps) {
    return (
        <div style={styles.banner}>
            <div style={styles.row}>
                <Clock size={20} color="#8b5cf6" />
                <span style={styles.title}>
                    Tiempo de entrega estimado: {minMinutes}-{maxMinutes} minutos
                </span>
            </div>
            <p style={styles.subtitle}>
                Agrega tu ubicación en el checkout para calcular el costo exacto de envío
            </p>
        </div>
    );
}

const styles: { [key: string]: React.CSSProperties } = {
    banner: {
        backgroundColor: "#faf5ff",
        border: "1px solid #c4b5fd",
        borderRadius: 12,
        padding: "1rem 1.25rem",
    },
    row: {
        display: "flex",
        alignItems: "center",
        gap: "0.6rem",
    },
    title: {
        fontSize: "0.95rem",
        fontWeight: 600,
        color: "#5b21b6",
    },
    subtitle: {
        margin: 0,
        marginTop: 4,
        marginLeft: 28,
        fontSize: "0.8rem",
        color: "#6b21a8",
    },
};
