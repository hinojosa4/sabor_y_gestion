// src/components/clientScreen/ClientInfoCard.tsx
import React from "react";
import { User, Sparkles, ShoppingBag, DollarSign, TrendingUp, Award, Star, ChevronRight } from "lucide-react";

export interface ClientStats {
    name: string;
    memberSince: string;
    totalVisits: number;
    totalSpent: number;
    average: number;
    points: number;
    benefits: string[];
    tierName?: string;
    discountPercent?: number;
    isNew?: boolean;
}

interface ClientInfoCardProps {
    data: ClientStats;
}

export function ClientInfoCard({ data }: ClientInfoCardProps) {
    return (
        <section style={styles.wrapper}>
            <div style={styles.gradientCard}>
                <div style={styles.gradientLeft}>
                    <div style={styles.avatarCircle}>
                        <User size={32} color="#f97316" />
                    </div>
                    <div>
                        <h2 style={styles.clientName}>{data.name}</h2>
                        <p style={styles.memberSince}>Miembro desde {data.memberSince}</p>
                    </div>
                </div>
                {(data.tierName || data.isNew) && (
                    <button style={styles.newBadge}>
                        <Sparkles size={14} />
                        <span>{data.tierName ?? "Cliente Nuevo"}</span>
                    </button>
                )}
            </div>

            <div style={styles.statsGrid}>
                <StatBox
                    bg="#eef2ff"
                    icon={<ShoppingBag size={22} color="#4f46e5" />}
                    label="Total Visitas"
                    value={String(data.totalVisits)}
                    valueColor="#111827"
                />
                <StatBox
                    bg="#ecfdf5"
                    icon={<DollarSign size={22} color="#10b981" />}
                    label="Total Gastado"
                    value={`Bs ${data.totalSpent.toFixed(2)}`}
                    valueColor="#10b981"
                />
                <StatBox
                    bg="#faf5ff"
                    icon={<TrendingUp size={22} color="#8b5cf6" />}
                    label="Promedio"
                    value={`Bs ${data.average.toFixed(2)}`}
                    valueColor="#8b5cf6"
                />
                <StatBox
                    bg="#fff7ed"
                    icon={<Award size={22} color="#f97316" />}
                    label="Puntos"
                    value={String(data.points)}
                    valueColor="#f97316"
                />
            </div>

            <div style={styles.benefitsCard}>
                <div style={styles.benefitsHeader}>
                    <Star size={18} color="#f97316" />
                    <h3 style={styles.benefitsTitle}>Tus Beneficios</h3>
                    {data.discountPercent ? (
                        <span style={styles.discountBadge}>{data.discountPercent}% dto.</span>
                    ) : null}
                </div>
                <div style={styles.benefitsGrid}>
                    {data.benefits.map((b, i) => (
                        <div key={i} style={styles.benefitItem}>
                            <ChevronRight size={16} color="#f97316" />
                            <span>{b}</span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

interface StatBoxProps {
    bg: string;
    icon: React.ReactNode;
    label: string;
    value: string;
    valueColor: string;
}

function StatBox({ bg, icon, label, value, valueColor }: StatBoxProps) {
    return (
        <div style={{ ...styles.statBox, backgroundColor: bg }}>
            <div style={styles.statIcon}>{icon}</div>
            <div style={styles.statLabel}>{label}</div>
            <div style={{ ...styles.statValue, color: valueColor }}>{value}</div>
        </div>
    );
}

const styles: { [key: string]: React.CSSProperties } = {
    wrapper: {
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        padding: "1rem 2rem 0",
    },
    gradientCard: {
        background: "linear-gradient(90deg, #f97316 0%, #c026d3 100%)",
        borderRadius: 16,
        padding: "1.5rem 1.75rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "1rem",
        color: "#ffffff",
    },
    gradientLeft: {
        display: "flex",
        alignItems: "center",
        gap: "1rem",
    },
    avatarCircle: {
        width: 56,
        height: 56,
        borderRadius: "50%",
        backgroundColor: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    clientName: {
        margin: 0,
        fontSize: "1.5rem",
        fontWeight: 700,
        color: "#ffffff",
    },
    memberSince: {
        margin: 0,
        marginTop: 2,
        fontSize: "0.9rem",
        color: "rgba(255,255,255,0.9)",
    },
    newBadge: {
        display: "inline-flex",
        alignItems: "center",
        gap: "0.4rem",
        backgroundColor: "rgba(255,255,255,0.18)",
        border: "1px solid rgba(255,255,255,0.35)",
        color: "#ffffff",
        padding: "0.55rem 1rem",
        borderRadius: 8,
        cursor: "pointer",
        fontSize: "0.875rem",
        fontWeight: 500,
    },
    statsGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "1rem",
    },
    statBox: {
        borderRadius: 14,
        padding: "1.25rem 1rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.4rem",
        textAlign: "center",
    },
    statIcon: {
        marginBottom: "0.25rem",
    },
    statLabel: {
        fontSize: "0.85rem",
        color: "#6b7280",
    },
    statValue: {
        fontSize: "1.4rem",
        fontWeight: 700,
    },
    benefitsCard: {
        backgroundColor: "#fffbeb",
        border: "1px solid #fde68a",
        borderRadius: 14,
        padding: "1.25rem 1.25rem",
    },
    benefitsHeader: {
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        marginBottom: "0.75rem",
        flexWrap: "wrap",
    },
    benefitsTitle: {
        margin: 0,
        fontSize: "1rem",
        fontWeight: 700,
        color: "#111827",
    },
    benefitsGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: "0.4rem 1.5rem",
        fontSize: "0.875rem",
        color: "#374151",
    },
    discountBadge: {
        marginLeft: "auto",
        borderRadius: 8,
        backgroundColor: "#fff7ed",
        border: "1px solid #fed7aa",
        color: "#c2410c",
        padding: "0.25rem 0.55rem",
        fontSize: "0.78rem",
        fontWeight: 700,
    },
    benefitItem: {
        display: "flex",
        alignItems: "center",
        gap: "0.4rem",
    },
};
