"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface IIngredientCategory {
  _id: string;
  name: string;
  description?: string;
  isActive?: boolean;
}

// FIX: campos alineados con lo que devuelve la API (minStock, maxStock, supplier)
interface IIngredient {
  _id: string;
  name: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  unit: string;
  supplier?: string;
  category_id: IIngredientCategory | null;
  isActive: boolean;
  stockStatus: "ok" | "low" | "critical";
}

// FIX: campos del formulario alineados con IIngredient
type IngredientFormData = {
  name: string;
  currentStock: string;
  minStock: string;
  maxStock: string;
  unit: string;
  supplier: string;
  category_id: string;
  isActive: boolean;
};

type CategoryFormData = {
  name: string;
  description: string;
  isActive: boolean;
};

// Roles permitidos definidos FUERA del componente para evitar loop
const ALLOWED_ROLES = ["admin", "cocinero"] as const;
const UNITS = ["kg", "gr", "lt", "ml", "unit"] as const;

// ─── Helpers de estilo ────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: 9,
  border: "1.5px solid #e0e0e0",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
  color: "#1a1a1a",
  background: "#fff",
};

const STATUS_CONFIG = {
  ok:       { label: "Normal",  bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0" },
  low:      { label: "Bajo",    bg: "#fffbeb", color: "#d97706", border: "#fde68a" },
  critical: { label: "Crítico", bg: "#fff0ee", color: "#e85d26", border: "#fecaca" },
};

const BAR_COLOR = {
  ok:       "#16a34a",
  low:      "#d97706",
  critical: "#e85d26",
};

// ─── Hook responsive ──────────────────────────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

// ─── Hook: bloquear scroll del body cuando hay modal abierto ──────────────────
function useLockBodyScroll(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [active]);
}

// ─── Componentes UI reutilizables ─────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{
        fontSize: 11, fontWeight: 700, color: "#555", display: "block",
        marginBottom: 6, letterSpacing: "0.05em", textTransform: "uppercase",
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div style={{
      background: "#fff0ee", border: "1px solid #e85d26",
      borderRadius: 8, padding: "10px 14px", color: "#c0392b",
      fontSize: 13, marginBottom: 14,
    }}>
      ⚠️ {msg}
    </div>
  );
}

function Modal({ title, children, onClose, isMobile = false }: {
  title?: string; children: React.ReactNode; onClose: () => void; isMobile?: boolean;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useLockBodyScroll(true);

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: isMobile ? "flex-end" : "center",
        justifyContent: "center", zIndex: 1000, padding: isMobile ? 0 : 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative", background: "#fff",
          borderRadius: isMobile ? "18px 18px 0 0" : 18,
          padding: isMobile ? "28px 20px 32px" : "32px 36px",
          width: isMobile ? "100%" : 560, maxWidth: "100%",
          maxHeight: isMobile ? "96vh" : "90vh", overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
        }}
      >
        {isMobile && (
          <div style={{
            width: 40, height: 4, background: "#ddd", borderRadius: 2,
            margin: "-12px auto 20px",
          }} />
        )}
        <button
          onClick={onClose}
          aria-label="Cerrar"
          style={{
            position: "absolute", top: isMobile ? 20 : 12, right: 16, background: "none",
            border: "none", fontSize: 18, cursor: "pointer", color: "#888",
          }}
        >✕</button>
        {title && (
          <h2 style={{ margin: "0 0 22px", fontSize: 19, fontWeight: 700, color: "#1a1a1a", paddingRight: 24 }}>
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>
  );
}

