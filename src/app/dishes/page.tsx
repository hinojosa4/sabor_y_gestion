"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

interface ICategory {
  _id: string;
  nombre: string;
  activo: boolean;
}

interface IDish {
  _id: string;
  name: string;
  description?: string;
  price: number;
  isAvailable: boolean;
  image_url?: string;
  ingredients: string[];
  category_id: { _id: string; nombre: string } | string | null;
}

const API = "/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getCatId(d: IDish): string | null {
  if (!d.category_id) return null;
  if (typeof d.category_id === "object") return d.category_id._id;
  return d.category_id;
}
function getCatName(d: IDish): string {
  if (!d.category_id) return "Sin categoría";
  if (typeof d.category_id === "object") return d.category_id.nombre;
  return "Sin categoría";
}

// ─── Estilos compartidos ──────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "11px 14px", borderRadius: 9,
  border: "1.5px solid #e0e0e0", fontSize: 14, outline: "none",
  boxSizing: "border-box", fontFamily: "inherit", color: "#1a1a1a", background: "#fff",
};

type BtnVariant = "primary" | "secondary" | "danger" | "ghost" | "orange";
function Btn({
  children, onClick, variant = "secondary", small = false, disabled = false, fullWidth = false,
}: {
  children: React.ReactNode; onClick?: () => void; variant?: BtnVariant;
  small?: boolean; disabled?: boolean; fullWidth?: boolean;
}) {
  const styles: Record<BtnVariant, React.CSSProperties> = {
    primary:   { background: "#1a1a1a", color: "#fff", border: "none" },
    secondary: { background: "#f4f4f4", color: "#333", border: "1.5px solid #e0e0e0" },
    danger:    { background: "#fff0ee", color: "#e85d26", border: "1.5px solid #e85d26" },
    ghost:     { background: "transparent", color: "#888", border: "1.5px solid #e0e0e0" },
    orange:    { background: "#e85d26", color: "#fff", border: "none" },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...styles[variant],
      padding: small ? "7px 16px" : "11px 22px",
      borderRadius: 9, fontSize: small ? 12 : 13, fontWeight: 600,
      cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
      display: "inline-flex", alignItems: "center", gap: 6,
      whiteSpace: "nowrap", fontFamily: "inherit",
      width: fullWidth ? "100%" : undefined,
      justifyContent: fullWidth ? "center" : undefined,
    }}>
      {children}
    </button>
  );
}

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

function Modal({ title, children, onClose, wide = false }: {
  title?: string; children: React.ReactNode; onClose: () => void; wide?: boolean;
}) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20,
    }}>
      <div style={{
        background: "#fff", borderRadius: 18, padding: "32px 36px",
        width: wide ? 620 : 480, maxWidth: "100%", maxHeight: "90vh",
        overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
      }}>
        {title && <h2 style={{ margin: "0 0 22px", fontSize: 19, fontWeight: 700, color: "#1a1a1a" }}>{title}</h2>}
        {children}
      </div>
    </div>
  );
}

function IngredientTags({ ingredients, onRemove }: {
  ingredients: string[]; onRemove?: (i: number) => void;
}) {
  if (ingredients.length === 0) return <p style={{ fontSize: 12, color: "#bbb", margin: 0 }}>Sin ingredientes</p>;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {ingredients.map((ing, i) => (
        <span key={i} style={{
          background: "#fff8f5", border: "1px solid #e85d26", color: "#e85d26",
          borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 600,
          display: "flex", alignItems: "center", gap: 5,
        }}>
          {ing}
          {onRemove && (
            <button onClick={() => onRemove(i)} style={{
              background: "none", border: "none", cursor: "pointer",
              color: "#e85d26", fontSize: 12, padding: 0, lineHeight: 1,
            }}>✕</button>
          )}
        </span>
      ))}
    </div>
  );
}

// ─── Formulario de plato ──────────────────────────────────────────────────────
type DishFormData = {
  name: string; description: string; price: string;
  isAvailable: boolean; category_id: string;
  ingredients: string[]; image_url: string;
};

