"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface IIngredientCategory {
  _id: string;
  nombre: string;
}

interface IIngredient {
  _id: string;
  nombre: string;
  stock_actual: number;
  stock_minimo: number;
  stock_maximo: number;
  unidad: string;
  proveedor?: string;
  category_id: IIngredientCategory | null;
  activo: boolean;
  stockStatus: "ok" | "bajo" | "critico";
}

type IngredientFormData = {
  nombre: string;
  stock_actual: string;
  stock_minimo: string;
  stock_maximo: string;
  unidad: string;
  proveedor: string;
  category_id: string;
  activo: boolean;
};

type CategoryFormData = {
  nombre: string;
  descripcion: string;
  activo: boolean;
};

// Roles permitidos definidos FUERA del componente para evitar loop
const ALLOWED_ROLES = ["admin", "cocinero"] as const;

const UNITS = ["kg", "gr", "lt", "ml", "unidad"] as const;

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
  ok:      { label: "Normal",   bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0" },
  bajo:    { label: "Bajo",     bg: "#fffbeb", color: "#d97706", border: "#fde68a" },
  critico: { label: "Crítico",  bg: "#fff0ee", color: "#e85d26", border: "#fecaca" },
};

const BAR_COLOR = {
  ok:      "#16a34a",
  bajo:    "#d97706",
  critico: "#e85d26",
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
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: isMobile ? "flex-end" : "center",
      justifyContent: "center", zIndex: 1000, padding: isMobile ? 0 : 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        position: "relative", background: "#fff",
        borderRadius: isMobile ? "18px 18px 0 0" : 18,
        padding: isMobile ? "28px 20px 32px" : "32px 36px",
        width: isMobile ? "100%" : 560, maxWidth: "100%",
        maxHeight: isMobile ? "92vh" : "90vh", overflowY: "auto",
        boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
      }}>
        <button onClick={onClose} style={{
          position: "absolute", top: 12, right: 16, background: "none",
          border: "none", fontSize: 18, cursor: "pointer", color: "#888",
        }}>✕</button>
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
  const set = (k: keyof IngredientFormData, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {error && <ErrorBox msg={error} />}

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <Field label="Nombre *">
            <input value={form.nombre} onChange={(e) => set("nombre", e.target.value)}
              placeholder="Ej: Filete de Res" style={inputStyle} disabled={isCocinero} />
          </Field>
        </div>

        <Field label="Stock Actual *">
          <input type="number" min={0} step="0.001" value={form.stock_actual}
            onChange={(e) => set("stock_actual", e.target.value)}
            placeholder="0" style={inputStyle} />
        </Field>

        <Field label="Unidad *">
          <select value={form.unidad} onChange={(e) => set("unidad", e.target.value)}
            style={inputStyle} disabled={isCocinero}>
            <option value="">Seleccionar...</option>
            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </Field>

        {!isCocinero && (
          <Field label="Stock Mínimo *">
            <input type="number" min={0} step="0.001" value={form.stock_minimo}
              onChange={(e) => set("stock_minimo", e.target.value)}
              placeholder="0" style={inputStyle} />
          </Field>
        )}

        {!isCocinero && (
          <Field label="Stock Máximo *">
            <input type="number" min={0} step="0.001" value={form.stock_maximo}
              onChange={(e) => set("stock_maximo", e.target.value)}
              placeholder="0" style={inputStyle} />
          </Field>
        )}

        {!isCocinero && (
          <div style={{ gridColumn: "1 / -1" }}>
            <Field label="Proveedor">
              <input value={form.proveedor} onChange={(e) => set("proveedor", e.target.value)}
                placeholder="Nombre del proveedor" style={inputStyle} />
            </Field>
          </div>
        )}

        {!isCocinero && (
          <div style={{ gridColumn: "1 / -1" }}>
            <Field label="Categoría (opcional)">
              <select value={form.category_id} onChange={(e) => set("category_id", e.target.value)}
                style={inputStyle}>
                <option value="">Sin categoría</option>
                {categories.map((c) => <option key={c._id} value={c._id}>{c.nombre}</option>)}
              </select>
            </Field>
          </div>
        )}

        {!isCocinero && (
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14, color: "#333" }}>
              <input type="checkbox" checked={form.activo}
                onChange={(e) => set("activo", e.target.checked)}
                style={{ width: 17, height: 17 }} />
              Ingrediente activo
            </label>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 8, flexDirection: isMobile ? "column-reverse" : "row" }}>
        <button onClick={onCancel} style={{
          flex: isMobile ? undefined : 1, padding: "11px 22px", borderRadius: 9,
          border: "1.5px solid #e0e0e0", background: "transparent", fontSize: 13,
          fontWeight: 600, cursor: "pointer", color: "#888", fontFamily: "inherit",
          width: isMobile ? "100%" : undefined,
        }}>Cancelar</button>
        <button onClick={() => onSubmit(form)} style={{
          flex: isMobile ? undefined : 2, padding: "11px 22px", borderRadius: 9,
          border: "none", background: "#e85d26", fontSize: 13, fontWeight: 600,
          cursor: "pointer", color: "#fff", fontFamily: "inherit",
          width: isMobile ? "100%" : undefined,
        }}>{submitLabel}</button>
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {error && <ErrorBox msg={error} />}
      <Field label="Nombre *">
        <input value={form.nombre} onChange={(e) => set("nombre", e.target.value)}
          placeholder="Ej: Carnes, Lácteos..." style={inputStyle} />
      </Field>
      <Field label="Descripción">
        <input value={form.descripcion} onChange={(e) => set("descripcion", e.target.value)}
          placeholder="Descripción opcional" style={inputStyle} />
      </Field>
      <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14, color: "#333" }}>
        <input type="checkbox" checked={form.activo}
          onChange={(e) => set("activo", e.target.checked)}
          style={{ width: 17, height: 17 }} />
        Categoría activa
      </label>
      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <button onClick={onCancel} style={{
          flex: 1, padding: "11px 22px", borderRadius: 9,
          border: "1.5px solid #e0e0e0", background: "transparent", fontSize: 13,
          fontWeight: 600, cursor: "pointer", color: "#888", fontFamily: "inherit",
        }}>Cancelar</button>
        <button onClick={() => onSubmit(form)} style={{
          flex: 2, padding: "11px 22px", borderRadius: 9,
          border: "none", background: "#1a1a1a", fontSize: 13, fontWeight: 600,
          cursor: "pointer", color: "#fff", fontFamily: "inherit",
        }}>{submitLabel}</button>
      </div>
    </div>
  );
}

