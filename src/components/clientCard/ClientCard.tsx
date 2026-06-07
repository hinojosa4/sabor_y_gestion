// src/components/clientCard/ClientCard.tsx
import React from "react";
import { Mail, Calendar, User, Pencil, Trash2 } from "lucide-react";

interface Client {
    _id: string;
    name: string;
    email: string;
    rol: string;
    activo: boolean;
    createdAt: string;
    loyaltyPoints?: number;
    loyaltyTier?: {
        name: string;
        discountPercent: number;
        totalPaidOrders?: number;
        totalSpent?: number;
    } | null;
}

interface ClientCardProps {
    client: Client;
    onEdit: (client: Client) => void;
    onDelete: (id: string) => void;
}

const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("es-BO");
};

export function ClientCard({ client, onEdit, onDelete }: ClientCardProps) {
    const cardStyle: React.CSSProperties = {
        borderRadius: "var(--radius-lg)",
        border: `1px solid var(--border)`,
        backgroundColor: "var(--card)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        transition: "box-shadow 0.2s ease",
        overflow: "hidden",
    };

    const contentStyle: React.CSSProperties = {
        padding: "calc(var(--radius-lg) * 2)",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
    };

    const nameStyle: React.CSSProperties = {
        margin: 0,
        color: "var(--foreground)",
    };

    const badgeRowStyle: React.CSSProperties = {
        display: "flex",
        flexWrap: "wrap",
        gap: "0.5rem",
        marginTop: "0.5rem",
    };

    const badgeStyle = (backgroundColor: string, color: string): React.CSSProperties => ({
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0.125rem 0.5rem",
        borderRadius: "var(--radius-md)",
        fontSize: "0.75rem",
        fontWeight: "var(--font-weight-medium)",
        backgroundColor,
        color,
        border: "none",
        maxWidth: "100%",
    });

    const statusBadgeStyle = (isActive: boolean): React.CSSProperties =>
        isActive
            ? badgeStyle("#dcfce7", "#166534")
            : badgeStyle("#fee2e2", "#991b1b");

    const loyaltyBadgeStyle: React.CSSProperties = badgeStyle("#ffedd5", "#9a3412");
    const loyaltyLabel = client.loyaltyTier
        ? `${client.loyaltyTier.name}${client.loyaltyTier.discountPercent > 0 ? ` · ${client.loyaltyTier.discountPercent}%` : ""}`
        : "Sin categoria";

    const infoContainerStyle: React.CSSProperties = {
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        fontSize: "0.875rem",
        color: "var(--muted-foreground)",
    };

    const infoRowStyle: React.CSSProperties = {
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        minWidth: 0,
    };

    const actionsContainerStyle: React.CSSProperties = {
        display: "flex",
        gap: "0.5rem",
        paddingTop: "0.5rem",
    };

    const editButtonStyle: React.CSSProperties = {
        flex: 1,
        backgroundColor: "var(--secondary)",
        border: `1px solid var(--border)`,
        borderRadius: "var(--radius-md)",
        padding: "0.5rem 0",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.5rem",
        color: "var(--secondary-foreground)",
        transition: "background 0.2s",
    };

    const deleteButtonStyle: React.CSSProperties = {
        backgroundColor: "transparent",
        border: `1px solid var(--border)`,
        borderRadius: "var(--radius-md)",
        padding: "0.5rem 0.75rem",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--destructive)",
        transition: "background 0.2s",
    };

    return (
        <div style={cardStyle}>
            <div style={contentStyle}>
                <div>
                    <h4 style={nameStyle}>{client.name}</h4>
                    <div style={badgeRowStyle}>
                        <span style={statusBadgeStyle(client.activo)}>
                            {client.activo ? "Activo" : "Inactivo"}
                        </span>
                        <span style={loyaltyBadgeStyle}>
                            {loyaltyLabel}
                        </span>
                    </div>
                </div>

                <div style={infoContainerStyle}>
                    <div style={infoRowStyle}>
                        <Mail size={16} style={{ flexShrink: 0 }} />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{client.email}</span>
                    </div>
                    <div style={infoRowStyle}>
                        <User size={16} style={{ flexShrink: 0 }} />
                        <span>{client.rol}</span>
                    </div>
                    <div style={infoRowStyle}>
                        <Calendar size={16} style={{ flexShrink: 0 }} />
                        <span>Desde {formatDate(client.createdAt)}</span>
                    </div>
                </div>

                <div style={actionsContainerStyle}>
                    <button style={editButtonStyle} onClick={() => onEdit(client)}>
                        <Pencil size={14} />
                        Editar
                    </button>
                    <button style={deleteButtonStyle} onClick={() => onDelete(client._id)}>
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
