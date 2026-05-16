// src/components/clientScreen/ReservationModal.tsx
"use client";

import React, { useState } from "react";
import { Calendar, Clock, Users, Phone, User, Star, FileText, X } from "lucide-react";

interface ReservationForm {
  contact_name: string;
  contact_lastname: string;
  contact_phone: string;
  party_size: number;
  date: string;       // "YYYY-MM-DD"
  time: string;       // "HH:MM"
  occasion: string;
  special_requests: string;
}

const OCCASIONS = ["", "Cumpleaños", "Aniversario", "Reunión de negocios", "Celebración", "Otro"];

const EMPTY: ReservationForm = {
  contact_name: "",
  contact_lastname: "",
  contact_phone: "",
  party_size: 2,
  date: "",
  time: "20:00",
  occasion: "",
  special_requests: "",
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ReservationModal({ open, onClose, onSuccess }: Props) {
  const [form, setForm] = useState<ReservationForm>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const set = (field: keyof ReservationForm, value: string | number) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  // Fecha mínima = hoy
  const today = new Date().toISOString().split("T")[0];

  const handleSubmit = async () => {
    setError(null);

    // Validaciones básicas en frontend
    if (!form.contact_name.trim()) return setError("El nombre es obligatorio");
    if (!form.contact_lastname.trim()) return setError("El apellido es obligatorio");
    if (!form.contact_phone.trim()) return setError("El celular es obligatorio");
    if (!form.date) return setError("La fecha es obligatoria");
    if (!form.time) return setError("La hora es obligatoria");

    const token = localStorage.getItem("token");
    if (!token) return setError("Sesión expirada, vuelve a iniciar sesión");

    // Combinar fecha + hora en un solo ISO string
    const dateTime = new Date(`${form.date}T${form.time}:00`);
    if (isNaN(dateTime.getTime()) || dateTime < new Date()) {
      return setError("La fecha y hora deben ser en el futuro");
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          contact_name:     form.contact_name.trim(),
          contact_lastname: form.contact_lastname.trim(),
          contact_phone:    form.contact_phone.trim(),
          party_size:       form.party_size,
          date:             dateTime.toISOString(),
          occasion:         form.occasion,
          special_requests: form.special_requests.trim(),
        }),
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.message ?? "Error al crear reserva");

      setForm(EMPTY);
      onSuccess();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al enviar la reserva");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={s.overlay} onClick={() => !submitting && onClose()}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={s.header}>
          <div style={s.headerLeft}>
            <div style={s.headerIcon}><Calendar size={20} color="#f97316" /></div>
            <div>
              <h2 style={s.title}>Reservar una Mesa</h2>
              <p style={s.subtitle}>Completa los datos para confirmar tu reserva</p>
            </div>
          </div>
          <button style={s.closeBtn} onClick={onClose} disabled={submitting}>
            <X size={20} />
          </button>
        </div>

        <div style={s.body}>
          {/* Error */}
          {error && <div style={s.errorBox}>{error}</div>}

          {/* Nombre y Apellido */}
          <div style={s.row}>
            <div style={s.field}>
              <label style={s.label}><User size={14} /> Nombre *</label>
              <input
                style={s.input}
                placeholder="Ej: Juan"
                value={form.contact_name}
                onChange={(e) => set("contact_name", e.target.value)}
                disabled={submitting}
              />
            </div>
            <div style={s.field}>
              <label style={s.label}><User size={14} /> Apellido *</label>
              <input
                style={s.input}
                placeholder="Ej: Pérez"
                value={form.contact_lastname}
                onChange={(e) => set("contact_lastname", e.target.value)}
                disabled={submitting}
              />
            </div>
          </div>

          {/* Celular */}
          <div style={s.field}>
            <label style={s.label}><Phone size={14} /> Celular *</label>
            <input
              style={s.input}
              placeholder="Ej: +591 70000000"
              value={form.contact_phone}
              onChange={(e) => set("contact_phone", e.target.value)}
              disabled={submitting}
              type="tel"
            />
          </div>

          {/* Fecha y Hora */}
          <div style={s.row}>
            <div style={s.field}>
              <label style={s.label}><Calendar size={14} /> Fecha *</label>
              <input
                style={s.input}
                type="date"
                min={today}
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
                disabled={submitting}
              />
            </div>
            <div style={s.field}>
              <label style={s.label}><Clock size={14} /> Hora *</label>
              <input
                style={s.input}
                type="time"
                value={form.time}
                onChange={(e) => set("time", e.target.value)}
                disabled={submitting}
              />
            </div>
          </div>

          {/* Número de personas */}
          <div style={s.field}>
            <label style={s.label}><Users size={14} /> Número de personas *</label>
            <div style={s.personGrid}>
              {[1,2,3,4,5,6,7,8].map((n) => (
                <button
                  key={n}
                  type="button"
                  disabled={submitting}
                  onClick={() => set("party_size", n)}
                  style={{
                    ...s.personBtn,
                    ...(form.party_size === n ? s.personBtnActive : {}),
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
            {/* Si quieren más de 8 */}
            <div style={s.morePersons}>
              <span style={s.moreLabel}>¿Más de 8?</span>
              <input
                style={{ ...s.input, width: 90, textAlign: "center" }}
                type="number"
                min={1}
                max={20}
                value={form.party_size}
                onChange={(e) => set("party_size", Math.min(20, Math.max(1, Number(e.target.value))))}
                disabled={submitting}
              />
              <span style={s.moreLabel}>personas</span>
            </div>
          </div>

          {/* Ocasión */}
          <div style={s.field}>
            <label style={s.label}><Star size={14} /> Ocasión (opcional)</label>
            <div style={s.occasionGrid}>
              {OCCASIONS.filter(Boolean).map((occ) => (
                <button
                  key={occ}
                  type="button"
                  disabled={submitting}
                  onClick={() => set("occasion", form.occasion === occ ? "" : occ)}
                  style={{
                    ...s.occasionBtn,
                    ...(form.occasion === occ ? s.occasionBtnActive : {}),
                  }}
                >
                  {occ}
                </button>
              ))}
            </div>
          </div>

          {/* Peticiones especiales */}
          <div style={s.field}>
            <label style={s.label}><FileText size={14} /> Peticiones especiales (opcional)</label>
            <textarea
              style={s.textarea}
              placeholder="Ej: Silla para bebé, zona tranquila, decoración de cumpleaños…"
              value={form.special_requests}
              onChange={(e) => set("special_requests", e.target.value)}
              rows={3}
              disabled={submitting}
            />
          </div>

          {/* Aviso */}
          <div style={s.notice}>
            <span>ℹ️</span>
            <p style={s.noticeText}>
              Tu reserva quedará como <strong>pendiente</strong> hasta que el restaurante la confirme.
              Te contactaremos al número proporcionado.
            </p>
          </div>

          {/* Acciones */}
          <div style={s.actions}>
            <button style={s.cancelBtn} onClick={onClose} disabled={submitting}>
              Cancelar
            </button>
            <button
              style={{
                ...s.submitBtn,
                opacity: submitting ? 0.7 : 1,
              }}
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? "Enviando…" : "Confirmar Reserva"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Estilos ────────────────────────────────────────────────────────────────────

const s: { [k: string]: React.CSSProperties } = {
  overlay:  { position: "fixed", inset: 0, backgroundColor: "rgba(17,24,39,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" },
  modal:    { backgroundColor: "#fff", borderRadius: 18, width: "100%", maxWidth: 560, boxShadow: "0 25px 50px -12px rgba(0,0,0,0.3)", maxHeight: "92vh", display: "flex", flexDirection: "column", overflow: "hidden" },
  header:   { padding: "1.25rem 1.5rem", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexShrink: 0 },
  headerLeft: { display: "flex", alignItems: "center", gap: "0.75rem" },
  headerIcon: { width: 42, height: 42, backgroundColor: "#fff7ed", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  title:    { margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#111827" },
  subtitle: { margin: "0.2rem 0 0", fontSize: "0.8rem", color: "#6b7280" },
  closeBtn: { background: "none", border: "none", cursor: "pointer", color: "#6b7280", padding: "0.25rem", borderRadius: 6, display: "flex", alignItems: "center" },
  body:     { padding: "1.25rem 1.5rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1rem" },
  errorBox: { backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "0.75rem 1rem", color: "#b91c1c", fontSize: "0.875rem" },
  row:      { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" },
  field:    { display: "flex", flexDirection: "column", gap: "0.35rem" },
  label:    { fontSize: "0.82rem", fontWeight: 600, color: "#374151", display: "flex", alignItems: "center", gap: "0.35rem" },
  input:    { padding: "0.65rem 0.85rem", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: "0.9rem", color: "#111827", outline: "none", boxSizing: "border-box", width: "100%" },
  textarea: { padding: "0.65rem 0.85rem", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: "0.875rem", color: "#111827", outline: "none", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box", width: "100%" },
  // Personas
  personGrid: { display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: "0.4rem" },
  personBtn:  { padding: "0.5rem", borderRadius: 8, borderWidth: "1.5px", borderStyle: "solid", borderColor: "#e5e7eb", backgroundColor: "#f9fafb", color: "#374151", fontWeight: 600, cursor: "pointer", fontSize: "0.9rem", textAlign: "center" },
  personBtnActive: { backgroundColor: "#fff7ed", borderColor: "#f97316", color: "#f97316" },
  morePersons: { display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem" },
  moreLabel:   { fontSize: "0.8rem", color: "#6b7280" },
  // Ocasión
  occasionGrid: { display: "flex", flexWrap: "wrap", gap: "0.4rem" },
  occasionBtn:  { padding: "0.4rem 0.85rem", borderRadius: 999, borderWidth: "1.5px", borderStyle: "solid", borderColor: "#e5e7eb", backgroundColor: "#f9fafb", color: "#374151", fontSize: "0.8rem", fontWeight: 500, cursor: "pointer" },
  occasionBtnActive: { backgroundColor: "#fff7ed", borderColor: "#f97316", color: "#f97316", fontWeight: 700 },
  // Aviso
  notice:     { backgroundColor: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, padding: "0.75rem 1rem", display: "flex", gap: "0.5rem", alignItems: "flex-start" },
  noticeText: { margin: 0, fontSize: "0.8rem", color: "#0369a1", lineHeight: 1.5 },
  // Acciones
  actions:   { display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "0.75rem" },
  cancelBtn: { backgroundColor: "#fff", color: "#111827", border: "1px solid #e5e7eb", borderRadius: 10, padding: "0.75rem", fontWeight: 600, cursor: "pointer", fontSize: "0.9rem" },
  submitBtn: { backgroundColor: "#f97316", color: "#fff", border: "none", borderRadius: 10, padding: "0.75rem", fontWeight: 700, cursor: "pointer", fontSize: "0.9rem" },
};