// ─── Fila de tabla ────────────────────────────────────────────────────────────
function IngredientRow({ ing, onEdit, isCocinero }: {
  ing: IIngredient; onEdit: () => void; isCocinero: boolean;
}) {
  const pct = ing.stock_maximo > 0
    ? Math.min(100, Math.round((ing.stock_actual / ing.stock_maximo) * 100))
    : 0;
  const status = STATUS_CONFIG[ing.stockStatus];
  const catName = ing.category_id?.nombre ?? "—";

  return (
    <tr style={{ borderBottom: "1px solid #f0f0f0" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#fafafa")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <td style={{ padding: "14px 16px", fontWeight: 700, color: "#1a1a1a", fontSize: 14 }}>
        {ing.nombre}
        {!ing.activo && (
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
          {ing.stock_actual} {ing.unidad}
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
      <td style={{ padding: "14px 16px", fontSize: 12, color: "#888", lineHeight: 1.8 }}>
        <span>Min: {ing.stock_minimo} {ing.unidad}</span><br />
        <span>Max: {ing.stock_maximo} {ing.unidad}</span>
      </td>
      <td style={{ padding: "14px 16px" }}>
        <span style={{
          fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 20,
          background: status.bg, color: status.color, border: `1px solid ${status.border}`,
        }}>{status.label}</span>
      </td>
      <td style={{ padding: "14px 16px" }}>
        <button onClick={onEdit} style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "7px 16px", borderRadius: 8,
          border: "1.5px solid #e0e0e0", background: "#fff",
          fontSize: 13, fontWeight: 600, cursor: "pointer",
          color: "#333", fontFamily: "inherit",
        }}>
          ✏️ {isCocinero ? "Ajustar" : "Editar"}
        </button>
      </td>
    </tr>
  );
}

// ─── Modal de gestión de categorías ──────────────────────────────────────────
function CategoriesModal({
  categories,
  onClose,
  isMobile,
  onRefresh,
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

  const emptyForm: CategoryFormData = { nombre: "", descripcion: "", activo: true };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 2500);
  };

  const handleCreate = async (form: CategoryFormData) => {
    if (!form.nombre.trim()) { setFormError("El nombre es obligatorio"); return; }
    setFormError("");
    try {
      const res = await fetch("/api/ingredient-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: form.nombre.trim(), descripcion: form.descripcion.trim(), activo: form.activo }),
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
    if (!form.nombre.trim()) { setFormError("El nombre es obligatorio"); return; }
    setFormError("");
    try {
      const res = await fetch(`/api/ingredient-categories/${editCat._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: form.nombre.trim(), descripcion: form.descripcion.trim(), activo: form.activo }),
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

  return (
    <Modal title="Gestión de Categorías" onClose={onClose} isMobile={isMobile}>
      {/* Toast interno */}
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

      {/* Vista: lista */}
      {view === "list" && (
        <>
          <button onClick={() => { setFormError(""); setView("create"); }} style={{
            width: "100%", padding: "11px", borderRadius: 9,
            border: "1.5px dashed #e0e0e0", background: "#fafafa",
            fontSize: 13, fontWeight: 600, cursor: "pointer",
            color: "#555", fontFamily: "inherit", marginBottom: 16,
          }}>+ Nueva Categoría</button>

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
                    🏷️ {cat.nombre}
                  </span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => { setFormError(""); setEditCat(cat); setView("edit"); }}
                      style={{
                        padding: "6px 14px", borderRadius: 7, border: "1.5px solid #e0e0e0",
                        background: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer",
                        color: "#333", fontFamily: "inherit",
                      }}>✏️ Editar</button>
                    <button
                      onClick={() => setDeleteId(cat._id)}
                      style={{
                        padding: "6px 14px", borderRadius: 7, border: "1.5px solid #fecaca",
                        background: "#fff0ee", fontSize: 12, fontWeight: 600, cursor: "pointer",
                        color: "#e85d26", fontFamily: "inherit",
                      }}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Confirm delete inline */}
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
                <button onClick={() => setDeleteId(null)} style={{
                  padding: "9px 20px", borderRadius: 8, border: "1.5px solid #e0e0e0",
                  background: "transparent", fontSize: 13, fontWeight: 600,
                  cursor: "pointer", color: "#888", fontFamily: "inherit",
                }}>Cancelar</button>
                <button onClick={() => handleDelete(deleteId)} style={{
                  padding: "9px 20px", borderRadius: 8, border: "none",
                  background: "#e85d26", fontSize: 13, fontWeight: 600,
                  cursor: "pointer", color: "#fff", fontFamily: "inherit",
                }}>Sí, eliminar</button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Vista: crear */}
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

      {/* Vista: editar */}
      {view === "edit" && editCat && (
        <>
          <p style={{ margin: "-10px 0 18px", fontSize: 13, color: "#888" }}>← Editando: {editCat.nombre}</p>
          <CategoryForm
            initial={{ nombre: editCat.nombre, descripcion: "", activo: true }}
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

  // ALLOWED_ROLES está definido fuera del componente → referencia estable → sin loop
  const { user, loading: userLoading } = useAuth(ALLOWED_ROLES as unknown as import("@/lib/useAuth").AuthUser["rol"][]);
  const isCocinero = user?.rol === "cocinero";
  const isAdmin = user?.rol === "admin";

  const [ingredients, setIngredients] = useState<IIngredient[]>([]);
  const [categories, setCategories] = useState<IIngredientCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "ok" | "bajo" | "critico">("all");
  const [successMsg, setSuccessMsg] = useState("");
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [editIngredient, setEditIngredient] = useState<IIngredient | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchData = async () => {
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
  };

  // FIX DEL LOOP: usar user?._id (string primitivo) en lugar de user (objeto)
  // Así React compara por valor, no por referencia
  useEffect(() => {
    if (!userLoading && user) fetchData();
  }, [userLoading, user?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  // ── Filtros ────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return ingredients.filter((ing) => {
      const matchSearch =
        ing.nombre.toLowerCase().includes(search.toLowerCase()) ||
        (ing.proveedor ?? "").toLowerCase().includes(search.toLowerCase());
      const matchCat =
        filterCat === "all" ? true
        : filterCat === "none" ? !ing.category_id
        : ing.category_id?._id === filterCat;
      const matchStatus = filterStatus === "all" ? true : ing.stockStatus === filterStatus;
      return matchSearch && matchCat && matchStatus;
    });
  }, [ingredients, search, filterCat, filterStatus]);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalOk      = ingredients.filter((i) => i.stockStatus === "ok").length;
  const totalBajo    = ingredients.filter((i) => i.stockStatus === "bajo").length;
  const totalCritico = ingredients.filter((i) => i.stockStatus === "critico").length;

  // ── CRUD ingredientes ──────────────────────────────────────────────────────
  const emptyForm: IngredientFormData = {
    nombre: "", stock_actual: "", stock_minimo: "", stock_maximo: "",
    unidad: "", proveedor: "", category_id: "", activo: true,
  };

  const handleCreate = async (form: IngredientFormData) => {
    if (!form.nombre.trim()) { setFormError("El nombre es obligatorio"); return; }
    if (!form.unidad) { setFormError("La unidad es obligatoria"); return; }
    if (form.stock_actual === "" || Number(form.stock_actual) < 0) { setFormError("El stock actual es obligatorio"); return; }
    if (form.stock_minimo === "" || Number(form.stock_minimo) < 0) { setFormError("El stock mínimo es obligatorio"); return; }
    if (form.stock_maximo === "" || Number(form.stock_maximo) < Number(form.stock_minimo)) {
      setFormError("El stock máximo debe ser mayor al mínimo"); return;
    }
    setFormError("");
    try {
      const res = await fetch("/api/ingredients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.nombre.trim(),
          stock_actual: Number(form.stock_actual),
          stock_minimo: Number(form.stock_minimo),
          stock_maximo: Number(form.stock_maximo),
          unidad: form.unidad,
          proveedor: form.proveedor.trim() || "",
          category_id: form.category_id || null,
          activo: form.activo,
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
    if (!form.nombre.trim()) { setFormError("El nombre es obligatorio"); return; }
    if (!form.unidad) { setFormError("La unidad es obligatoria"); return; }
    if (form.stock_actual === "" || Number(form.stock_actual) < 0) { setFormError("El stock actual es obligatorio"); return; }
    setFormError("");
    try {
      const res = await fetch(`/api/ingredients/${editIngredient._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isCocinero
          ? {
              nombre: editIngredient.nombre,
              stock_actual: Number(form.stock_actual),
              stock_minimo: editIngredient.stock_minimo,
              stock_maximo: editIngredient.stock_maximo,
              unidad: editIngredient.unidad,
              proveedor: editIngredient.proveedor || "",
              category_id: editIngredient.category_id?._id || null,
              activo: editIngredient.activo,
            }
          : {
              nombre: form.nombre.trim(),
              stock_actual: Number(form.stock_actual),
              stock_minimo: Number(form.stock_minimo),
              stock_maximo: Number(form.stock_maximo),
              unidad: form.unidad,
              proveedor: form.proveedor.trim() || "",
              category_id: form.category_id || null,
              activo: form.activo,
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
    ...categories.map((c) => ({ id: c._id, label: c.nombre })),
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
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 10 : 14, minWidth: 0 }}>
          <button onClick={() => router.push(isAdmin ? "/dashboard" : "/dashboard/cocinero")} style={{
            background: "#f4f4f4", border: "1.5px solid #e0e0e0", borderRadius: 9,
            width: 38, height: 38, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", fontSize: 16,
          }}>←</button>
          <div style={{
            width: 40, height: 40, borderRadius: 12, background: "#e85d26", flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: isMobile ? 18 : 22,
          }}>📦</div>
          {isMobile ? (
            <h1 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#1a1a1a" }}>Inventario</h1>
          ) : (
            <div>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#1a1a1a" }}>Control de Inventario</h1>
              <p style={{ margin: 0, fontSize: 12, color: "#888" }}>Gestión de stock y suministros</p>
            </div>
          )}
        </div>

        {/* Acciones del header — solo admin */}
        {isAdmin && (
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            {/* Botón Categorías */}
            <button onClick={() => setShowCategoriesModal(true)} style={{
              background: "#fff", color: "#1a1a1a",
              border: "1.5px solid #1a1a1a",
              padding: isMobile ? "0" : "11px 18px",
              width: isMobile ? 38 : undefined,
              height: isMobile ? 38 : undefined,
              borderRadius: 9, fontSize: isMobile ? 16 : 13, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {isMobile ? "🏷️" : "🏷️ Categorías"}
            </button>

            {/* Botón Nuevo Ingrediente */}
            <button onClick={() => { setFormError(""); setShowCreateModal(true); }} style={{
              background: "#1a1a1a", color: "#fff", border: "none",
              padding: isMobile ? "0" : "11px 22px",
              width: isMobile ? 38 : undefined,
              height: isMobile ? 38 : undefined,
              borderRadius: 9, fontSize: isMobile ? 18 : 13, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {isMobile ? "+" : "+ Nuevo Ingrediente"}
            </button>
          </div>
        )}
      </div>

      {/* ── Toast ── */}
      {successMsg && (
        <div style={{
          position: "fixed", top: 24,
          right: isMobile ? 12 : 24, left: isMobile ? 12 : "auto",
          zIndex: 9999, background: "#1a1a1a", color: "#fff",
          padding: "13px 22px", borderRadius: 10, fontSize: 14, fontWeight: 600,
          boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
        }}>✓ {successMsg}</div>
      )}

      {/* ── Error global ── */}
      {error && (
        <div style={{
          margin: `16px ${px} 0`, background: "#fff0ee", border: "1px solid #e85d26",
          borderRadius: 10, padding: "11px 18px", color: "#c0392b", fontSize: 13,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span>⚠️ {error}</span>
          <button onClick={() => setError("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#c0392b", fontSize: 16 }}>✕</button>
        </div>
      )}

      {/* ── Stats cards ── */}
      <div style={{
        padding: `24px ${px} 0`,
        display: "grid",
        gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
        gap: isMobile ? 10 : 16,
      }}>
        {[
          { label: "Total ingredientes", value: ingredients.length, color: "#1a1a1a", icon: "📦", bg: "#f5f5f5" },
          { label: "Normal",   value: totalOk,      color: "#16a34a", icon: "🟢", bg: "#f0fdf4" },
          { label: "Bajo",     value: totalBajo,    color: "#d97706", icon: "🟡", bg: "#fffbeb" },
          { label: "Crítico",  value: totalCritico, color: "#e85d26", icon: "🔴", bg: "#fff0ee" },
        ].map((s) => (
          <div key={s.label} style={{
            background: "#fff", border: "1.5px solid #e8e8e8", borderRadius: isMobile ? 12 : 16,
            padding: isMobile ? "14px 16px" : "20px 24px",
            display: "flex", alignItems: "center", gap: isMobile ? 10 : 16,
            boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
          }}>
            <div style={{
              width: isMobile ? 36 : 44, height: isMobile ? 36 : 44, borderRadius: 10,
              background: s.bg, display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: isMobile ? 16 : 20, flexShrink: 0,
            }}>{s.icon}</div>
            <div>
              <p style={{ margin: 0, fontSize: isMobile ? 10 : 11, color: "#888", marginBottom: 2 }}>{s.label}</p>
              <p style={{ margin: 0, fontSize: isMobile ? 22 : 28, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Alertas críticas ── */}
      {totalCritico > 0 && (
        <div style={{
          margin: `16px ${px} 0`,
          background: "#fff0ee", border: "1.5px solid #e85d26",
          borderRadius: 12, padding: "14px 18px",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <span style={{ fontSize: 20 }}>🚨</span>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#e85d26" }}>
              {totalCritico} ingrediente{totalCritico > 1 ? "s" : ""} sin stock crítico
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
          }}>🔍</span>
          <input
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
        display: "flex", gap: 8, overflowX: "auto",
      }}>
        {catTabs.map((tab) => (
          <button key={tab.id} onClick={() => setFilterCat(tab.id)} style={{
            padding: "7px 18px", borderRadius: 30, border: "1.5px solid",
            borderColor: filterCat === tab.id ? "#1a1a1a" : "#e0e0e0",
            background: filterCat === tab.id ? "#1a1a1a" : "#fff",
            color: filterCat === tab.id ? "#fff" : "#555",
            fontSize: 13, fontWeight: 600, cursor: "pointer",
            fontFamily: "inherit", flexShrink: 0, whiteSpace: "nowrap",
          }}>{tab.label}</button>
        ))}

        <div style={{ width: 1, background: "#e0e0e0", flexShrink: 0, margin: "4px 4px" }} />

        {(["all", "ok", "bajo", "critico"] as const).map((s) => {
          const labels = { all: "Todos los estados", ok: "🟢 Normal", bajo: "🟡 Bajo", critico: "🔴 Crítico" };
          return (
            <button key={s} onClick={() => setFilterStatus(s)} style={{
              padding: "7px 18px", borderRadius: 30, border: "1.5px solid",
              borderColor: filterStatus === s ? "#e85d26" : "#e0e0e0",
              background: filterStatus === s ? "#fff0ee" : "#fff",
              color: filterStatus === s ? "#e85d26" : "#555",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
              fontFamily: "inherit", flexShrink: 0, whiteSpace: "nowrap",
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
                <button onClick={() => setShowCreateModal(true)} style={{
                  marginTop: 14, background: "#e85d26", color: "#fff", border: "none",
                  padding: "11px 22px", borderRadius: 9, fontSize: 13, fontWeight: 600,
                  cursor: "pointer", fontFamily: "inherit",
                }}>Agregar primer ingrediente</button>
              )}
            </div>
          ) : isMobile ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {filtered.map((ing) => {
                const pct = ing.stock_maximo > 0
                  ? Math.min(100, Math.round((ing.stock_actual / ing.stock_maximo) * 100))
                  : 0;
                const status = STATUS_CONFIG[ing.stockStatus];
                return (
                  <div key={ing._id} style={{ padding: "16px", borderBottom: "1px solid #f0f0f0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <div>
                        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#1a1a1a" }}>{ing.nombre}</p>
                        <p style={{ margin: "2px 0 0", fontSize: 11, color: "#888" }}>
                          {ing.category_id?.nombre ?? "Sin categoría"}
                          {ing.proveedor ? ` · ${ing.proveedor}` : ""}
                        </p>
                      </div>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                        background: status.bg, color: status.color, border: `1px solid ${status.border}`,
                        flexShrink: 0, marginLeft: 8,
                      }}>{status.label}</span>
                    </div>
                    <div style={{ marginBottom: 10 }}>
                      <p style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: "#1a1a1a" }}>
                        {ing.stock_actual} {ing.unidad}
                      </p>
                      <div style={{ height: 6, background: "#f0f0f0", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{
                          height: "100%", borderRadius: 3,
                          background: BAR_COLOR[ing.stockStatus],
                          width: `${pct}%`,
                        }} />
                      </div>
                      <p style={{ margin: "4px 0 0", fontSize: 11, color: "#aaa" }}>
                        Min: {ing.stock_minimo} · Max: {ing.stock_maximo} {ing.unidad}
                      </p>
                    </div>
                    <button onClick={() => { setFormError(""); setEditIngredient(ing); }} style={{
                      width: "100%", padding: "9px", borderRadius: 8,
                      border: "1.5px solid #e0e0e0", background: "#fff",
                      fontSize: 13, fontWeight: 600, cursor: "pointer",
                      color: "#333", fontFamily: "inherit",
                    }}>✏️ {isCocinero ? "Ajustar stock" : "Editar"}</button>
                  </div>
                );
              })}
            </div>
          ) : (
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
                      onEdit={() => { setFormError(""); setEditIngredient(ing); }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal categorías ── */}
      {showCategoriesModal && isAdmin && (
        <CategoriesModal
          categories={categories}
          onClose={() => setShowCategoriesModal(false)}
          isMobile={isMobile}
          onRefresh={fetchData}
        />
      )}

      {/* ── Modal crear ingrediente (solo admin) ── */}
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

      {/* ── Modal editar ingrediente ── */}
      {editIngredient && (
        <Modal
          title={isCocinero ? `Ajustar stock: ${editIngredient.nombre}` : "Editar Ingrediente"}
          onClose={() => setEditIngredient(null)}
          isMobile={isMobile}
        >
          <IngredientForm
            initial={{
              nombre: editIngredient.nombre,
              stock_actual: String(editIngredient.stock_actual),
              stock_minimo: String(editIngredient.stock_minimo),
              stock_maximo: String(editIngredient.stock_maximo),
              unidad: editIngredient.unidad,
              proveedor: editIngredient.proveedor || "",
              category_id: editIngredient.category_id?._id || "",
              activo: editIngredient.activo,
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

      {/* ── Modal confirmar delete ingrediente (solo admin) ── */}
      {deleteId && isAdmin && (
        <Modal onClose={() => setDeleteId(null)} isMobile={isMobile}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🗑️</div>
            <h2 style={{ margin: "0 0 8px", fontSize: 19, fontWeight: 700, color: "#1a1a1a" }}>¿Eliminar ingrediente?</h2>
            <p style={{ color: "#888", fontSize: 13, margin: 0 }}>Esta acción no se puede deshacer.</p>
            <div style={{ display: "flex", gap: 10, marginTop: 22, justifyContent: "center" }}>
              <button onClick={() => setDeleteId(null)} style={{
                padding: "11px 22px", borderRadius: 9, border: "1.5px solid #e0e0e0",
                background: "transparent", fontSize: 13, fontWeight: 600,
                cursor: "pointer", color: "#888", fontFamily: "inherit",
              }}>Cancelar</button>
              <button onClick={() => handleDelete(deleteId)} style={{
                padding: "11px 22px", borderRadius: 9, border: "1.5px solid #e85d26",
                background: "#fff0ee", fontSize: 13, fontWeight: 600,
                cursor: "pointer", color: "#e85d26", fontFamily: "inherit",
              }}>Sí, eliminar</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}