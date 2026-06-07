"use client";

// src/app/reservations/page.tsx — reemplaza el archivo completo

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { ADMIN } from "@/lib/roles";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface TableRef {
  _id: string;
  number: number;
  capacity: number;
  location: string;
  status: string;
}

interface UserRef {
  _id: string;
  name: string;
  email: string;
}

interface Reservation {
  _id: string;
  user_id: UserRef | string;
  table_id: TableRef | null;
  contact_name: string;
  contact_lastname: string;
  contact_phone: string;
  party_size: number;
  date: string;
  occasion: string;
  special_requests: string;
  notes: string;
  status: "pending" | "confirmed" | "seated" | "cancelled";
  createdAt: string;
}

interface TableOption {
  _id: string;
  number: number;
  capacity: number;
  location: string;
  status: string;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  pending:   "Pendiente",
  confirmed: "Confirmada",
  seated:    "En mesa",
  cancelled: "Cancelada",
};

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  pending:   { bg: "#fef9c3", text: "#854d0e", border: "#fde68a" },
  confirmed: { bg: "#e8f8ef", text: "#166534", border: "#86efac" },
  seated:    { bg: "#dbeafe", text: "#1e40af", border: "#93c5fd" },
  cancelled: { bg: "#fee2e2", text: "#991b1b", border: "#fca5a5" },
};

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-BO", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" });
}
function formatCreated(iso: string) {
  return new Date(iso).toLocaleDateString("es-BO", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

type BtnVariant = "primary" | "secondary" | "danger" | "ghost" | "orange" | "confirm" | "seat";

function Btn({ children, onClick, variant = "secondary", small = false, disabled = false }: {
  children: React.ReactNode; onClick?: () => void; variant?: BtnVariant; small?: boolean; disabled?: boolean;
}) {
  const styles: Record<BtnVariant, React.CSSProperties> = {
    primary:   { background: "#1a1a1a", color: "#fff",     border: "none" },
    secondary: { background: "#f4f4f4", color: "#333",     border: "1.5px solid #e0e0e0" },
    danger:    { background: "#fff0ee", color: "#e85d26",  border: "1.5px solid #e85d26" },
    ghost:     { background: "transparent", color: "#888", border: "1.5px solid #e0e0e0" },
    orange:    { background: "#e85d26", color: "#fff",     border: "none" },
    confirm:   { background: "#e8f8ef", color: "#166534",  border: "1.5px solid #86efac" },
    seat:      { background: "#dbeafe", color: "#1e40af",  border: "1.5px solid #93c5fd" },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...styles[variant],
      padding: small ? "6px 14px" : "10px 20px",
      borderRadius: 9, fontSize: small ? 12 : 13, fontWeight: 600,
      cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
      display: "inline-flex", alignItems: "center", gap: 6,
      whiteSpace: "nowrap", fontFamily: "inherit", transition: "opacity 0.15s",
    }}>{children}</button>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div style={{ background: "#fff0ee", border: "1px solid #e85d26", borderRadius: 8, padding: "10px 14px", color: "#c0392b", fontSize: 13, marginBottom: 14 }}>
      ⚠️ {msg}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 700, color: "#555", display: "block", marginBottom: 6, letterSpacing: "0.05em", textTransform: "uppercase" }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "11px 14px", borderRadius: 9,
  border: "1.5px solid #e0e0e0", fontSize: 14, outline: "none",
  boxSizing: "border-box", fontFamily: "inherit", color: "#1a1a1a",
};

function Modal({ title, children, onClose, wide = false, isMobile = false }: {
  title: string; children: React.ReactNode; onClose: () => void; wide?: boolean; isMobile?: boolean;
}) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center", zIndex: 1000, padding: isMobile ? 0 : 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ position: "relative", background: "#fff", borderRadius: isMobile ? "18px 18px 0 0" : 18, padding: isMobile ? "28px 20px 32px" : "32px 36px", width: isMobile ? "100%" : wide ? 620 : 480, maxWidth: "100%", maxHeight: isMobile ? "92vh" : "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.18)" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 12, right: 16, background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#888" }}>✕</button>
        {title && <h2 style={{ margin: "0 0 20px", fontSize: 19, fontWeight: 700, color: "#1a1a1a", paddingRight: 24 }}>{title}</h2>}
        {children}
      </div>
    </div>
  );
}

