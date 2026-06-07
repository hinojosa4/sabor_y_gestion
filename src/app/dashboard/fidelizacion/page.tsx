"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Award, Edit3, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { useAuth } from "@/lib/useAuth";
import { ADMIN } from "@/lib/roles";

type LoyaltyTier = {
  _id: string;
  name: string;
  slug: string;
  minOrders: number;
  minSpent: number;
  discountPercent: number;
  benefits: string[];
  sortOrder: number;
  isActive: boolean;
};

type TierForm = {
  name: string;
  minOrders: string;
  minSpent: string;
  discountPercent: string;
  benefitsText: string;
  sortOrder: string;
  isActive: boolean;
};

type TierFormErrors = Partial<Record<keyof TierForm, string>>;

const emptyForm: TierForm = {
  name: "",
  minOrders: "0",
  minSpent: "0",
  discountPercent: "0",
  benefitsText: "",
  sortOrder: "0",
  isActive: true,
};

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 760);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return isMobile;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-BO", {
    style: "currency",
    currency: "BOB",
    maximumFractionDigits: 2,
  }).format(value);
}

function tierToForm(tier: LoyaltyTier): TierForm {
  return {
    name: tier.name,
    minOrders: String(tier.minOrders),
    minSpent: String(tier.minSpent),
    discountPercent: String(tier.discountPercent),
    benefitsText: tier.benefits.join("\n"),
    sortOrder: String(tier.sortOrder),
    isActive: tier.isActive,
  };
}

function formToPayload(form: TierForm) {
  return {
    name: form.name.trim(),
    minOrders: Number(form.minOrders),
    minSpent: Number(form.minSpent),
    discountPercent: Number(form.discountPercent),
    benefits: form.benefitsText.split("\n").map((line) => line.trim()).filter(Boolean),
    sortOrder: Number(form.sortOrder),
    isActive: form.isActive,
  };
}