// ─── Formulario de ingrediente ────────────────────────────────────────────────
function IngredientForm({ initial, categories, onSubmit, onCancel, error, submitLabel, isMobile, isCocinero }: {
  initial: IngredientFormData;
  categories: IIngredientCategory[];
  onSubmit: (data: IngredientFormData) => void;
  onCancel: () => void;
  error: string;
  submitLabel: string;
  isMobile?: boolean;
  isCocinero?: boolean;
}) {
  const [form, setForm] = useState<IngredientFormData>(initial);

  // FIX: sincronizar si cambia el initial (al abrir editar otro ingrediente)
  useEffect(() => {
    setForm(initial);
  }, [initial]);

  const set = (k: keyof IngredientFormData, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {error && <ErrorBox msg={error} />}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <Field label="Nombre *">
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Ej: Filete de Res"
              style={inputStyle}
              disabled={isCocinero}
            />
          </Field>
        </div>

        <Field label="Stock Actual *">
          <input
            type="number"
            min={0}
            step="0.001"
            value={form.currentStock}
            onChange={(e) => set("currentStock", e.target.value)}
            placeholder="0"
            style={inputStyle}
            inputMode="decimal"
          />
        </Field>

        <Field label="Unidad *">
          <select
            value={form.unit}
            onChange={(e) => set("unit", e.target.value)}
            style={inputStyle}
            disabled={isCocinero}
          >
            <option value="">Seleccionar...</option>
            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </Field>

        {!isCocinero && (
          <Field label="Stock Mínimo *">
            <input
              type="number"
              min={0}
              step="0.001"
              value={form.minStock}
              onChange={(e) => set("minStock", e.target.value)}
              placeholder="0"
              style={inputStyle}
              inputMode="decimal"
            />
          </Field>
        )}

        {!isCocinero && (
          <Field label="Stock Máximo *">
            <input
              type="number"
              min={0}
              step="0.001"
              value={form.maxStock}
              onChange={(e) => set("maxStock", e.target.value)}
              placeholder="0"
              style={inputStyle}
              inputMode="decimal"
            />
          </Field>
        )}

        {!isCocinero && (
          <div style={{ gridColumn: "1 / -1" }}>
            <Field label="Proveedor">
              <input
                value={form.supplier}
                onChange={(e) => set("supplier", e.target.value)}
                placeholder="Nombre del proveedor"
                style={inputStyle}
              />
            </Field>
          </div>
        )}

        {!isCocinero && (
          <div style={{ gridColumn: "1 / -1" }}>
            <Field label="Categoría (opcional)">
              <select
                value={form.category_id}
                onChange={(e) => set("category_id", e.target.value)}
                style={inputStyle}
              >
                <option value="">Sin categoría</option>
                {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </Field>
          </div>
        )}

        {!isCocinero && (
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14, color: "#333" }}>
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => set("isActive", e.target.checked)}
                style={{ width: 17, height: 17 }}
              />
              Ingrediente activo
            </label>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 8, flexDirection: isMobile ? "column-reverse" : "row" }}>
        <button
          onClick={onCancel}
          type="button"
          style={{
            flex: isMobile ? undefined : 1, padding: "11px 22px", borderRadius: 9,
            border: "1.5px solid #e0e0e0", background: "transparent", fontSize: 13,
            fontWeight: 600, cursor: "pointer", color: "#888", fontFamily: "inherit",
            width: isMobile ? "100%" : undefined, minHeight: 44,
          }}
        >Cancelar</button>
        <button
          onClick={() => onSubmit(form)}
          type="button"
          style={{
            flex: isMobile ? undefined : 2, padding: "11px 22px", borderRadius: 9,
            border: "none", background: "#e85d26", fontSize: 13, fontWeight: 600,
            cursor: "pointer", color: "#fff", fontFamily: "inherit",
            width: isMobile ? "100%" : undefined, minHeight: 44,
          }}
        >{submitLabel}</button>
      </div>
    </div>
  );
}

// ─── Formulario de categoría ──────────────────────────────────────────────────
function CategoryForm({ initial, onSubmit, onCancel, error, submitLabel }: {
  initial: CategoryFormData;
  onSubmit: (data: CategoryFormData) => void;
  onCancel: () => void;
  error: string;
  submitLabel: string;
}) {
  const [form, setForm] = useState<CategoryFormData>(initial);
  const set = (k: keyof CategoryFormData, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    setForm(initial);
  }, [initial]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {error && <ErrorBox msg={error} />}
      <Field label="Nombre *">
        <input
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Ej: Carnes, Lácteos..."
          style={inputStyle}
        />
      </Field>
      <Field label="Descripción">
        <input
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Descripción opcional"
          style={inputStyle}
        />
      </Field>
      <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14, color: "#333" }}>
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(e) => set("isActive", e.target.checked)}
          style={{ width: 17, height: 17 }}
        />
        Categoría activa
      </label>
      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <button
          onClick={onCancel}
          type="button"
          style={{
            flex: 1, padding: "11px 22px", borderRadius: 9,
            border: "1.5px solid #e0e0e0", background: "transparent", fontSize: 13,
            fontWeight: 600, cursor: "pointer", color: "#888", fontFamily: "inherit",
            minHeight: 44,
          }}
        >Cancelar</button>
        <button
          onClick={() => onSubmit(form)}
          type="button"
          style={{
            flex: 2, padding: "11px 22px", borderRadius: 9,
            border: "none", background: "#1a1a1a", fontSize: 13, fontWeight: 600,
            cursor: "pointer", color: "#fff", fontFamily: "inherit",
            minHeight: 44,
          }}
        >{submitLabel}</button>
      </div>
    </div>
  );
}