function InfoBlock({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div>
      <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "#555", letterSpacing: "0.05em", textTransform: "uppercase" }}>{label}</p>
      <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: valueColor || "#1a1a1a" }}>{value}</p>
    </div>
  );
}

function ActionCard({ icon, title, desc, variant, disabled, onClick }: {
  icon: string; title: string; desc: string;
  variant: "confirm" | "seat" | "danger"; disabled?: boolean; onClick: () => void;
}) {
  const colors = {
    confirm: { bg: "#e8f8ef", border: "#86efac", text: "#166534" },
    seat:    { bg: "#dbeafe", border: "#93c5fd", text: "#1e40af" },
    danger:  { bg: "#fff0ee", border: "#e85d26", text: "#c0392b" },
  };
  const c = colors[variant];
  return (
    <button onClick={onClick} disabled={disabled} style={{ background: c.bg, border: `1.5px solid ${c.border}`, borderRadius: 10, padding: "14px 16px", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, textAlign: "left", display: "flex", alignItems: "center", gap: 12, fontFamily: "inherit", width: "100%" }}>
      <span style={{ fontSize: 22, flexShrink: 0 }}>{icon}</span>
      <div>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: c.text }}>{title}</p>
        <p style={{ margin: "2px 0 0", fontSize: 12, color: c.text, opacity: 0.7 }}>{desc}</p>
      </div>
    </button>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function ReservationsPage() {
  const router    = useRouter();
  const isMobile  = useIsMobile();
  const { user, loading: userLoading } = useAuth(ADMIN);

  // ── FIX: dos listas separadas ──────────────────────────────────────────────
  // `allReservations` nunca se filtra → sirve para los contadores de los stat cards
  // `displayed`       es lo que se muestra en lista (filtrado)
  const [allReservations, setAllReservations] = useState<Reservation[]>([]);
  const [displayed,       setDisplayed]       = useState<Reservation[]>([]);
  // ──────────────────────────────────────────────────────────────────────────

  const [tables,       setTables]       = useState<TableOption[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDate,   setFilterDate]   = useState("");
  const [successMsg,   setSuccessMsg]   = useState("");
  const [globalError,  setGlobalError]  = useState("");

  const [selected,      setSelected]      = useState<Reservation | null>(null);
  const [assignTable,   setAssignTable]   = useState("");
  const [staffNote,     setStaffNote]     = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError,   setActionError]   = useState("");
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const px    = isMobile ? "16px" : "40px";

  // ── Fetch TODAS las reservas (sin filtro) → para contadores ───────────────
  const fetchAll = useCallback(async () => {
    if (!token) return;
    try {
      const res  = await fetch("/api/reservations", { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.ok) setAllReservations(json.data);
    } catch { /* silencioso */ }
  }, [token]);

  // ── Fetch reservas filtradas → para la lista ──────────────────────────────
  const fetchFiltered = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== "all") params.set("status", filterStatus);
      if (filterDate)             params.set("date",   filterDate);
      const res  = await fetch(`/api/reservations?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.ok) setDisplayed(json.data);
      else setGlobalError(json.message ?? "Error al cargar reservas");
    } catch {
      setGlobalError("Error de conexión al cargar reservas");
    } finally {
      setLoading(false);
    }
  }, [token, filterStatus, filterDate]);

  // Refrescar ambos juntos
  const refresh = useCallback(() => {
    fetchAll();
    fetchFiltered();
  }, [fetchAll, fetchFiltered]);

  useEffect(() => {
    if (!userLoading && user) refresh();
  }, [userLoading, user, refresh]);

  // ── Pusher ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (userLoading || !user) return;
    let mounted = true;
    let pusherInstance: InstanceType<typeof import("pusher-js")["default"]> | null = null;
    const setup = async () => {
      const { default: Pusher } = await import("pusher-js");
      if (!mounted) return;
      pusherInstance = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, { cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER! });
      const ch = pusherInstance.subscribe("restaurant");
      ch.bind("reservation:new",     () => { if (mounted) { refresh(); showSuccess("Nueva reserva recibida 🔔"); } });
      ch.bind("reservation:updated", () => { if (mounted) { refresh(); fetchTables(); } });
    };
    setup();
    return () => { mounted = false; pusherInstance?.unsubscribe("restaurant"); pusherInstance?.disconnect(); };
  }, [userLoading, user, refresh]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchTables = useCallback(async () => {
    if (!token) return;
    try {
      const res  = await fetch("/api/tables", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (Array.isArray(data)) setTables(data);
    } catch { /* silencioso */ }
  }, [token]);

  useEffect(() => { if (!userLoading && user) fetchTables(); }, [userLoading, user, fetchTables]);

  const showSuccess = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(""), 3500); };

  const openDetail = (r: Reservation) => {
    setSelected(r);
    setAssignTable(r.table_id && typeof r.table_id === "object" ? r.table_id._id : "");
    setStaffNote(r.notes ?? "");
    setActionError("");
  };

  const closeDetail = () => { setSelected(null); setActionError(""); };

  const doAction = async (resId: string, newStatus: string, opts?: { tableId?: string; notes?: string }) => {
    if (!token) return;
    setActionLoading(true);
    setActionError("");
    try {
      const body: Record<string, unknown> = { status: newStatus };
      if (opts?.tableId !== undefined) body.table_id = opts.tableId || null;
      if (opts?.notes   !== undefined) body.notes    = opts.notes;
      const res  = await fetch(`/api/reservations/${resId}`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message ?? "Error al actualizar");
      showSuccess("Reserva actualizada correctamente");
      closeDetail();
      setConfirmCancel(null);
      refresh();
      fetchTables();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Error al actualizar");
    } finally {
      setActionLoading(false);
    }
  };

  const saveNote = async () => {
    if (!selected || !token) return;
    setActionLoading(true);
    setActionError("");
    try {
      const res  = await fetch(`/api/reservations/${selected._id}`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ notes: staffNote }) });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message ?? "Error");
      showSuccess("Nota guardada");
      refresh();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Error");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Contadores SIEMPRE sobre allReservations, no sobre displayed ──────────
  const counts = {
    total:     allReservations.length,
    pending:   allReservations.filter((r) => r.status === "pending").length,
    confirmed: allReservations.filter((r) => r.status === "confirmed").length,
    seated:    allReservations.filter((r) => r.status === "seated").length,
    cancelled: allReservations.filter((r) => r.status === "cancelled").length,
  };

  const assignableTables = tables.filter(
    (t) => t.status === "Libre" ||
      (selected?.table_id && typeof selected.table_id === "object" && t._id === selected.table_id._id)
  );

  if (userLoading) return (
    <div style={{ minHeight: "100vh", background: "#f8f7f4", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Georgia', serif" }}>
      <p style={{ color: "#888", fontSize: 15 }}>Verificando sesión...</p>
    </div>
  );
  if (!user) return null;

  return (
    <div style={{ minHeight: "100vh", background: "#f8f7f4", fontFamily: "'Georgia', serif" }}>

      {/* ── Header ── */}
      <div style={{ background: "#fff", borderBottom: "2px solid #1a1a1a", padding: isMobile ? "14px 16px" : "18px 40px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 10 : 14, minWidth: 0 }}>
          <button onClick={() => router.push("/dashboard")} style={{ background: "#f4f4f4", border: "1.5px solid #e0e0e0", borderRadius: 9, width: 38, height: 38, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 16 }}>←</button>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "#e85d26", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: isMobile ? 18 : 22 }}>📅</div>
          {!isMobile ? (
            <div>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#1a1a1a" }}>Gestión de Reservas</h1>
              <p style={{ margin: 0, fontSize: 12, color: "#888" }}>Confirma, asienta y administra las reservas del restaurante</p>
            </div>
          ) : (
            <h1 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#1a1a1a" }}>Reservas</h1>
          )}
        </div>
        <button onClick={refresh} style={{ background: "#f4f4f4", border: "1.5px solid #e0e0e0", borderRadius: 9, width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 16, flexShrink: 0 }} title="Actualizar">🔄</button>
      </div>

      {/* ── Toast ── */}
      {successMsg && (
        <div style={{ position: "fixed", top: 24, right: isMobile ? 12 : 24, left: isMobile ? 12 : "auto", zIndex: 9999, background: "#1a1a1a", color: "#fff", padding: "13px 22px", borderRadius: 10, fontSize: 14, fontWeight: 600, boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
          ✓ {successMsg}
        </div>
      )}

      {/* ── Error global ── */}
      {globalError && (
        <div style={{ margin: `16px ${px} 0`, background: "#fff0ee", border: "1px solid #e85d26", borderRadius: 10, padding: "11px 18px", color: "#c0392b", fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>⚠️ {globalError}</span>
          <button onClick={() => setGlobalError("")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#c0392b" }}>✕</button>
        </div>
      )}

      {/* ── Stat cards — usan counts de allReservations ── */}
      <div style={{ padding: `24px ${px} 0`, display: "flex", gap: isMobile ? 8 : 14, flexWrap: "wrap", overflowX: isMobile ? "auto" : "visible" }}>
        {[
          { label: "Total",       value: counts.total,     color: "#1a1a1a", filter: "all" },
          { label: "Pendientes",  value: counts.pending,   color: "#854d0e", filter: "pending" },
          { label: "Confirmadas", value: counts.confirmed, color: "#166534", filter: "confirmed" },
          { label: "En mesa",     value: counts.seated,    color: "#1e40af", filter: "seated" },
          { label: "Canceladas",  value: counts.cancelled, color: "#991b1b", filter: "cancelled" },
        ].map((s) => (
          <div
            key={s.label}
            onClick={() => setFilterStatus(filterStatus === s.filter ? "all" : s.filter)}
            style={{ background: filterStatus === s.filter ? "#1a1a1a" : "#fff", border: `1.5px solid ${filterStatus === s.filter ? "#1a1a1a" : "#e8e8e8"}`, borderRadius: 14, padding: isMobile ? "12px 16px" : "16px 24px", minWidth: isMobile ? 90 : 120, flexShrink: 0, cursor: "pointer", transition: "all 0.15s" }}
          >
            <p style={{ margin: 0, fontSize: isMobile ? 10 : 11, color: filterStatus === s.filter ? "rgba(255,255,255,0.6)" : "#888", marginBottom: 4 }}>{s.label}</p>
            <p style={{ margin: 0, fontSize: isMobile ? 22 : 26, fontWeight: 700, color: filterStatus === s.filter ? "#fff" : s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Filtro de fecha ── */}
      <div style={{ padding: `16px ${px} 0`, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#555", display: "block", marginBottom: 4, letterSpacing: "0.05em", textTransform: "uppercase" }}>Filtrar por fecha</label>
          <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} style={{ ...inputStyle, width: "auto", padding: "8px 12px", fontSize: 13 }} />
        </div>
        {filterDate && (
          <button onClick={() => setFilterDate("")} style={{ alignSelf: "flex-end", padding: "8px 14px", borderRadius: 9, border: "1.5px solid #e0e0e0", background: "#f4f4f4", fontSize: 12, fontWeight: 600, cursor: "pointer", color: "#888", fontFamily: "inherit" }}>
            Limpiar fecha
          </button>
        )}
        <p style={{ alignSelf: "flex-end", margin: 0, fontSize: 12, color: "#aaa" }}>
          {displayed.length} reserva{displayed.length !== 1 ? "s" : ""} encontrada{displayed.length !== 1 ? "s" : ""}
          {filterStatus !== "all" && ` · filtrando por "${STATUS_LABEL[filterStatus]}"`}
        </p>
      </div>

      {/* ── Lista — usa `displayed` ── */}
      <div style={{ padding: `20px ${px} 48px` }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "#888" }}>Cargando reservas...</div>
        ) : displayed.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, background: "#fff", borderRadius: 16, border: "2px dashed #ddd" }}>
            <p style={{ fontSize: 36, margin: 0 }}>📅</p>
            <p style={{ color: "#888", fontSize: 15, marginTop: 10 }}>No hay reservas con estos filtros</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {displayed.map((r) => {
              const sc   = STATUS_COLORS[r.status];
              const usr  = typeof r.user_id === "object" ? r.user_id : null;
              return (
                <div key={r._id} onClick={() => openDetail(r)}
                  style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #e8e8e8", overflow: "hidden", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", transition: "box-shadow 0.15s, transform 0.15s" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; }}
                >
                  <div style={{ height: 4, background: sc.border }} />
                  <div style={{ padding: isMobile ? "14px 16px" : "18px 24px" }}>
                    <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "center", justifyContent: "space-between", gap: 12 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flex: 1, minWidth: 0 }}>
                        <div style={{ width: 46, height: 46, borderRadius: 12, flexShrink: 0, background: sc.bg, border: `2px solid ${sc.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: sc.text }}>
                          {r.contact_name.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1a1a1a" }}>{r.contact_name} {r.contact_lastname}</h2>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 20, background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>{STATUS_LABEL[r.status]}</span>
                            {r.occasion && <span style={{ fontSize: 11, color: "#888" }}>🎉 {r.occasion}</span>}
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 5 }}>
                            <span style={{ fontSize: 12, color: "#888" }}>📞 {r.contact_phone}</span>
                            <span style={{ fontSize: 12, color: "#888" }}>👥 {r.party_size} persona{r.party_size !== 1 ? "s" : ""}</span>
                            {usr && <span style={{ fontSize: 12, color: "#aaa" }}>👤 {usr.name}</span>}
                          </div>
                          {r.special_requests && <p style={{ margin: "5px 0 0", fontSize: 12, color: "#aaa", fontStyle: "italic" }}>💬 {r.special_requests}</p>}
                          {r.notes && <p style={{ margin: "5px 0 0", fontSize: 12, color: "#6b7280" }}>📝 {r.notes}</p>}
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: isMobile ? "flex-start" : "flex-end", flexShrink: 0 }}>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>📅 {formatDate(r.date)}</p>
                        <p style={{ margin: 0, fontSize: 13, color: "#e85d26", fontWeight: 600 }}>🕐 {formatTime(r.date)}</p>
                        {r.table_id && typeof r.table_id === "object"
                          ? <p style={{ margin: 0, fontSize: 12, color: "#27ae60", fontWeight: 600 }}>🪑 Mesa {r.table_id.number} · {r.table_id.location}</p>
                          : <p style={{ margin: 0, fontSize: 12, color: "#d97706" }}>⚠️ Sin mesa asignada</p>}
                        <p style={{ margin: 0, fontSize: 11, color: "#ccc" }}>Recibida {formatCreated(r.createdAt)}</p>
                      </div>
                    </div>

                    {/* Acciones rápidas inline para pending */}
                    {r.status === "pending" && !isMobile && (
                      <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", gap: 8, marginTop: 14, paddingTop: 14, borderTop: "1px solid #f0f0f0" }}>
                        <Btn variant="confirm" small disabled={actionLoading} onClick={() => openDetail(r)}>✅ Asignar mesa y confirmar</Btn>
                        <Btn variant="danger"  small onClick={() => setConfirmCancel(r._id)}>❌ Cancelar</Btn>
                        <span style={{ fontSize: 11, color: "#aaa", alignSelf: "center", marginLeft: 4 }}>Debes asignar una mesa antes de confirmar</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modal detalle ── */}
      {selected && (
        <Modal title={`${selected.contact_name} ${selected.contact_lastname}`} onClose={closeDetail} wide isMobile={isMobile}>
          {actionError && <ErrorBox msg={actionError} />}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14, marginBottom: 20 }}>
            <InfoBlock label="Celular"  value={selected.contact_phone} />
            <InfoBlock label="Personas" value={`${selected.party_size} persona${selected.party_size !== 1 ? "s" : ""}`} />
            <InfoBlock label="Fecha"    value={formatDate(selected.date)} />
            <InfoBlock label="Hora"     value={formatTime(selected.date)} valueColor="#e85d26" />
            {selected.occasion && <InfoBlock label="Ocasión" value={`🎉 ${selected.occasion}`} />}
            {typeof selected.user_id === "object" && (
              <InfoBlock label="Cliente registrado" value={`${selected.user_id.name} · ${selected.user_id.email}`} />
            )}
            {selected.special_requests && (
              <div style={{ gridColumn: isMobile ? "1" : "1 / -1" }}>
                <InfoBlock label="Peticiones especiales" value={selected.special_requests} />
              </div>
            )}
          </div>

          {/* Estado */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: "#555", letterSpacing: "0.05em", textTransform: "uppercase" }}>Estado actual</p>
            <span style={{ fontSize: 13, fontWeight: 700, padding: "5px 14px", borderRadius: 20, background: STATUS_COLORS[selected.status].bg, color: STATUS_COLORS[selected.status].text, border: `1.5px solid ${STATUS_COLORS[selected.status].border}` }}>
              {STATUS_LABEL[selected.status]}
            </span>
          </div>

          {/* Mesa */}
          {selected.status !== "cancelled" && (
            <Field label="Asignar mesa">
              <select value={assignTable} onChange={(e) => setAssignTable(e.target.value)} disabled={actionLoading} style={{ ...inputStyle, marginBottom: 6 }}>
                <option value="">— Sin mesa asignada —</option>
                {assignableTables.map((t) => (
                  <option key={t._id} value={t._id}>Mesa {t.number} · {t.capacity} personas · {t.location} ({t.status})</option>
                ))}
              </select>
              {assignableTables.length === 0 && <p style={{ margin: 0, fontSize: 12, color: "#d97706" }}>⚠️ No hay mesas libres en este momento.</p>}
            </Field>
          )}

          {/* Nota interna */}
          {selected.status !== "cancelled" && (
            <div style={{ marginTop: 16 }}>
              <Field label="Nota interna del restaurante">
                <textarea value={staffNote} onChange={(e) => setStaffNote(e.target.value)} disabled={actionLoading} rows={2} placeholder="Ej: Cliente confirmó por teléfono, prefiere zona tranquila…" style={{ ...inputStyle, resize: "vertical" }} />
              </Field>
              <div style={{ marginTop: 8 }}>
                <Btn variant="secondary" small onClick={saveNote} disabled={actionLoading}>💾 Guardar nota</Btn>
              </div>
            </div>
          )}

          {/* Acciones */}
          <div style={{ marginTop: 22, paddingTop: 20, borderTop: "1.5px solid #f0f0f0" }}>
            <p style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 700, color: "#555", letterSpacing: "0.05em", textTransform: "uppercase" }}>Acciones</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {selected.status === "pending" && (<>
                <ActionCard
                    icon="✅"
                    title="Confirmar reserva"
                    desc={assignTable ? "Se marcará la mesa asignada como Reservada" : "⚠️ Debes asignar una mesa para confirmar"}
                    variant="confirm"
                    disabled={actionLoading || !assignTable}
                    onClick={() => doAction(selected._id, "confirmed", { tableId: assignTable || undefined, notes: staffNote })}
                    />
                <ActionCard icon="❌" title="Cancelar reserva"  desc="La reserva quedará cancelada y se notificará al cliente" variant="danger" disabled={actionLoading} onClick={() => setConfirmCancel(selected._id)} />
              </>)}
              {selected.status === "confirmed" && (<>
                <ActionCard icon="🪑" title="Cliente llegó — Asentar" desc={assignTable ? `La mesa ${tables.find(t => t._id === assignTable)?.number ?? ""} cambiará a Ocupada` : "Marca al cliente como sentado en su mesa"} variant="seat" disabled={actionLoading} onClick={() => doAction(selected._id, "seated", { tableId: assignTable || undefined, notes: staffNote })} />
                <ActionCard icon="❌" title="Cancelar reserva confirmada" desc="La mesa asignada quedará libre" variant="danger" disabled={actionLoading} onClick={() => setConfirmCancel(selected._id)} />
              </>)}
              {selected.status === "seated" && (
                <ActionCard icon="❌" title="Cancelar" desc="Cancela esta reserva (la mesa seguirá ocupada)" variant="danger" disabled={actionLoading} onClick={() => setConfirmCancel(selected._id)} />
              )}
              {selected.status === "cancelled" && (
                <p style={{ margin: 0, fontSize: 13, color: "#9ca3af" }}>Esta reserva está cancelada y no puede modificarse.</p>
              )}
              {actionLoading && <p style={{ margin: 0, fontSize: 12, color: "#888" }}>Procesando…</p>}
            </div>
          </div>
          <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={closeDetail}>Cerrar</Btn>
          </div>
        </Modal>
      )}

      {/* ── Modal confirmar cancelación ── */}
      {confirmCancel && (
        <Modal title="" onClose={() => setConfirmCancel(null)} isMobile={isMobile}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>⚠️</div>
            <h2 style={{ margin: "0 0 8px", fontSize: 19, fontWeight: 700, color: "#1a1a1a" }}>¿Cancelar reserva?</h2>
            <p style={{ color: "#888", fontSize: 13, margin: 0 }}>Se liberará la mesa asignada y se notificará al cliente por Pusher y email.</p>
            {actionError && <div style={{ marginTop: 14 }}><ErrorBox msg={actionError} /></div>}
            <div style={{ display: "flex", gap: 10, marginTop: 22, justifyContent: "center" }}>
              <Btn variant="ghost" onClick={() => setConfirmCancel(null)} disabled={actionLoading}>Volver</Btn>
              <Btn variant="danger" disabled={actionLoading} onClick={() => doAction(confirmCancel, "cancelled")}>
                {actionLoading ? "Cancelando…" : "Sí, cancelar reserva"}
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}