function parseRequiredNumber(value: string) {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function validateTierForm(form: TierForm): TierFormErrors {
  const errors: TierFormErrors = {};
  const name = form.name.trim();
  const minOrders = parseRequiredNumber(form.minOrders);
  const minSpent = parseRequiredNumber(form.minSpent);
  const discountPercent = parseRequiredNumber(form.discountPercent);
  const sortOrder = parseRequiredNumber(form.sortOrder);

  if (!name) {
    errors.name = "El nombre es obligatorio";
  } else if (name.length < 2) {
    errors.name = "El nombre debe tener al menos 2 caracteres";
  } else if (name.length > 80) {
    errors.name = "El nombre no puede superar 80 caracteres";
  }

  if (minOrders === null || minOrders < 0 || !Number.isInteger(minOrders)) {
    errors.minOrders = "Ingresa un numero entero mayor o igual a 0";
  }

  if (minSpent === null || minSpent < 0) {
    errors.minSpent = "Ingresa un monto mayor o igual a 0";
  }

  if (discountPercent === null || discountPercent < 0 || discountPercent > 100) {
    errors.discountPercent = "El descuento debe estar entre 0 y 100";
  }

  if (sortOrder === null || sortOrder < 0 || !Number.isInteger(sortOrder)) {
    errors.sortOrder = "Ingresa un numero entero mayor o igual a 0";
  }

  return errors;
}

function sanitizeIntegerInput(value: string) {
  return value.replace(/[^\d]/g, "");
}

function sanitizeDecimalInput(value: string) {
  const normalized = value.replace(",", ".").replace(/[^\d.]/g, "");
  const [integerPart, ...decimalParts] = normalized.split(".");
  return decimalParts.length > 0
    ? `${integerPart}.${decimalParts.join("")}`
    : integerPart;
}

function blockInvalidNumberKey(event: React.KeyboardEvent<HTMLInputElement>) {
  if (["-", "+", "e", "E"].includes(event.key)) {
    event.preventDefault();
  }
}

export default function FidelizacionPage() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const { user, loading: authLoading } = useAuth(ADMIN);

  const [tiers, setTiers] = useState<LoyaltyTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<LoyaltyTier | null>(null);
  const [form, setForm] = useState<TierForm>(emptyForm);
  const [formErrors, setFormErrors] = useState<TierFormErrors>({});

  const token = useMemo(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }, []);

  const showSuccess = (message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(""), 3000);
  };

  const loadTiers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/loyalty-tiers", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.message || "Error al cargar categorias");
      setTiers(json.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar categorias");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!authLoading && user) loadTiers();
  }, [authLoading, user, loadTiers]);

  const activeCount = tiers.filter((tier) => tier.isActive).length;
  const maxDiscount = tiers.reduce((max, tier) => Math.max(max, tier.discountPercent), 0);

  const openCreate = () => {
    setEditingTier(null);
    setForm(emptyForm);
    setFormErrors({});
    setError("");
    setModalOpen(true);
  };

  const openEdit = (tier: LoyaltyTier) => {
    setEditingTier(tier);
    setForm(tierToForm(tier));
    setFormErrors({});
    setError("");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingTier(null);
    setForm(emptyForm);
    setFormErrors({});
    setError("");
  };

  const saveTier = async () => {
    if (!token) return;
    const validationErrors = validateTierForm(form);
    setFormErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      setError("Corrige los campos marcados antes de guardar");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const url = editingTier
        ? `/api/admin/loyalty-tiers/${editingTier._id}`
        : "/api/admin/loyalty-tiers";
      const res = await fetch(url, {
        method: editingTier ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formToPayload(form)),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.message || "Error al guardar categoria");
      closeModal();
      showSuccess(editingTier ? "Categoria actualizada" : "Categoria creada");
      loadTiers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar categoria");
    } finally {
      setSaving(false);
    }
  };

  const deleteTier = async (tier: LoyaltyTier) => {
    if (!token) return;
    if (!confirm(`Eliminar ${tier.name}?`)) return;

    try {
      const res = await fetch(`/api/admin/loyalty-tiers/${tier._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.message || "Error al eliminar categoria");
      showSuccess("Categoria eliminada");
      loadTiers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar categoria");
    }
  };

  if (authLoading || !user) return null;

  return (
    <main style={{ minHeight: "100vh", background: "#f8f7f4", color: "#1a1a1a", fontFamily: "'Georgia', serif" }}>
      <header style={{ background: "#fff", borderBottom: "2px solid #1a1a1a", padding: isMobile ? "14px 16px" : "18px 40px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <button onClick={() => router.push("/dashboard")} title="Volver" style={iconButtonStyle}>
            <ArrowLeft size={18} />
          </button>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "#e85d26", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Award size={21} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: isMobile ? 18 : 24, lineHeight: 1.1 }}>Fidelizacion</h1>
            {!isMobile && <p style={{ margin: "4px 0 0", fontSize: 12, color: "#777" }}>Configura categorias, umbrales y descuentos para clientes registrados.</p>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button onClick={loadTiers} title="Actualizar" style={iconButtonStyle}>
            <RefreshCw size={17} />
          </button>
          <button onClick={openCreate} style={primaryButtonStyle}>
            <Plus size={16} />
            {!isMobile && "Nueva categoria"}
          </button>
        </div>
      </header>

      {success && <Toast message={success} />}

      <section style={{ maxWidth: 1180, margin: "0 auto", padding: isMobile ? "18px 16px" : "28px 32px" }}>
        {error && !modalOpen && (
          <div style={errorBoxStyle}>
            <span>{error}</span>
            <button onClick={() => setError("")} style={plainIconStyle}><X size={15} /></button>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(3, 1fr)", gap: 12, marginBottom: 18 }}>
          <SummaryCard label="Categorias" value={String(tiers.length)} color="#1a1a1a" />
          <SummaryCard label="Activas" value={String(activeCount)} color="#059669" />
          <SummaryCard label="Mayor descuento" value={`${maxDiscount}%`} color="#e85d26" />
        </div>

        <div style={{ background: "#fff", border: "1.5px solid #e8e8e8", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          {loading ? (
            <p style={emptyStyle}>Cargando categorias...</p>
          ) : tiers.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center" }}>
              <p style={{ margin: "0 0 14px", color: "#777" }}>No hay categorias de fidelizacion.</p>
              <button onClick={openCreate} style={primaryButtonStyle}><Plus size={16} /> Crear categoria</button>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
                <thead>
                  <tr style={{ background: "#fafafa" }}>
                    {["Categoria", "Condicion", "Descuento", "Beneficios", "Estado", "Acciones"].map((head) => (
                      <th key={head} style={{ textAlign: head === "Acciones" ? "center" : "left", padding: "13px 16px", fontSize: 11, color: "#777", borderBottom: "1px solid #eee", whiteSpace: "nowrap" }}>{head}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tiers.map((tier) => (
                    <tr key={tier._id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                      <td style={cellStyle}>
                        <strong style={{ color: "#1a1a1a" }}>{tier.name}</strong>
                        <p style={subTextStyle}>Orden {tier.sortOrder} · {tier.slug}</p>
                      </td>
                      <td style={cellStyle}>
                        <span>{tier.minOrders} pedidos</span>
                        <p style={subTextStyle}>o {formatCurrency(tier.minSpent)} acumulados</p>
                      </td>
                      <td style={{ ...cellStyle, fontWeight: 800, color: tier.discountPercent > 0 ? "#e85d26" : "#777" }}>{tier.discountPercent}%</td>
                      <td style={cellStyle}>
                        {tier.benefits.length > 0 ? tier.benefits.slice(0, 2).join(" · ") : "Sin beneficios"}
                      </td>
                      <td style={cellStyle}>
                        <StatusBadge active={tier.isActive} />
                      </td>
                      <td style={{ ...cellStyle, textAlign: "center" }}>
                        <div style={{ display: "inline-flex", gap: 8 }}>
                          <button onClick={() => openEdit(tier)} title="Editar" style={tableButtonStyle}><Edit3 size={15} /></button>
                          <button onClick={() => deleteTier(tier)} title="Eliminar" style={tableButtonStyle}><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {modalOpen && (
        <div style={modalBackdropStyle} onClick={closeModal}>
          <section style={{ ...modalStyle, width: isMobile ? "100%" : 520, borderRadius: isMobile ? "16px 16px 0 0" : 14 }} onClick={(event) => event.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, marginBottom: 18 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20 }}>{editingTier ? "Editar categoria" : "Nueva categoria"}</h2>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#777" }}>Los cambios afectan el descuento calculado para clientes registrados.</p>
              </div>
              <button onClick={closeModal} title="Cerrar" style={iconButtonStyle}><X size={16} /></button>
            </div>

            {error && <div style={{ ...errorBoxStyle, marginBottom: 14 }}>{error}</div>}

            <div style={{ display: "grid", gap: 13 }}>
              <Field label="Nombre">
                <input
                  value={form.name}
                  onChange={(event) => {
                    setForm({ ...form, name: event.target.value });
                    setFormErrors((prev) => ({ ...prev, name: undefined }));
                  }}
                  style={fieldInputStyle(formErrors.name)}
                  placeholder="Cliente Preferente"
                  maxLength={80}
                />
                <FieldError message={formErrors.name} />
              </Field>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                <Field label="Pedidos minimos">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.minOrders}
                    onKeyDown={blockInvalidNumberKey}
                    onChange={(event) => {
                      setForm({ ...form, minOrders: sanitizeIntegerInput(event.target.value) });
                      setFormErrors((prev) => ({ ...prev, minOrders: undefined }));
                    }}
                    style={fieldInputStyle(formErrors.minOrders)}
                  />
                  <FieldError message={formErrors.minOrders} />
                </Field>
                <Field label="Gasto minimo">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={form.minSpent}
                    onKeyDown={blockInvalidNumberKey}
                    onChange={(event) => {
                      setForm({ ...form, minSpent: sanitizeDecimalInput(event.target.value) });
                      setFormErrors((prev) => ({ ...prev, minSpent: undefined }));
                    }}
                    style={fieldInputStyle(formErrors.minSpent)}
                  />
                  <FieldError message={formErrors.minSpent} />
                </Field>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                <Field label="Descuento %">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={form.discountPercent}
                    onKeyDown={blockInvalidNumberKey}
                    onChange={(event) => {
                      setForm({ ...form, discountPercent: sanitizeDecimalInput(event.target.value) });
                      setFormErrors((prev) => ({ ...prev, discountPercent: undefined }));
                    }}
                    style={fieldInputStyle(formErrors.discountPercent)}
                  />
                  <FieldError message={formErrors.discountPercent} />
                </Field>
                <Field label="Orden">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.sortOrder}
                    onKeyDown={blockInvalidNumberKey}
                    onChange={(event) => {
                      setForm({ ...form, sortOrder: sanitizeIntegerInput(event.target.value) });
                      setFormErrors((prev) => ({ ...prev, sortOrder: undefined }));
                    }}
                    style={fieldInputStyle(formErrors.sortOrder)}
                  />
                  <FieldError message={formErrors.sortOrder} />
                </Field>
              </div>
              <Field label="Beneficios">
                <textarea value={form.benefitsText} onChange={(event) => setForm({ ...form, benefitsText: event.target.value })} rows={4} style={{ ...inputStyle, resize: "vertical", minHeight: 94 }} placeholder={"Un beneficio por linea"} />
              </Field>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: 700, color: "#333" }}>
                <input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} style={{ width: 17, height: 17 }} />
                Categoria activa
              </label>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
              <button onClick={closeModal} style={secondaryButtonStyle}>Cancelar</button>
              <button onClick={saveTier} disabled={saving} style={{ ...primaryButtonStyle, opacity: saving ? 0.6 : 1, cursor: saving ? "wait" : "pointer" }}>
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: "#fff", border: "1.5px solid #e8e8e8", borderRadius: 10, padding: "15px 16px", minWidth: 0 }}>
      <p style={{ margin: 0, fontSize: 11, color: "#777" }}>{label}</p>
      <p style={{ margin: "5px 0 0", fontSize: 22, fontWeight: 800, color, overflowWrap: "anywhere" }}>{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 11, color: "#555", fontWeight: 800, textTransform: "uppercase" }}>{label}</span>
      {children}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;

  return (
    <span style={{ marginTop: -2, fontSize: 11, color: "#c2410c", fontWeight: 700 }}>
      {message}
    </span>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span style={{ display: "inline-flex", padding: "4px 9px", borderRadius: 999, fontSize: 11, fontWeight: 800, color: active ? "#059669" : "#777", background: active ? "#ecfdf5" : "#f4f4f4", border: `1px solid ${active ? "#a7f3d0" : "#ddd"}` }}>
      {active ? "Activa" : "Inactiva"}
    </span>
  );
}

function Toast({ message }: { message: string }) {
  return (
    <div style={{ position: "fixed", top: 24, right: 24, zIndex: 2000, background: "#1a1a1a", color: "#fff", padding: "12px 18px", borderRadius: 9, boxShadow: "0 8px 28px rgba(0,0,0,0.2)", fontSize: 13, fontWeight: 700 }}>
      {message}
    </div>
  );
}

const iconButtonStyle: React.CSSProperties = {
  width: 38,
  height: 38,
  border: "1.5px solid #e0e0e0",
  borderRadius: 9,
  background: "#f7f7f7",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  color: "#1a1a1a",
};

const primaryButtonStyle: React.CSSProperties = {
  minHeight: 38,
  border: "none",
  borderRadius: 9,
  background: "#1a1a1a",
  color: "#fff",
  padding: "0 14px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  cursor: "pointer",
  fontFamily: "inherit",
  fontWeight: 800,
  fontSize: 13,
};

const secondaryButtonStyle: React.CSSProperties = {
  minHeight: 38,
  border: "1.5px solid #e0e0e0",
  borderRadius: 9,
  background: "#f7f7f7",
  color: "#333",
  padding: "0 14px",
  cursor: "pointer",
  fontFamily: "inherit",
  fontWeight: 800,
  fontSize: 13,
};

const tableButtonStyle: React.CSSProperties = {
  ...iconButtonStyle,
  width: 34,
  height: 34,
  background: "#fff",
};

const plainIconStyle: React.CSSProperties = {
  border: "none",
  background: "transparent",
  cursor: "pointer",
  color: "inherit",
  display: "inline-flex",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1.5px solid #e0e0e0",
  borderRadius: 9,
  padding: "10px 12px",
  fontFamily: "inherit",
  fontSize: 13,
  color: "#1a1a1a",
  outline: "none",
};

const fieldInputStyle = (error?: string): React.CSSProperties => ({
  ...inputStyle,
  borderColor: error ? "#e85d26" : "#e0e0e0",
  background: error ? "#fff7f5" : "#fff",
});

const errorBoxStyle: React.CSSProperties = {
  background: "#fff0ee",
  border: "1.5px solid #e85d26",
  borderRadius: 9,
  padding: "10px 13px",
  color: "#c2410c",
  fontSize: 13,
  fontWeight: 700,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  marginBottom: 16,
};

const cellStyle: React.CSSProperties = {
  padding: "13px 16px",
  fontSize: 12,
  color: "#444",
  verticalAlign: "middle",
};

const subTextStyle: React.CSSProperties = {
  margin: "4px 0 0",
  fontSize: 11,
  color: "#888",
};

const emptyStyle: React.CSSProperties = {
  margin: 0,
  padding: 32,
  color: "#777",
  textAlign: "center",
  fontSize: 13,
};

const modalBackdropStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.45)",
  zIndex: 1500,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 18,
};

const modalStyle: React.CSSProperties = {
  background: "#fff",
  padding: 22,
  maxHeight: "92vh",
  overflowY: "auto",
  boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
};