// ─── Fila de tabla ────────────────────────────────────────────────────────────
function IngredientRow({ ing, onEdit, onDelete, isCocinero, isAdmin }: {
  ing: IIngredient;
  onEdit: () => void;
  onDelete: () => void;
  isCocinero: boolean;
  isAdmin: boolean;
}) {
  // FIX: usar ing.maxStock en lugar de ing.stock_maximo
  const pct = ing.maxStock > 0
    ? Math.min(100, Math.round((ing.currentStock / ing.maxStock) * 100))
    : 0;
  const status = STATUS_CONFIG[ing.stockStatus];
  const catName = ing.category_id?.name ?? "—";

  return (
    <tr
      style={{ borderBottom: "1px solid #f0f0f0" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#fafafa")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <td style={{ padding: "14px 16px", fontWeight: 700, color: "#1a1a1a", fontSize: 14 }}>
        {ing.name}
        {!ing.isActive && (
          <span style={{ marginLeft: 8, fontSize: 10, color: "#aaa", fontWeight: 400 }}>inactivo</span>
        )}
      </td>
      <td style={{ padding: "14px 16px" }}>
        <span style={{
          fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20,
          background: "#f5f5f5", color: "#555", border: "1px solid #e8e8e8",
        }}>{catName}</span>
      </td>
      <td style={{ padding: "14px 16px", minWidth: 160 }}>
        <p style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700, color: "#1a1a1a" }}>
          {ing.currentStock} {ing.unit}
        </p>
        <div style={{ height: 6, background: "#f0f0f0", borderRadius: 3, overflow: "hidden", width: 120 }}>
          <div style={{
            height: "100%", borderRadius: 3,
            background: BAR_COLOR[ing.stockStatus],
            width: `${pct}%`,
            transition: "width 0.4s ease",
          }} />
        </div>
      </td>
      {/* FIX: usar ing.minStock / ing.maxStock */}
      <td style={{ padding: "14px 16px", fontSize: 12, color: "#888", lineHeight: 1.8 }}>
        <span>Min: {ing.minStock} {ing.unit}</span><br />
        <span>Max: {ing.maxStock} {ing.unit}</span>
      </td>
      <td style={{ padding: "14px 16px" }}>
        <span style={{
          fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 20,
          background: status.bg, color: status.color, border: `1px solid ${status.border}`,
        }}>{status.label}</span>
      </td>
      <td style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={onEdit}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "7px 16px", borderRadius: 8,
              border: "1.5px solid #e0e0e0", background: "#fff",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
              color: "#333", fontFamily: "inherit", minHeight: 36,
            }}
          >
            ✏️ {isCocinero ? "Ajustar" : "Editar"}
          </button>
          {isAdmin && (
            <button
              onClick={onDelete}
              aria-label="Eliminar ingrediente"
              style={{
                width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                border: "1.5px solid #fecaca", background: "#fff0ee",
                fontSize: 15, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#e85d26",
              }}
            >🗑</button>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Modal de gestión de categorías ──────────────────────────────────────────
function CategoriesModal({
  categories, onClose, isMobile, onRefresh,
}: {
  categories: IIngredientCategory[];
  onClose: () => void;
  isMobile: boolean;
  onRefresh: () => void;
}) {
  const [view, setView] = useState<"list" | "create" | "edit">("list");
  const [editCat, setEditCat] = useState<IIngredientCategory | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const emptyForm: CategoryFormData = { name: "", description: "", isActive: true };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 2500);
  };

  const handleCreate = async (form: CategoryFormData) => {
    if (!form.name.trim()) { setFormError("El nombre es obligatorio"); return; }
    setFormError("");
    try {
      const res = await fetch("/api/ingredient-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name.trim(), description: form.description.trim(), isActive: form.isActive }),
      });
      const data = await res.json();
      if (!data.ok) { setFormError(data.message); return; }
      showSuccess("Categoría creada");
      setView("list");
      onRefresh();
    } catch { setFormError("Error al crear la categoría"); }
  };

  const handleEdit = async (form: CategoryFormData) => {
    if (!editCat) return;
    if (!form.name.trim()) { setFormError("El nombre es obligatorio"); return; }
    setFormError("");
    try {
      const res = await fetch(`/api/ingredient-categories/${editCat._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name.trim(), description: form.description.trim(), isActive: form.isActive }),
      });
      const data = await res.json();
      if (!data.ok) { setFormError(data.message); return; }
      showSuccess("Categoría actualizada");
      setView("list");
      setEditCat(null);
      onRefresh();
    } catch { setFormError("Error al actualizar"); }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/ingredient-categories/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) { setError(data.message); setDeleteId(null); return; }
      showSuccess("Categoría eliminada");
      setDeleteId(null);
      onRefresh();
    } catch { setError("Error al eliminar"); }
  };

  const editFormInitial: CategoryFormData = editCat
    ? { name: editCat.name, description: editCat.description ?? "", isActive: editCat.isActive ?? true }
    : emptyForm;

  return (
    <Modal title="Gestión de Categorías" onClose={onClose} isMobile={isMobile}>
      {successMsg && (
        <div style={{
          background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8,
          padding: "10px 14px", color: "#16a34a", fontSize: 13, marginBottom: 14, fontWeight: 600,
        }}>✓ {successMsg}</div>
      )}
      {error && (
        <div style={{
          background: "#fff0ee", border: "1px solid #e85d26", borderRadius: 8,
          padding: "10px 14px", color: "#c0392b", fontSize: 13, marginBottom: 14,
          display: "flex", justifyContent: "space-between",
        }}>
          <span>⚠️ {error}</span>
          <button onClick={() => setError("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#c0392b" }}>✕</button>
        </div>
      )}

      {view === "list" && (
        <>
          <button
            onClick={() => { setFormError(""); setView("create"); }}
            style={{
              width: "100%", padding: "11px", borderRadius: 9,
              border: "1.5px dashed #e0e0e0", background: "#fafafa",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
              color: "#555", fontFamily: "inherit", marginBottom: 16, minHeight: 44,
            }}
          >+ Nueva Categoría</button>

          {categories.length === 0 ? (
            <p style={{ textAlign: "center", color: "#aaa", fontSize: 14, padding: "20px 0" }}>
              No hay categorías aún
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {categories.map((cat) => (
                <div key={cat._id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "12px 14px", borderRadius: 10, border: "1.5px solid #f0f0f0",
                  background: "#fafafa",
                }}>
                  <span style={{ fontWeight: 600, fontSize: 14, color: "#1a1a1a" }}>
                    🏷 {cat.name}
                  </span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => { setFormError(""); setEditCat(cat); setView("edit"); }}
                      style={{
                        padding: "6px 14px", borderRadius: 7, border: "1.5px solid #e0e0e0",
                        background: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer",
                        color: "#333", fontFamily: "inherit", minHeight: 36,
                      }}
                    >✏️ Editar</button>
                    <button
                      onClick={() => setDeleteId(cat._id)}
                      aria-label={`Eliminar ${cat.name}`}
                      style={{
                        padding: "6px 14px", borderRadius: 7, border: "1.5px solid #fecaca",
                        background: "#fff0ee", fontSize: 12, fontWeight: 600, cursor: "pointer",
                        color: "#e85d26", fontFamily: "inherit", minHeight: 36,
                      }}
                    >🗑</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {deleteId && (
            <div style={{
              marginTop: 16, padding: "16px", borderRadius: 10,
              background: "#fff0ee", border: "1.5px solid #e85d26", textAlign: "center",
            }}>
              <p style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: "#e85d26" }}>
                ¿Eliminar esta categoría?
              </p>
              <p style={{ margin: "0 0 14px", fontSize: 12, color: "#888" }}>
                Los ingredientes asociados quedarán sin categoría.
              </p>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                <button
                  onClick={() => setDeleteId(null)}
                  style={{
                    padding: "9px 20px", borderRadius: 8, border: "1.5px solid #e0e0e0",
                    background: "transparent", fontSize: 13, fontWeight: 600,
                    cursor: "pointer", color: "#888", fontFamily: "inherit", minHeight: 44,
                  }}
                >Cancelar</button>
                <button
                  onClick={() => handleDelete(deleteId)}
                  style={{
                    padding: "9px 20px", borderRadius: 8, border: "none",
                    background: "#e85d26", fontSize: 13, fontWeight: 600,
                    cursor: "pointer", color: "#fff", fontFamily: "inherit", minHeight: 44,
                  }}
                >Sí, eliminar</button>
              </div>
            </div>
          )}
        </>
      )}

      {view === "create" && (
        <>
          <p style={{ margin: "-10px 0 18px", fontSize: 13, color: "#888" }}>← Nueva categoría</p>
          <CategoryForm
            initial={emptyForm}
            onSubmit={handleCreate}
            onCancel={() => { setView("list"); setFormError(""); }}
            error={formError}
            submitLabel="Crear Categoría"
          />
        </>
      )}

      {view === "edit" && editCat && (
        <>
          <p style={{ margin: "-10px 0 18px", fontSize: 13, color: "#888" }}>← Editando: {editCat.name}</p>
          <CategoryForm
            initial={editFormInitial}
            onSubmit={handleEdit}
            onCancel={() => { setView("list"); setEditCat(null); setFormError(""); }}
            error={formError}
            submitLabel="Guardar Cambios"
          />
        </>
      )}
    </Modal>
  );
}

// ─── Page principal ───────────────────────────────────────────────────────────
export default function InventoryPage() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const { user, loading: userLoading } = useAuth(ALLOWED_ROLES as unknown as import("@/lib/useAuth").AuthUser["rol"][]);
  const isCocinero = user?.rol === "cocinero";
  const isAdmin = user?.rol === "admin";

  const [ingredients, setIngredients] = useState<IIngredient[]>([]);
  const [categories, setCategories] = useState<IIngredientCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "ok" | "low" | "critical">("all");
  const [successMsg, setSuccessMsg] = useState("");
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [editIngredient, setEditIngredient] = useState<IIngredient | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [ingRes, catRes] = await Promise.all([
        fetch("/api/ingredients"),
        fetch("/api/ingredient-categories"),
      ]);
      const ingData = await ingRes.json();
      const catData = await catRes.json();
      if (ingData.ok) setIngredients(ingData.data);
      if (catData.ok) setCategories(catData.data);
    } catch {
      setError("Error al cargar los datos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!userLoading && user) fetchData();
  }, [userLoading, user, fetchData]);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  // ── Filtros ────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return ingredients.filter((ing) => {
      const matchSearch =
        (ing.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
        // FIX: usar ing.supplier en lugar de ing.proveedor
        (ing.supplier ?? "").toLowerCase().includes(search.toLowerCase());
      const matchCat =
        filterCat === "all" ? true
        : filterCat === "none" ? !ing.category_id
        : ing.category_id?._id === filterCat;
      const matchStatus = filterStatus === "all" ? true : ing.stockStatus === filterStatus;
      return matchSearch && matchCat && matchStatus;
    });
  }, [ingredients, search, filterCat, filterStatus]);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalOk       = ingredients.filter((i) => i.stockStatus === "ok").length;
  const totalLow      = ingredients.filter((i) => i.stockStatus === "low").length;
  const totalCritical = ingredients.filter((i) => i.stockStatus === "critical").length;

  // ── CRUD ingredientes ──────────────────────────────────────────────────────
  // FIX: emptyForm con los campos correctos
  const emptyForm: IngredientFormData = {
    name: "", currentStock: "", minStock: "", maxStock: "",
    unit: "", supplier: "", category_id: "", isActive: true,
  };

  const handleCreate = async (form: IngredientFormData) => {
    if (!form.name.trim()) { setFormError("El nombre es obligatorio"); return; }
    if (!form.unit) { setFormError("La unidad es obligatoria"); return; }
    if (form.currentStock === "" || Number(form.currentStock) < 0) { setFormError("El stock actual es obligatorio"); return; }
    if (form.minStock === "" || Number(form.minStock) < 0) { setFormError("El stock mínimo es obligatorio"); return; }
    if (form.maxStock === "" || Number(form.maxStock) <= Number(form.minStock)) {
      setFormError("El stock máximo debe ser mayor al mínimo"); return;
    }
    setFormError("");
    try {
      const res = await fetch("/api/ingredients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          currentStock: Number(form.currentStock),
          minStock: Number(form.minStock),
          maxStock: Number(form.maxStock),
          unit: form.unit,
          supplier: form.supplier.trim() || "",
          category_id: form.category_id || null,
          isActive: form.isActive,
        }),
      });
      const data = await res.json();
      if (!data.ok) { setFormError(data.message); return; }
      showSuccess("Ingrediente creado correctamente");
      setShowCreateModal(false);
      fetchData();
    } catch { setFormError("Error al crear el ingrediente"); }
  };

  const handleEdit = async (form: IngredientFormData) => {
    if (!editIngredient) return;
    if (!form.name.trim()) { setFormError("El nombre es obligatorio"); return; }
    if (!form.unit) { setFormError("La unidad es obligatoria"); return; }
    if (form.currentStock === "" || Number(form.currentStock) < 0) { setFormError("El stock actual es obligatorio"); return; }

    // FIX: validar minStock/maxStock para admin
    if (!isCocinero) {
      if (form.minStock === "" || Number(form.minStock) < 0) { setFormError("El stock mínimo es obligatorio"); return; }
      if (form.maxStock === "" || Number(form.maxStock) <= Number(form.minStock)) {
        setFormError("El stock máximo debe ser mayor al mínimo"); return;
      }
    }

    setFormError("");
    try {
      const res = await fetch(`/api/ingredients/${editIngredient._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        // FIX: usar los campos correctos en ambos casos (cocinero y admin)
        body: JSON.stringify(isCocinero
          ? {
              name: editIngredient.name,
              currentStock: Number(form.currentStock),
              minStock: editIngredient.minStock,
              maxStock: editIngredient.maxStock,
              unit: editIngredient.unit,
              supplier: editIngredient.supplier || "",
              category_id: editIngredient.category_id?._id ?? null,
              isActive: editIngredient.isActive,
            }
          : {
              name: form.name.trim(),
              currentStock: Number(form.currentStock),
              minStock: Number(form.minStock),
              maxStock: Number(form.maxStock),
              unit: form.unit,
              supplier: form.supplier.trim() || "",
              category_id: form.category_id || null,
              isActive: form.isActive,
            }),
      });
      const data = await res.json();
      if (!data.ok) { setFormError(data.message); return; }
      showSuccess("Ingrediente actualizado correctamente");
      setEditIngredient(null);
      fetchData();
    } catch { setFormError("Error al actualizar"); }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/ingredients/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) { setError(data.message); setDeleteId(null); return; }
      showSuccess("Ingrediente eliminado");
      setDeleteId(null);
      fetchData();
    } catch { setError("Error al eliminar"); }
  };

  // ── Loading / auth ─────────────────────────────────────────────────────────
  if (userLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "#f8f7f4", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Georgia', serif" }}>
        <p style={{ color: "#888", fontSize: 15 }}>Verificando sesión...</p>
      </div>
    );
  }

  if (!user) return null;

  const px = isMobile ? "16px" : "40px";
  const catTabs = [
    { id: "all",  label: "Todos" },
    { id: "none", label: "Sin categoría" },
    ...categories.map((c) => ({ id: c._id, label: c.name })),
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f8f7f4", fontFamily: "'Georgia', serif" }}>

      {/* ── Header ── */}
      <div style={{
        background: "#fff", borderBottom: "2px solid #1a1a1a",
        padding: isMobile ? "14px 16px" : "18px 40px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 10, position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: isMobile ? 10 : 14,
          minWidth: 0, flex: 1,
          maxWidth: isMobile ? "calc(100% - 96px)" : undefined,
        }}>
          <button
            onClick={() => router.push(isAdmin ? "/dashboard" : "/dashboard/cocinero")}
            aria-label="Volver al dashboard"
            style={{
              background: "#f4f4f4", border: "1.5px solid #e0e0e0", borderRadius: 9,
              width: 40, height: 40, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", fontSize: 16,
            }}
          >←</button>
          <div style={{
            width: 40, height: 40, borderRadius: 12, background: "#e85d26", flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: isMobile ? 18 : 22,
          }}>📦</div>
          {isMobile ? (
            <h1 style={{
              margin: 0, fontSize: 15, fontWeight: 700, color: "#1a1a1a",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>Inventario</h1>
          ) : (
            <div>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#1a1a1a" }}>Control de Inventario</h1>
              <p style={{ margin: 0, fontSize: 12, color: "#888" }}>Gestión de stock y suministros</p>
            </div>
          )}
        </div>
        {isAdmin && (
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button
              onClick={() => setShowCategoriesModal(true)}
              style={{
                background: "#fff", color: "#1a1a1a",
                border: "1.5px solid #1a1a1a",
                padding: isMobile ? "0" : "11px 18px",
                width: isMobile ? 44 : undefined,
                height: isMobile ? 44 : undefined,
                borderRadius: 9, fontSize: isMobile ? 16 : 13, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {isMobile ? "🏷" : "🏷 Categorías"}
            </button>
            <button
              onClick={() => { setFormError(""); setShowCreateModal(true); }}
              style={{
                background: "#1a1a1a", color: "#fff", border: "none",
                padding: isMobile ? "0" : "11px 22px",
                width: isMobile ? 44 : undefined,
                height: isMobile ? 44 : undefined,
                borderRadius: 9, fontSize: isMobile ? 20 : 13, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {isMobile ? "+" : "+ Nuevo Ingrediente"}
            </button>
          </div>
        )}
      </div>

      {/* ── Toast ── */}
      {successMsg && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed", top: 24,
            right: isMobile ? 12 : 24, left: isMobile ? 12 : "auto",
            zIndex: 9999, background: "#1a1a1a", color: "#fff",
            padding: "13px 22px", borderRadius: 10, fontSize: 14, fontWeight: 600,
            boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
          }}
        >✓ {successMsg}</div>
      )}

      {/* ── Error global ── */}
      {error && (
        <div style={{
          margin: `16px ${px} 0`, background: "#fff0ee", border: "1px solid #e85d26",
          borderRadius: 10, padding: "11px 18px", color: "#c0392b", fontSize: 13,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span>⚠️ {error}</span>
          <button
            onClick={() => setError("")}
            aria-label="Cerrar error"
            style={{ background: "none", border: "none", cursor: "pointer", color: "#c0392b", fontSize: 16 }}
          >✕</button>
        </div>
      )}

      {/* ── Stats cards ── */}
      <div style={{
        padding: `24px ${px} 0`,
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        gap: isMobile ? 10 : 16,
      }}>
        <div style={{
          background: "#fff", border: "1.5px solid #e8e8e8", borderRadius: isMobile ? 12 : 16,
          padding: isMobile ? "14px 16px" : "20px 24px",
          display: "flex", alignItems: "center", gap: isMobile ? 10 : 16,
          boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
          flex: isMobile ? undefined : 1,
        }}>
          <div style={{
            width: isMobile ? 36 : 44, height: isMobile ? 36 : 44, borderRadius: 10,
            background: "#f5f5f5", display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: isMobile ? 16 : 20, flexShrink: 0,
          }}>📦</div>
          <div>
            <p style={{ margin: 0, fontSize: isMobile ? 10 : 11, color: "#888", marginBottom: 2 }}>Total ingredientes</p>
            <p style={{ margin: 0, fontSize: isMobile ? 22 : 28, fontWeight: 700, color: "#1a1a1a", lineHeight: 1 }}>{ingredients.length}</p>
          </div>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: isMobile ? 10 : 16,
          flex: isMobile ? undefined : 3,
        }}>
          {[
            { label: "Normal",  value: totalOk,       color: "#16a34a", icon: "🟢", bg: "#f0fdf4" },
            { label: "Bajo",    value: totalLow,      color: "#d97706", icon: "🟡", bg: "#fffbeb" },
            { label: "Crítico", value: totalCritical, color: "#e85d26", icon: "🔴", bg: "#fff0ee" },
          ].map((s) => (
            <div key={s.label} style={{
              background: "#fff", border: "1.5px solid #e8e8e8", borderRadius: isMobile ? 12 : 16,
              padding: isMobile ? "12px" : "20px 24px",
              display: "flex", alignItems: "center", gap: isMobile ? 8 : 16,
              boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
            }}>
              <div style={{
                width: isMobile ? 32 : 44, height: isMobile ? 32 : 44, borderRadius: 10,
                background: s.bg, display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: isMobile ? 14 : 20, flexShrink: 0,
              }}>{s.icon}</div>
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: isMobile ? 10 : 11, color: "#888", marginBottom: 2, whiteSpace: "nowrap" }}>{s.label}</p>
                <p style={{ margin: 0, fontSize: isMobile ? 20 : 28, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Alertas críticas ── */}
      {totalCritical > 0 && (
        <div style={{
          margin: `16px ${px} 0`,
          background: "#fff0ee", border: "1.5px solid #e85d26",
          borderRadius: 12, padding: "14px 18px",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <span style={{ fontSize: 20 }}>🚨</span>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#e85d26" }}>
              {totalCritical} ingrediente{totalCritical > 1 ? "s" : ""} con stock crítico
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#888" }}>
              Requiere reposición inmediata
            </p>
          </div>
        </div>
      )}

      {/* ── Buscador ── */}
      <div style={{ padding: `20px ${px} 0` }}>
        <div style={{ position: "relative" }}>
          <span style={{
            position: "absolute", left: 14, top: "50%",
            transform: "translateY(-50%)", color: "#aaa", fontSize: 16,
            pointerEvents: "none",
          }}>🔍</span>
          <input
            type="search"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o proveedor..."
            style={{ ...inputStyle, paddingLeft: 40, borderRadius: 30 }}
          />
        </div>
      </div>

      {/* ── Filtros de categoría y estado ── */}
      <div style={{
        paddingTop: 12, paddingRight: px, paddingBottom: 4, paddingLeft: px,
        display: "flex", gap: 8,
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
        msOverflowStyle: "none",
        scrollbarWidth: "none",
      }}>
        {catTabs.map((tab) => (
          <button key={tab.id} onClick={() => setFilterCat(tab.id)} style={{
            padding: "7px 18px", borderRadius: 30, border: "1.5px solid",
            borderColor: filterCat === tab.id ? "#1a1a1a" : "#e0e0e0",
            background: filterCat === tab.id ? "#1a1a1a" : "#fff",
            color: filterCat === tab.id ? "#fff" : "#555",
            fontSize: 13, fontWeight: 600, cursor: "pointer",
            fontFamily: "inherit", flexShrink: 0, whiteSpace: "nowrap",
            minHeight: 36,
          }}>{tab.label}</button>
        ))}
        <div style={{ width: 1, background: "#e0e0e0", flexShrink: 0, margin: "4px 4px" }} />
        {(["all", "ok", "low", "critical"] as const).map((s) => {
          const labels = { all: "Todos los estados", ok: "🟢 Normal", low: "🟡 Bajo", critical: "🔴 Crítico" };
          return (
            <button key={s} onClick={() => setFilterStatus(s)} style={{
              padding: "7px 18px", borderRadius: 30, border: "1.5px solid",
              borderColor: filterStatus === s ? "#e85d26" : "#e0e0e0",
              background: filterStatus === s ? "#fff0ee" : "#fff",
              color: filterStatus === s ? "#e85d26" : "#555",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
              fontFamily: "inherit", flexShrink: 0, whiteSpace: "nowrap",
              minHeight: 36,
            }}>{labels[s]}</button>
          );
        })}
      </div>

      {/* ── Tabla / Cards ── */}
      <div style={{ padding: `20px ${px} 48px` }}>
        <div style={{
          background: "#fff", borderRadius: 16, border: "1.5px solid #e8e8e8",
          overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
        }}>
          <div style={{ padding: "18px 24px", borderBottom: "1.5px solid #f0f0f0" }}>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1a1a1a" }}>
              Lista de Inventario
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#888" }}>
              {loading ? "Cargando..." : `${filtered.length} item${filtered.length !== 1 ? "s" : ""}`}
            </p>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: 60, color: "#888" }}>Cargando inventario...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60 }}>
              <p style={{ fontSize: 36, margin: 0 }}>📦</p>
              <p style={{ color: "#888", fontSize: 15, marginTop: 10 }}>
                {ingredients.length === 0 ? "No hay ingredientes aún" : "Sin resultados"}
              </p>
              {ingredients.length === 0 && isAdmin && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  style={{
                    marginTop: 14, background: "#e85d26", color: "#fff", border: "none",
                    padding: "11px 22px", borderRadius: 9, fontSize: 13, fontWeight: 600,
                    cursor: "pointer", fontFamily: "inherit", minHeight: 44,
                  }}
                >Agregar primer ingrediente</button>
              )}
            </div>
          ) : isMobile ? (
            // ── Cards móvil ──────────────────────────────────────────────────
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {filtered.map((ing) => {
                // FIX: usar ing.maxStock
                const pct = ing.maxStock > 0
                  ? Math.min(100, Math.round((ing.currentStock / ing.maxStock) * 100))
                  : 0;
                const status = STATUS_CONFIG[ing.stockStatus];
                return (
                  <div key={ing._id} style={{ padding: "16px", borderBottom: "1px solid #f0f0f0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p style={{
                          margin: 0, fontSize: 15, fontWeight: 700, color: "#1a1a1a",
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        }}>
                          {ing.name}
                          {!ing.isActive && (
                            <span style={{ marginLeft: 6, fontSize: 10, color: "#aaa", fontWeight: 400 }}>inactivo</span>
                          )}
                        </p>
                        {/* FIX: usar ing.supplier */}
                        <p style={{ margin: "2px 0 0", fontSize: 11, color: "#888" }}>
                          {ing.category_id?.name ?? "Sin categoría"}
                          {ing.supplier ? ` · ${ing.supplier}` : ""}
                        </p>
                      </div>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                        background: status.bg, color: status.color, border: `1px solid ${status.border}`,
                        flexShrink: 0, marginLeft: 8,
                      }}>{status.label}</span>
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <p style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: "#1a1a1a" }}>
                        {ing.currentStock} {ing.unit}
                      </p>
                      <div style={{ height: 6, background: "#f0f0f0", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{
                          height: "100%", borderRadius: 3,
                          background: BAR_COLOR[ing.stockStatus],
                          width: `${pct}%`,
                          transition: "width 0.4s ease",
                        }} />
                      </div>
                      {/* FIX: usar ing.minStock / ing.maxStock */}
                      <p style={{ margin: "4px 0 0", fontSize: 11, color: "#aaa" }}>
                        Min: {ing.minStock} · Max: {ing.maxStock} {ing.unit}
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => { setFormError(""); setEditIngredient(ing); }}
                        style={{
                          flex: 1, padding: "10px", borderRadius: 8,
                          border: "1.5px solid #e0e0e0", background: "#fff",
                          fontSize: 13, fontWeight: 600, cursor: "pointer",
                          color: "#333", fontFamily: "inherit",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          gap: 6, minHeight: 44,
                        }}
                      >✏️ {isCocinero ? "Ajustar stock" : "Editar"}</button>
                      {isAdmin && (
                        <button
                          onClick={() => setDeleteId(ing._id)}
                          aria-label="Eliminar ingrediente"
                          style={{
                            width: 44, height: 44, borderRadius: 8, flexShrink: 0,
                            border: "1.5px solid #fecaca", background: "#fff0ee",
                            fontSize: 16, cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            color: "#e85d26",
                          }}
                        >🗑</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // ── Tabla desktop ────────────────────────────────────────────────
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#fafafa", borderBottom: "1.5px solid #f0f0f0" }}>
                    {["Producto", "Categoría", "Stock Actual", "Min/Max", "Estado", "Acciones"].map((h) => (
                      <th key={h} style={{
                        padding: "12px 16px", textAlign: "left", fontSize: 11,
                        fontWeight: 700, color: "#888", letterSpacing: "0.05em",
                        textTransform: "uppercase",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((ing) => (
                    <IngredientRow
                      key={ing._id}
                      ing={ing}
                      isCocinero={isCocinero}
                      isAdmin={isAdmin}
                      onEdit={() => { setFormError(""); setEditIngredient(ing); }}
                      onDelete={() => setDeleteId(ing._id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Modales ── */}
      {showCategoriesModal && isAdmin && (
        <CategoriesModal
          categories={categories}
          onClose={() => setShowCategoriesModal(false)}
          isMobile={isMobile}
          onRefresh={fetchData}
        />
      )}

      {showCreateModal && isAdmin && (
        <Modal title="Nuevo Ingrediente" onClose={() => setShowCreateModal(false)} isMobile={isMobile}>
          <IngredientForm
            initial={emptyForm}
            categories={categories}
            onSubmit={handleCreate}
            onCancel={() => { setShowCreateModal(false); setFormError(""); }}
            error={formError}
            submitLabel="Crear Ingrediente"
            isMobile={isMobile}
            isCocinero={false}
          />
        </Modal>
      )}

      {editIngredient && (
        <Modal
          title={isCocinero ? `Ajustar stock: ${editIngredient.name}` : "Editar Ingrediente"}
          onClose={() => setEditIngredient(null)}
          isMobile={isMobile}
        >
          <IngredientForm
            // FIX: initial con los campos correctos (minStock, maxStock, supplier)
            initial={{
              name: editIngredient.name,
              currentStock: String(editIngredient.currentStock),
              minStock: String(editIngredient.minStock),
              maxStock: String(editIngredient.maxStock),
              unit: editIngredient.unit,
              supplier: editIngredient.supplier || "",
              category_id: editIngredient.category_id?._id || "",
              isActive: editIngredient.isActive,
            }}
            categories={categories}
            onSubmit={handleEdit}
            onCancel={() => { setEditIngredient(null); setFormError(""); }}
            error={formError}
            submitLabel={isCocinero ? "Guardar Stock" : "Guardar Cambios"}
            isMobile={isMobile}
            isCocinero={isCocinero}
          />
        </Modal>
      )}

      {deleteId && isAdmin && (
        <Modal onClose={() => setDeleteId(null)} isMobile={isMobile}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🗑</div>
            <h2 style={{ margin: "0 0 8px", fontSize: 19, fontWeight: 700, color: "#1a1a1a" }}>¿Eliminar ingrediente?</h2>
            <p style={{ color: "#888", fontSize: 13, margin: 0 }}>Esta acción no se puede deshacer.</p>
            <div style={{
              display: "flex", gap: 10, marginTop: 22, justifyContent: "center",
              flexDirection: isMobile ? "column-reverse" : "row",
            }}>
              <button
                onClick={() => setDeleteId(null)}
                style={{
                  padding: "11px 22px", borderRadius: 9, border: "1.5px solid #e0e0e0",
                  background: "transparent", fontSize: 13, fontWeight: 600,
                  cursor: "pointer", color: "#888", fontFamily: "inherit",
                  width: isMobile ? "100%" : undefined, minHeight: 44,
                }}
              >Cancelar</button>
              <button
                onClick={() => handleDelete(deleteId)}
                style={{
                  padding: "11px 22px", borderRadius: 9, border: "1.5px solid #e85d26",
                  background: "#fff0ee", fontSize: 13, fontWeight: 600,
                  cursor: "pointer", color: "#e85d26", fontFamily: "inherit",
                  width: isMobile ? "100%" : undefined, minHeight: 44,
                }}
              >Sí, eliminar</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}