function DishForm({ initial, categories, onSubmit, onCancel, error, submitLabel }: {
  initial: DishFormData;
  categories: ICategory[];
  onSubmit: (data: DishFormData) => void;
  onCancel: () => void;
  error: string;
  submitLabel: string;
}) {
  const [form, setForm] = useState<DishFormData>(initial);
  const [newIng, setNewIng] = useState("");
  const [uploading, setUploading] = useState(false);

  const addIng = () => {
    if (!newIng.trim()) return;
    setForm(f => ({ ...f, ingredients: [...f.ingredients, newIng.trim()] }));
    setNewIng("");
  };

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!);
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: "POST", body: formData }
      );
      const data = await res.json();
      if (data.secure_url) {
        setForm(f => ({ ...f, image_url: data.secure_url }));
      }
    } catch {
      // si falla la subida no actualiza la URL
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {error && <ErrorBox msg={error} />}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>

        {/* Nombre */}
        <div style={{ gridColumn: "1 / -1" }}>
          <Field label="Nombre *">
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Ej: Lomo Saltado" style={inputStyle} />
          </Field>
        </div>

        {/* Precio */}
        <Field label="Precio (Bs.) *">
          <input type="number" min={0} step="0.01" value={form.price}
            onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
            placeholder="0.00" style={inputStyle} />
        </Field>

        {/* Categoría */}
        <Field label="Categoría (opcional)">
          <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
            style={inputStyle}>
            <option value="">Sin categoría</option>
            {categories.map(c => <option key={c._id} value={c._id}>{c.nombre}</option>)}
          </select>
        </Field>

        {/* Descripción */}
        <div style={{ gridColumn: "1 / -1" }}>
          <Field label="Descripción">
            <textarea value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Descripción del plato..." rows={2}
              style={{ ...inputStyle, resize: "none" }} />
          </Field>
        </div>

        {/* Imagen — subida a Cloudinary */}
        <div style={{ gridColumn: "1 / -1" }}>
          <Field label="Imagen del plato">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;

               // ✅ Validar tipo
              const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
              if (!allowedTypes.includes(file.type)) {
                alert("Solo se permiten imágenes (JPG, PNG, WEBP, GIF)");
                e.target.value = ""; // limpia el input
                return;
                }
                handleImageUpload(file);
              }}
              style={inputStyle}
            />
            {uploading && (
              <p style={{ fontSize: 12, color: "#888", marginTop: 6 }}>⏳ Subiendo imagen...</p>
            )}
            {form.image_url && !uploading && (
              <div style={{ marginTop: 8, position: "relative" }}>
                <img src={form.image_url} alt="preview" style={{
                  width: "100%", height: 150, objectFit: "cover", borderRadius: 9,
                }} />
                <button
                  onClick={() => setForm(f => ({ ...f, image_url: "" }))}
                  style={{
                    position: "absolute", top: 6, right: 6,
                    background: "rgba(0,0,0,0.5)", color: "#fff",
                    border: "none", borderRadius: 6, padding: "3px 8px",
                    fontSize: 12, cursor: "pointer",
                  }}
                >✕ Quitar</button>
              </div>
            )}
          </Field>
        </div>

        {/* Ingredientes */}
        <div style={{ gridColumn: "1 / -1" }}>
          <Field label="Ingredientes">
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input value={newIng} onChange={e => setNewIng(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addIng(); } }}
                placeholder="Escribe y presiona Enter..." style={inputStyle} />
              <button onClick={addIng} style={{
                background: "#e85d26", color: "#fff", border: "none",
                borderRadius: 9, padding: "0 18px", fontSize: 20, cursor: "pointer", flexShrink: 0,
              }}>+</button>
            </div>
            <IngredientTags
              ingredients={form.ingredients}
              onRemove={i => setForm(f => ({ ...f, ingredients: f.ingredients.filter((_, idx) => idx !== i) }))}
            />
          </Field>
        </div>

        {/* Disponible */}
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14, color: "#333" }}>
            <input type="checkbox" checked={form.isAvailable}
              onChange={e => setForm(f => ({ ...f, isAvailable: e.target.checked }))}
              style={{ width: 17, height: 17 }} />
            Disponible en el menú
          </label>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <Btn variant="ghost" onClick={onCancel}>Cancelar</Btn>
        <Btn variant="orange" onClick={() => onSubmit(form)}>{submitLabel}</Btn>
      </div>
    </div>
  );
}

