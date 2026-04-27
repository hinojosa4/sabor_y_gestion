"use client";

import { IClient } from "@/hooks/useClientData";
import { Mail, Calendar, Shield, Pencil, Trash2 } from "lucide-react";

interface ClientCardProps {
  client: IClient;
  onEdit: (client: IClient) => void;
  onDelete: (id: string) => void;
}

const formatDate = (dateValue: string): string => {
  if (!dateValue) return "No registrada";
  const [year, month, day] = dateValue.split("T")[0].split("-");
  return `${day}/${month}/${year}`;
};

// Agrega este array antes del componente ClientCard
const PALETTE = [
  { bar: "#e85d26", avatar: "linear-gradient(135deg,#e85d26,#f59e0b)" },
  { bar: "#1a1a1a", avatar: "linear-gradient(135deg,#1a1a1a,#404040)" },
  { bar: "#0e7490", avatar: "linear-gradient(135deg,#0e7490,#06b6d4)" },
  { bar: "#059669", avatar: "linear-gradient(135deg,#059669,#34d399)" },
  { bar: "#7c3aed", avatar: "linear-gradient(135deg,#7c3aed,#a78bfa)" },
  { bar: "#b45309", avatar: "linear-gradient(135deg,#b45309,#f59e0b)" },
  { bar: "#be185d", avatar: "linear-gradient(135deg,#be185d,#f472b6)" },
  { bar: "#1d4ed8", avatar: "linear-gradient(135deg,#1d4ed8,#60a5fa)" },
];

export function ClientCard({ client, onEdit, onDelete }: ClientCardProps) {
  const initials = client.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

// Índice determinístico basado en el _id para que no cambie al re-render
const colorIndex = client._id
  .split("")
  .reduce((acc, char) => acc + char.charCodeAt(0), 0) % PALETTE.length;
const color = PALETTE[colorIndex];
    
  return (
    <div
      style={{
        background: "#fff",
        border: "1.5px solid #e8e8e8",
        borderRadius: 18,
        overflow: "hidden",
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        transition: "transform 0.15s, box-shadow 0.15s",
        fontFamily: "'Georgia', serif",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 10px 28px rgba(0,0,0,0.10)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)";
      }}
    >
      {/* Top accent bar */}
      <div style={{ height: 4, background: client.activo ? color.bar : "#d1d5db" }} />

      <div style={{ padding: "20px 22px 18px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: "50%",
              background: client.activo ? color.avatar : "#d1d5db",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              fontWeight: 700,
              color: "#fff",
              flexShrink: 0,
              letterSpacing: 1,
            }}
          >
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#1a1a1a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {client.name}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "2px 10px",
                  borderRadius: 20,
                  background: client.activo ? "#dcfce7" : "#f3f4f6",
                  color: client.activo ? "#166534" : "#6b7280",
                  border: client.activo ? "1px solid #bbf7d0" : "1px solid #e5e7eb",
                }}
              >
                {client.activo ? "Activo" : "Inactivo"}
              </span>
              {client.googleId && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "2px 10px",
                    borderRadius: 20,
                    background: "#eff6ff",
                    color: "#1d4ed8",
                    border: "1px solid #bfdbfe",
                  }}
                >
                  Google
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Info */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#555", fontSize: 13 }}>
            <Mail size={14} style={{ flexShrink: 0, color: "#e85d26" }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{client.email}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#555", fontSize: 13 }}>
            <Calendar size={14} style={{ flexShrink: 0, color: "#e85d26" }} />
            <span>Registrado el {formatDate(client.createdAt)}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#555", fontSize: 13 }}>
            <Shield size={14} style={{ flexShrink: 0, color: "#e85d26" }} />
            <span style={{ textTransform: "capitalize" }}>Rol: {client.rol}</span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, borderTop: "1.5px solid #f0f0f0", paddingTop: 14 }}>
          <button
            onClick={() => onEdit(client)}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "8px 0",
              borderRadius: 9,
              border: "1.5px solid #e8e8e8",
              background: "#f8f8f8",
              fontSize: 12,
              fontWeight: 600,
              color: "#1a1a1a",
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#e85d2615")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#f8f8f8")}
          >
            <Pencil size={13} />
            Editar
          </button>
          <button
            onClick={() => onDelete(client._id)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "8px 14px",
              borderRadius: 9,
              border: "1.5px solid #fee2e2",
              background: "#fff5f5",
              cursor: "pointer",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#fee2e2")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#fff5f5")}
          >
            <Trash2 size={14} style={{ color: "#ef4444" }} />
          </button>
        </div>
      </div>
    </div>
  );
}