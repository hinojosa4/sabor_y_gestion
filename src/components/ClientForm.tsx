"use client";

import { useState } from "react";
import { IClient } from "@/hooks/useClientData";
import { X } from "lucide-react";

interface ClientFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (client: IClient) => Promise<void>;
  client: IClient | null;
}

interface FormErrors {
  name?: string;
  email?: string;
}

export function ClientForm({ isOpen, onClose, onSubmit, client }: ClientFormProps) {
  const [formData, setFormData] = useState({
    name: client?.name || "",
    email: client?.email || "",
    activo: client?.activo ?? true,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);

  if (!isOpen || !client) return null;

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.name.trim()) newErrors.name = "El nombre es obligatorio";
    else if (formData.name.length < 2) newErrors.name = "Mínimo 2 caracteres";
    if (!formData.email.trim()) newErrors.email = "El email es obligatorio";
    else if (!/^\S+@\S+\.\S+$/.test(formData.email)) newErrors.email = "Email inválido";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await onSubmit({ ...client, ...formData });
      onClose();
    } catch {
      /* error manejado arriba */
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = (hasError?: boolean): React.CSSProperties => ({
    width: "100%",
    boxSizing: "border-box",
    borderRadius: 9,
    border: `1.5px solid ${hasError ? "#ef4444" : "#e0e0e0"}`,
    padding: "9px 12px",
    fontSize: 14,
    color: "#1a1a1a",
    outline: "none",
    fontFamily: "'Georgia', serif",
    background: "#fafafa",
    transition: "border 0.15s",
  });

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 12,
    fontWeight: 700,
    color: "#555",
    marginBottom: 5,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    fontFamily: "'Georgia', serif",
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      {/* Overlay */}
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)" }} onClick={onClose} />

      {/* Modal */}
      <div style={{ position: "relative", zIndex: 10, background: "#fff", borderRadius: 20, width: "100%", maxWidth: 460, boxShadow: "0 20px 60px rgba(0,0,0,0.18)", fontFamily: "'Georgia', serif", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "24px 28px 20px", borderBottom: "1.5px solid #f0f0f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#1a1a1a" }}>Editar Cliente</h2>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#888" }}>Actualiza los datos del cliente</p>
          </div>
          <button
            onClick={onClose}
            style={{ background: "#f5f5f5", border: "none", borderRadius: "50%", width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          >
            <X size={16} color="#555" />
          </button>
        </div>

        {/* Avatar preview */}
        <div style={{ padding: "20px 28px 0", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg,#1a1a1a,#e85d26)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
            {formData.name.trim().charAt(0).toUpperCase() || "?"}
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#1a1a1a" }}>{formData.name || "Nombre del cliente"}</p>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#888" }}>{formData.email || "email@ejemplo.com"}</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: "20px 28px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Nombre */}
          <div>
            <label style={labelStyle}>Nombre completo <span style={{ color: "#e85d26" }}>*</span></label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              style={inputStyle(!!errors.name)}
              placeholder="Juan Pérez"
            />
            {errors.name && <p style={{ margin: "4px 0 0", fontSize: 11, color: "#ef4444" }}>{errors.name}</p>}
          </div>

          {/* Email */}
          <div>
            <label style={labelStyle}>Email <span style={{ color: "#e85d26" }}>*</span></label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
              style={inputStyle(!!errors.email)}
              placeholder="correo@ejemplo.com"
            />
            {errors.email && <p style={{ margin: "4px 0 0", fontSize: 11, color: "#ef4444" }}>{errors.email}</p>}
          </div>

          {/* Estado */}
          <div>
            <label style={labelStyle}>Estado</label>
            <div style={{ display: "flex", gap: 10 }}>
              {[{ label: "Activo", value: true }, { label: "Inactivo", value: false }].map((opt) => (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => setFormData((p) => ({ ...p, activo: opt.value }))}
                  style={{
                    flex: 1,
                    padding: "9px 0",
                    borderRadius: 9,
                    border: `1.5px solid ${formData.activo === opt.value ? (opt.value ? "#e85d26" : "#9ca3af") : "#e0e0e0"}`,
                    background: formData.activo === opt.value ? (opt.value ? "#fff5f0" : "#f3f4f6") : "#fafafa",
                    color: formData.activo === opt.value ? (opt.value ? "#e85d26" : "#6b7280") : "#999",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "all 0.15s",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Botones */}
          <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
            <button
              type="button"
              onClick={onClose}
              style={{ flex: 1, padding: "10px 0", borderRadius: 9, border: "1.5px solid #e0e0e0", background: "#f5f5f5", fontSize: 13, fontWeight: 600, color: "#555", cursor: "pointer", fontFamily: "inherit" }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{ flex: 1, padding: "10px 0", borderRadius: 9, border: "none", background: saving ? "#ccc" : "linear-gradient(135deg,#1a1a1a,#333)", fontSize: 13, fontWeight: 700, color: "#fff", cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit" }}
            >
              {saving ? "Guardando..." : "Guardar Cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}