// ─── Page principal ───────────────────────────────────────────────────────────
export default function DishesPage() {
  const router = useRouter();
  const [dishes, setDishes] = useState<IDish[]>([]);
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [successMsg, setSuccessMsg] = useState("");
  const [error, setError] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editDish, setEditDish] = useState<IDish | null>(null);
  const [deleteDishId, setDeleteDishId] = useState<string | null>(null);
  const [formError, setFormError] = useState("");

  // ── fetch ──────────────────────────────────────────────────────────────────
  const fetchData = async () => {
    setLoading(true);
    try {
      const [dishRes, catRes] = await Promise.all([
        fetch(`${API}/dishes`),
        fetch(`${API}/categories`),
      ]);
      const dishData = await dishRes.json();
      const catData = await catRes.json();
      if (dishData.ok) setDishes(dishData.data);
      if (catData.ok) setCategories(catData.data);
    } catch {
      setError("Error al cargar los datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  // ── filtros ────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return dishes.filter(d => {
      const matchSearch =
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        (d.description || "").toLowerCase().includes(search.toLowerCase());
      const matchCat =
        filterCat === "all" ? true
        : filterCat === "none" ? !getCatId(d)
        : getCatId(d) === filterCat;
      return matchSearch && matchCat;
    });
  }, [dishes, search, filterCat]);

  // ── CRUD ───────────────────────────────────────────────────────────────────
  const emptyForm: DishFormData = {
    name: "", description: "", price: "", isAvailable: true,
    category_id: "", ingredients: [], image_url: "",
  };

  const handleCreate = async (form: DishFormData) => {
    if (!form.name.trim()) { setFormError("El nombre es obligatorio"); return; }
    if (!form.price || Number(form.price) < 0) { setFormError("El precio es obligatorio"); return; }
    setFormError("");
    try {
      const res = await fetch(`${API}/dishes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(), description: form.description.trim(),
          price: Number(form.price), isAvailable: form.isAvailable,
          category_id: form.category_id || null,
          ingredients: form.ingredients, image_url: form.image_url || "",
        }),
      });
      const data = await res.json();
      if (!data.ok) { setFormError(data.message); return; }
      showSuccess("Plato creado correctamente");
      setShowCreateModal(false);
      fetchData();
    } catch { setFormError("Error al crear el plato"); }
  };

  const handleEdit = async (form: DishFormData) => {
    if (!editDish) return;
    if (!form.name.trim()) { setFormError("El nombre es obligatorio"); return; }
    if (!form.price || Number(form.price) < 0) { setFormError("El precio es obligatorio"); return; }
    setFormError("");
    try {
      const res = await fetch(`${API}/dishes/${editDish._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(), description: form.description.trim(),
          price: Number(form.price), isAvailable: form.isAvailable,
          category_id: form.category_id || null,
          ingredients: form.ingredients, image_url: form.image_url || "",
        }),
      });
      const data = await res.json();
      if (!data.ok) { setFormError(data.message); return; }
      showSuccess("Plato actualizado correctamente");
      setEditDish(null);
      fetchData();
    } catch { setFormError("Error al actualizar"); }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`${API}/dishes/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) { setError(data.message); setDeleteDishId(null); return; }
      showSuccess("Plato eliminado");
      setDeleteDishId(null);
      fetchData();
    } catch { setError("Error al eliminar"); }
  };

  // ── stats ──────────────────────────────────────────────────────────────────
  const totalAvailable = dishes.filter(d => d.isAvailable).length;
  const avgPrice = dishes.length > 0
    ? dishes.reduce((s, d) => s + d.price, 0) / dishes.length
    : 0;
  const uncategorized = dishes.filter(d => !getCatId(d)).length;

  const stats: { label: string; value: string | number; color: string; isText?: boolean }[] = [
    { label: "Total Platos",     value: dishes.length,                      color: "#1a1a1a" },
    { label: "Disponibles",      value: totalAvailable,                     color: "#27ae60" },
    { label: "No disponibles",   value: dishes.length - totalAvailable,     color: "#e85d26" },
    { label: "Sin categoría",    value: uncategorized,                      color: "#888" },
    { label: "Precio promedio",  value: `Bs. ${avgPrice.toFixed(2)}`,       color: "#8e44ad", isText: true },
  ];

  const filterTabs = [
    { id: "all",  label: "Todos" },
    { id: "none", label: "Sin categoría" },
    ...categories.map(c => ({ id: c._id, label: c.nombre })),
  ];

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#f8f7f4", fontFamily: "'Georgia', serif" }}>

      {/* Header */}
      <div style={{
        background: "#fff", borderBottom: "2px solid #1a1a1a",
        padding: "18px 40px", display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button onClick={() => router.push("/categories")} style={{
            background: "#f4f4f4", border: "1.5px solid #e0e0e0", borderRadius: 9,
            width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", fontSize: 16,
          }}>←</button>
          <div style={{
            width: 44, height: 44, borderRadius: 12, background: "#e85d26",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
          }}>🍴</div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#1a1a1a" }}>Gestión de Platos</h1>
            <p style={{ margin: 0, fontSize: 12, color: "#888" }}>Administra los platos y precios del menú</p>
          </div>
        </div>
        <Btn variant="primary" onClick={() => { setFormError(""); setShowCreateModal(true); }}>
          + Agregar Plato
        </Btn>
      </div>

      {/* Toast */}
      {successMsg && (
        <div style={{
          position: "fixed", top: 24, right: 24, zIndex: 9999,
          background: "#1a1a1a", color: "#fff", padding: "13px 22px",
          borderRadius: 10, fontSize: 14, fontWeight: 600,
          boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
        }}>✓ {successMsg}</div>
      )}

      {/* Error global */}
      {error && (
        <div style={{
          margin: "16px 40px 0", background: "#fff0ee", border: "1px solid #e85d26",
          borderRadius: 10, padding: "11px 18px", color: "#c0392b", fontSize: 13,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span>⚠️ {error}</span>
          <button onClick={() => setError("")} style={{
            background: "none", border: "none", cursor: "pointer", color: "#c0392b", fontSize: 16,
          }}>✕</button>
        </div>
      )}

      {/* Stats */}
      <div style={{ padding: "24px 40px 0", display: "flex", gap: 14, flexWrap: "wrap" }}>
        {stats.map((s) => (
          <div key={s.label} style={{
            background: "#fff", border: "1.5px solid #e8e8e8",
            borderRadius: 14, padding: "16px 24px", minWidth: 130,
          }}>
            <p style={{ margin: 0, fontSize: 11, color: "#888", marginBottom: 4 }}>{s.label}</p>
            <p style={{ margin: 0, fontSize: s.isText ? 18 : 26, fontWeight: 700, color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Búsqueda y filtros */}
      <div style={{ padding: "20px 40px 0", display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 240 }}>
          <span style={{
            position: "absolute", left: 14, top: "50%",
            transform: "translateY(-50%)", color: "#aaa", fontSize: 16,
          }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar platos..."
            style={{ ...inputStyle, paddingLeft: 40, borderRadius: 30 }}
          />
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {filterTabs.map(tab => (
            <button key={tab.id} onClick={() => setFilterCat(tab.id)} style={{
              padding: "8px 18px", borderRadius: 30, border: "1.5px solid",
              borderColor: filterCat === tab.id ? "#1a1a1a" : "#e0e0e0",
              background: filterCat === tab.id ? "#1a1a1a" : "#fff",
              color: filterCat === tab.id ? "#fff" : "#555",
              fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            }}>{tab.label}</button>
          ))}
        </div>
      </div>

      {/* Grid de platos */}
      <div style={{ padding: "20px 40px 40px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "#888" }}>Cargando platos...</div>
        ) : filtered.length === 0 ? (
          <div style={{
            textAlign: "center", padding: 60, background: "#fff",
            borderRadius: 16, border: "2px dashed #ddd",
          }}>
            <p style={{ fontSize: 36, margin: 0 }}>🍴</p>
            <p style={{ color: "#888", fontSize: 15, marginTop: 10 }}>
              {dishes.length === 0 ? "No hay platos aún" : "Sin resultados para tu búsqueda"}
            </p>
            {dishes.length === 0 && (
              <div style={{ marginTop: 14 }}>
                <Btn variant="orange" onClick={() => setShowCreateModal(true)}>Agregar primer plato</Btn>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 20 }}>
            {filtered.map(dish => (
              <DishCard
                key={dish._id}
                dish={dish}
                onEdit={() => { setFormError(""); setEditDish(dish); }}
                onDelete={() => setDeleteDishId(dish._id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal crear */}
      {showCreateModal && (
        <Modal title="Nuevo Plato" onClose={() => setShowCreateModal(false)} wide>
          <DishForm
            initial={emptyForm}
            categories={categories}
            onSubmit={handleCreate}
            onCancel={() => { setShowCreateModal(false); setFormError(""); }}
            error={formError}
            submitLabel="Crear Plato"
          />
        </Modal>
      )}

      {/* Modal editar */}
      {editDish && (
        <Modal title="Editar Plato" onClose={() => setEditDish(null)} wide>
          <DishForm
            initial={{
              name: editDish.name,
              description: editDish.description || "",
              price: String(editDish.price),
              isAvailable: editDish.isAvailable,
              category_id: getCatId(editDish) || "",
              ingredients: editDish.ingredients || [],
              image_url: editDish.image_url || "",
            }}
            categories={categories}
            onSubmit={handleEdit}
            onCancel={() => { setEditDish(null); setFormError(""); }}
            error={formError}
            submitLabel="Guardar Cambios"
          />
        </Modal>
      )}

      {/* Modal confirmar delete */}
      {deleteDishId && (
        <Modal onClose={() => setDeleteDishId(null)}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🗑️</div>
            <h2 style={{ margin: "0 0 8px", fontSize: 19, fontWeight: 700, color: "#1a1a1a" }}>¿Eliminar plato?</h2>
            <p style={{ color: "#888", fontSize: 13, margin: 0 }}>Esta acción no se puede deshacer.</p>
            <div style={{ display: "flex", gap: 10, marginTop: 22, justifyContent: "center" }}>
              <Btn variant="ghost" onClick={() => setDeleteDishId(null)}>Cancelar</Btn>
              <Btn variant="danger" onClick={() => handleDelete(deleteDishId)}>Sí, eliminar</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Tarjeta de plato ─────────────────────────────────────────────────────────
function DishCard({ dish, onEdit, onDelete }: {
  dish: IDish;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const catName = getCatName(dish);

  return (
    <div style={{
      background: "#fff", borderRadius: 16, border: "1.5px solid #eee",
      overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
      display: "flex", flexDirection: "column",
    }}>
      {/* Cabecera */}
      <div style={{ padding: "18px 20px 14px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1a1a1a", flex: 1, marginRight: 10 }}>
            {dish.name}
          </h3>
        
        </div>

        {/* Categoría */}
        <div style={{ marginBottom: 10 }}>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
            background: catName === "Sin categoría" ? "#f5f5f5" : "#fff8f5",
            color: catName === "Sin categoría" ? "#999" : "#e85d26",
            border: `1px solid ${catName === "Sin categoría" ? "#e0e0e0" : "#e85d26"}`,
          }}>{catName}</span>
        </div>

        {/* Descripción */}
        {dish.description && (
          <p style={{
            margin: "0 0 12px", fontSize: 13, color: "#777", lineHeight: 1.5,
            display: "-webkit-box", WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>
            {dish.description}
          </p>
        )}
      </div>

      {/* Imagen */}
      {dish.image_url ? (
        <img src={dish.image_url} alt={dish.name} style={{ width: "100%", height: 180, objectFit: "cover" }} />
      ) : (
        <div style={{
          width: "100%", height: 100, background: "#f5f5f5",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, color: "#ddd",
        }}>🍴</div>
      )}

      {/* Info precio + ingredientes */}
      <div style={{ padding: "14px 20px 0" }}>
        <div style={{ display: "flex", gap: 24, marginBottom: 10 }}>
          <div>
            <p style={{ margin: 0, fontSize: 11, color: "#aaa" }}>Precio</p>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#e85d26" }}>
              Bs. {dish.price.toFixed(2)}
            </p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 11, color: "#aaa" }}>Estado</p>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: dish.isAvailable ? "#27ae60" : "#999" }}>
              {dish.isAvailable ? "Disponible" : "No disponible"}
            </p>
          </div>
        </div>

        {dish.ingredients && dish.ingredients.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <p style={{ margin: "0 0 6px", fontSize: 11, color: "#aaa" }}>Ingredientes:</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {dish.ingredients.map((ing, i) => (
                <span key={i} style={{
                  background: "#f5f5f5", color: "#555", borderRadius: 20,
                  padding: "2px 8px", fontSize: 11, fontWeight: 600,
                }}>{ing}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Botones */}
      <div style={{
        padding: "12px 20px 16px", display: "flex", gap: 10, alignItems: "center",
        borderTop: "1.5px solid #f5f5f5", marginTop: "auto",
      }}>
        <button onClick={onEdit} style={{
          flex: 1, padding: "10px", borderRadius: 9,
          border: "1.5px solid #e0e0e0", background: "#fff",
          fontSize: 13, fontWeight: 600, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          color: "#333", fontFamily: "inherit",
        }}>
          ✏️ Editar
        </button>
        <button onClick={onDelete} style={{
          width: 40, height: 40, borderRadius: 9,
          border: "1.5px solid #e85d26", background: "#fff0ee",
          fontSize: 16, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#e85d26", flexShrink: 0,
        }}>
          🗑️
        </button>
      </div>
    </div>
  );
}