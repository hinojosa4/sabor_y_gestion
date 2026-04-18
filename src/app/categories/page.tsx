"use client";

import { useState, useEffect } from "react";

interface ICategory {
  _id: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  createdAt: string;
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

// ─── Botón reutilizable ───────────────────────────────────────────────────────
type BtnVariant = "primary" | "secondary" | "danger" | "ghost" | "orange";
function Btn({
  children, onClick, variant = "secondary", small = false, disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: BtnVariant;
  small?: boolean;
  disabled?: boolean;
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
      padding: small ? "6px 14px" : "10px 20px",
      borderRadius: 9, fontSize: small ? 12 : 13, fontWeight: 600,
      cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
      display: "inline-flex", alignItems: "center", gap: 6,
      whiteSpace: "nowrap", fontFamily: "inherit", transition: "opacity 0.15s",
    }}>
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 700, color: "#555", display: "block", marginBottom: 6, letterSpacing: "0.05em", textTransform: "uppercase" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "11px 14px", borderRadius: 9,
  border: "1.5px solid #e0e0e0", fontSize: 14, outline: "none",
  boxSizing: "border-box", fontFamily: "inherit", color: "#1a1a1a",
};

// ─── Page principal ───────────────────────────────────────────────────────────
export default function CategoriesPage() {
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [dishes, setDishes] = useState<IDish[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<ICategory | null>(null);
  const [showCatModal, setShowCatModal] = useState(false);
  const [catModalMode, setCatModalMode] = useState<"create" | "edit">("create");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [catForm, setCatForm] = useState({ nombre: "", descripcion: "", activo: true });

  // Modal nuevo plato
  const [showDishModal, setShowDishModal] = useState(false);
  const [dishForm, setDishForm] = useState({
    name: "", description: "", price: "", isAvailable: true, category_id: "", ingredients: [] as string[],
  });
  const [newIngredient, setNewIngredient] = useState("");

  // Modal asignar
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignTargetCategory, setAssignTargetCategory] = useState<ICategory | null>(null);

  // Modal detalle plato
  const [selectedDish, setSelectedDish] = useState<IDish | null>(null);
  const [showDishDetail, setShowDishDetail] = useState(false);
  const [detailForm, setDetailForm] = useState<{
    name: string; description: string; price: string;
    isAvailable: boolean; category_id: string; ingredients: string[];
  }>({ name: "", description: "", price: "", isAvailable: true, category_id: "", ingredients: [] });
  const [detailNewIngredient, setDetailNewIngredient] = useState("");
  const [detailEditing, setDetailEditing] = useState(false);

  // ── fetch ──────────────────────────────────────────────────────────────────
  const fetchData = async () => {
    setLoading(true);
    try {
      const [catRes, dishRes] = await Promise.all([
        fetch(`${API}/categories`),
        fetch(`${API}/dishes`),
      ]);
      const catData = await catRes.json();
      const dishData = await dishRes.json();
      if (catData.ok) setCategories(catData.data);
      if (dishData.ok) setDishes(dishData.data);
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

  // ── helpers ────────────────────────────────────────────────────────────────
  const getCatId = (d: IDish): string | null => {
    if (!d.category_id) return null;
    if (typeof d.category_id === "object") return d.category_id._id;
    return d.category_id;
  };

  const getDishesForCategory = (catId: string) =>
    dishes.filter((d) => getCatId(d) === catId);

  const uncategorizedDishes = dishes.filter((d) => !getCatId(d));

  // ── categoría CRUD ─────────────────────────────────────────────────────────
  const openCreateCat = () => {
    setCatForm({ nombre: "", descripcion: "", activo: true });
    setCatModalMode("create");
    setShowCatModal(true);
    setError("");
  };

  const openEditCat = (cat: ICategory) => {
    setCatForm({ nombre: cat.nombre, descripcion: cat.descripcion || "", activo: cat.activo });
    setSelectedCategory(cat);
    setCatModalMode("edit");
    setShowCatModal(true);
    setError("");
  };

  const closeCatModal = () => { setShowCatModal(false); setSelectedCategory(null); setError(""); };

  const handleCatSubmit = async () => {
    if (!catForm.nombre.trim()) { setError("El nombre es obligatorio"); return; }
    setError("");
    try {
      const url = catModalMode === "create"
        ? `${API}/categories`
        : `${API}/categories/${selectedCategory?._id}`;
      const res = await fetch(url, {
        method: catModalMode === "create" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(catForm),
      });
      const data = await res.json();
      if (!data.ok) { setError(data.message); return; }
      showSuccess(catModalMode === "create" ? "Categoría creada" : "Categoría actualizada");
      closeCatModal();
      fetchData();
    } catch { setError("Error al guardar"); }
  };

  const handleDeleteCat = async (id: string) => {
    try {
      const res = await fetch(`${API}/categories/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) { setError(data.message); setShowDeleteConfirm(null); return; }
      showSuccess("Categoría eliminada");
      setShowDeleteConfirm(null);
      fetchData();
    } catch { setError("Error al eliminar"); }
  };

  // ── plato crear ────────────────────────────────────────────────────────────
  const openDishModal = () => {
    setDishForm({ name: "", description: "", price: "", isAvailable: true, category_id: "", ingredients: [] });
    setNewIngredient("");
    setShowDishModal(true);
    setError("");
  };

  const closeDishModal = () => { setShowDishModal(false); setError(""); };

  const handleCreateDish = async () => {
    if (!dishForm.name.trim()) { setError("El nombre es obligatorio"); return; }
    if (!dishForm.price || Number(dishForm.price) < 0) { setError("El precio es obligatorio"); return; }
    setError("");
    try {
      const res = await fetch(`${API}/dishes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: dishForm.name.trim(),
          description: dishForm.description.trim(),
          price: Number(dishForm.price),
          isAvailable: dishForm.isAvailable,
          category_id: dishForm.category_id || null,
          ingredients: dishForm.ingredients,
        }),
      });
      const data = await res.json();
      if (!data.ok) { setError(data.message); return; }
      showSuccess("Plato creado correctamente");
      closeDishModal();
      fetchData();
    } catch { setError("Error al crear el plato"); }
  };

  // ── plato detalle / editar ─────────────────────────────────────────────────
  const openDishDetail = (dish: IDish) => {
    setSelectedDish(dish);
    setDetailForm({
      name: dish.name,
      description: dish.description || "",
      price: String(dish.price),
      isAvailable: dish.isAvailable,
      category_id: getCatId(dish) || "",
      ingredients: dish.ingredients || [],
    });
    setDetailNewIngredient("");
    setDetailEditing(false);
    setShowDishDetail(true);
    setError("");
  };

  const closeDishDetail = () => { setShowDishDetail(false); setSelectedDish(null); setError(""); setDetailEditing(false); };

  const handleSaveDish = async () => {
    if (!selectedDish) return;
    if (!detailForm.name.trim()) { setError("El nombre es obligatorio"); return; }
    if (!detailForm.price || Number(detailForm.price) < 0) { setError("El precio no puede ser negativo"); return; }
    setError("");
    try {
      const res = await fetch(`${API}/dishes/${selectedDish._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: detailForm.name.trim(),
          description: detailForm.description.trim(),
          price: Number(detailForm.price),
          isAvailable: detailForm.isAvailable,
          category_id: detailForm.category_id || null,
          ingredients: detailForm.ingredients,
        }),
      });
      const data = await res.json();
      if (!data.ok) { setError(data.message); return; }
      showSuccess("Plato actualizado");
      closeDishDetail();
      fetchData();
    } catch { setError("Error al guardar"); }
  };

  const handleDeleteDish = async (id: string) => {
    try {
      const res = await fetch(`${API}/dishes/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) { setError(data.message); return; }
      showSuccess("Plato eliminado");
      closeDishDetail();
      fetchData();
    } catch { setError("Error al eliminar"); }
  };

  // ── asignar plato ──────────────────────────────────────────────────────────
  const openAssignModal = (cat: ICategory) => {
    setAssignTargetCategory(cat);
    setShowAssignModal(true);
    setError("");
  };

  const handleAssignDish = async (dishId: string, catId: string | null) => {
    try {
      const dish = dishes.find(d => d._id === dishId);
      if (!dish) return;
      const res = await fetch(`${API}/dishes/${dishId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: dish.name,
          price: dish.price,
          category_id: catId,
          isAvailable: dish.isAvailable,
          description: dish.description || "",
          ingredients: dish.ingredients || [],
        }),
      });
      const data = await res.json();
      if (!data.ok) { setError(data.message); return; }
      showSuccess(catId ? "Plato asignado" : "Plato removido de la categoría");
      fetchData();
    } catch { setError("Error al asignar"); }
  };

  const dishesNotInCategory = (catId: string) =>
    dishes.filter((d) => getCatId(d) !== catId);

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#f8f7f4", fontFamily: "'Georgia', serif" }}>

      {/* Header */}
      <div style={{
        background: "#fff", borderBottom: "2px solid #1a1a1a",
        padding: "18px 40px", display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, background: "#e85d26",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
          }}>🍽️</div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#1a1a1a" }}>Gestión de Categorías</h1>
            <p style={{ margin: 0, fontSize: 12, color: "#888" }}>Organiza y asigna los platos de tu menú</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Btn variant="secondary" onClick={openDishModal}>🍴 Nuevo Plato</Btn>
          <Btn variant="primary" onClick={openCreateCat}>+ Nueva Categoría</Btn>
        </div>
      </div>

      {/* Toast */}
      {successMsg && (
        <div style={{
          position: "fixed", top: 24, right: 24, zIndex: 9999,
          background: "#1a1a1a", color: "#fff",
          padding: "13px 22px", borderRadius: 10, fontSize: 14, fontWeight: 600,
          boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
        }}>✓ {successMsg}</div>
      )}

      {/* Error global */}
      {error && !showCatModal && !showDishModal && !showAssignModal && !showDishDetail && (
        <div style={{
          margin: "16px 40px 0", background: "#fff0ee", border: "1px solid #e85d26",
          borderRadius: 10, padding: "11px 18px", color: "#c0392b", fontSize: 13,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span>⚠️ {error}</span>
          <button onClick={() => setError("")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#c0392b" }}>✕</button>
        </div>
      )}

      {/* Stats */}
      <div style={{ padding: "24px 40px 0", display: "flex", gap: 14, flexWrap: "wrap" }}>
        {[
          { label: "Total Categorías", value: categories.length, color: "#1a1a1a" },
          { label: "Activas", value: categories.filter(c => c.activo).length, color: "#27ae60" },
          { label: "Inactivas", value: categories.filter(c => !c.activo).length, color: "#e85d26" },
          { label: "Total Platos", value: dishes.length, color: "#8e44ad" },
          { label: "Sin Categoría", value: uncategorizedDishes.length, color: "#888" },
        ].map((s) => (
          <div key={s.label} style={{
            background: "#fff", border: "1.5px solid #e8e8e8",
            borderRadius: 14, padding: "16px 24px", minWidth: 130,
          }}>
            <p style={{ margin: 0, fontSize: 11, color: "#888", marginBottom: 4 }}>{s.label}</p>
            <p style={{ margin: 0, fontSize: 26, fontWeight: 700, color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Lista */}
      <div style={{ padding: "24px 40px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "#888" }}>Cargando...</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

            {categories.length === 0 && (
              <div style={{ textAlign: "center", padding: 60, background: "#fff", borderRadius: 16, border: "2px dashed #ddd" }}>
                <p style={{ fontSize: 36, margin: 0 }}>📂</p>
                <p style={{ color: "#888", fontSize: 15, marginTop: 10 }}>No hay categorías aún</p>
                <div style={{ marginTop: 14 }}><Btn variant="orange" onClick={openCreateCat}>Crear primera categoría</Btn></div>
              </div>
            )}

            {/* Categorías con sus platos */}
            {categories.map((cat) => {
              const catDishes = getDishesForCategory(cat._id);
              const available = catDishes.filter(d => d.isAvailable).length;
              return (
                <div key={cat._id} style={{
                  background: "#fff", borderRadius: 16,
                  border: "1.5px solid #e8e8e8", overflow: "hidden",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                }}>
                  <div style={{
                    padding: "18px 24px",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    borderBottom: catDishes.length > 0 ? "1.5px solid #f0f0f0" : "none",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{
                        width: 46, height: 46, borderRadius: 12,
                        background: cat.activo ? "#fff8f5" : "#f5f5f5",
                        border: `2px solid ${cat.activo ? "#e85d26" : "#ddd"}`,
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
                      }}>🏷️</div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#1a1a1a" }}>{cat.nombre}</h2>
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 20,
                            background: cat.activo ? "#e8f8ef" : "#f5f5f5",
                            color: cat.activo ? "#27ae60" : "#999",
                          }}>
                            {cat.activo ? "ACTIVA" : "INACTIVA"}
                          </span>
                        </div>
                        <p style={{ margin: "3px 0 0", fontSize: 12, color: "#888" }}>
                          {cat.descripcion || "Sin descripción"} ·{" "}
                          <span style={{ color: "#e85d26", fontWeight: 600 }}>{catDishes.length} plato{catDishes.length !== 1 ? "s" : ""}</span>
                          {catDishes.length > 0 && <span style={{ color: "#27ae60" }}> · {available} disponible{available !== 1 ? "s" : ""}</span>}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <Btn variant="secondary" small onClick={() => openAssignModal(cat)}>＋ Asignar plato</Btn>
                      <Btn variant="secondary" small onClick={() => openEditCat(cat)}>✏️ Editar</Btn>
                      <Btn variant="danger" small onClick={() => { setError(""); setShowDeleteConfirm(cat._id); }}>🗑️</Btn>
                    </div>
                  </div>

                  {catDishes.length > 0 && (
                    <div style={{ padding: "14px 24px 18px", background: "#fafafa" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
                        {catDishes.map((dish) => (
                          <DishCard key={dish._id} dish={dish} onClick={() => openDishDetail(dish)} onRemove={() => handleAssignDish(dish._id, null)} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Sección sin categoría */}
            {uncategorizedDishes.length > 0 && (
              <div style={{ background: "#fff", borderRadius: 16, border: "2px dashed #ccc", overflow: "hidden" }}>
                <div style={{
                  padding: "18px 24px",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  borderBottom: "1.5px solid #f0f0f0",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{
                      width: 46, height: 46, borderRadius: 12, background: "#f5f5f5",
                      border: "2px solid #ddd", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
                    }}>📦</div>
                    <div>
                      <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#888" }}>Sin categoría</h2>
                      <p style={{ margin: "3px 0 0", fontSize: 12, color: "#aaa" }}>
                        {uncategorizedDishes.length} plato{uncategorizedDishes.length !== 1 ? "s" : ""} sin asignar · Haz click en un plato para editarlo y asignarlo
                      </p>
                    </div>
                  </div>
                </div>
                <div style={{ padding: "14px 24px 18px", background: "#fafafa" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
                    {uncategorizedDishes.map((dish) => (
                      <DishCard
                        key={dish._id}
                        dish={dish}
                        onClick={() => openDishDetail(dish)}
                        categories={categories}
                        onAssign={(catId) => handleAssignDish(dish._id, catId)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modal categoría ── */}
      {showCatModal && (
        <Modal title={catModalMode === "create" ? "Nueva Categoría" : "Editar Categoría"} onClose={closeCatModal}>
          {error && <ErrorBox msg={error} />}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Field label="Nombre *">
              <input value={catForm.nombre} onChange={(e) => setCatForm({ ...catForm, nombre: e.target.value })}
                placeholder="Ej: Entradas, Platos Fuertes..." style={inputStyle} />
            </Field>
            <Field label="Descripción">
              <textarea value={catForm.descripcion} onChange={(e) => setCatForm({ ...catForm, descripcion: e.target.value })}
                placeholder="Descripción opcional..." rows={3} style={{ ...inputStyle, resize: "none" }} />
            </Field>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14, color: "#333" }}>
              <input type="checkbox" checked={catForm.activo}
                onChange={(e) => setCatForm({ ...catForm, activo: e.target.checked })}
                style={{ width: 17, height: 17 }} />
              Categoría activa
            </label>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
            <Btn variant="ghost" onClick={closeCatModal}>Cancelar</Btn>
            <Btn variant="primary" onClick={handleCatSubmit}>
              {catModalMode === "create" ? "Crear Categoría" : "Guardar Cambios"}
            </Btn>
          </div>
        </Modal>
      )}

      {/* ── Modal nuevo plato ── */}
      {showDishModal && (
        <Modal title="Nuevo Plato" onClose={closeDishModal}>
          {error && <ErrorBox msg={error} />}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Field label="Nombre *">
              <input value={dishForm.name} onChange={(e) => setDishForm({ ...dishForm, name: e.target.value })}
                placeholder="Ej: Lomo Saltado" style={inputStyle} />
            </Field>
            <Field label="Descripción">
              <textarea value={dishForm.description} onChange={(e) => setDishForm({ ...dishForm, description: e.target.value })}
                placeholder="Ingredientes o descripción..." rows={2} style={{ ...inputStyle, resize: "none" }} />
            </Field>
            <Field label="Precio (Bs.) *">
              <input type="number" min={0} value={dishForm.price}
                onChange={(e) => setDishForm({ ...dishForm, price: e.target.value })}
                placeholder="0.00" style={inputStyle} />
            </Field>
            <Field label="Categoría (opcional)">
              <select value={dishForm.category_id}
                onChange={(e) => setDishForm({ ...dishForm, category_id: e.target.value })}
                style={{ ...inputStyle, background: "#fff" }}>
                <option value="">Sin categoría</option>
                {categories.map((cat) => (
                  <option key={cat._id} value={cat._id}>{cat.nombre}</option>
                ))}
              </select>
            </Field>
            <Field label="Ingredientes">
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input value={newIngredient}
                  onChange={(e) => setNewIngredient(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newIngredient.trim()) {
                      setDishForm({ ...dishForm, ingredients: [...dishForm.ingredients, newIngredient.trim()] });
                      setNewIngredient("");
                    }
                  }}
                  placeholder="Escribe y presiona Enter..." style={{ ...inputStyle }} />
                <button onClick={() => {
                  if (newIngredient.trim()) {
                    setDishForm({ ...dishForm, ingredients: [...dishForm.ingredients, newIngredient.trim()] });
                    setNewIngredient("");
                  }
                }} style={{
                  background: "#e85d26", color: "#fff", border: "none",
                  borderRadius: 9, padding: "0 16px", fontSize: 18, cursor: "pointer",
                }}>+</button>
              </div>
              <IngredientTags
                ingredients={dishForm.ingredients}
                onRemove={(i) => setDishForm({ ...dishForm, ingredients: dishForm.ingredients.filter((_, idx) => idx !== i) })}
              />
            </Field>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14, color: "#333" }}>
              <input type="checkbox" checked={dishForm.isAvailable}
                onChange={(e) => setDishForm({ ...dishForm, isAvailable: e.target.checked })}
                style={{ width: 17, height: 17 }} />
              Disponible
            </label>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
            <Btn variant="ghost" onClick={closeDishModal}>Cancelar</Btn>
            <Btn variant="orange" onClick={handleCreateDish}>Crear Plato</Btn>
          </div>
        </Modal>
      )}

      {/* ── Modal asignar platos ── */}
      {showAssignModal && assignTargetCategory && (
        <Modal title={`Asignar platos → ${assignTargetCategory.nombre}`} onClose={() => setShowAssignModal(false)} wide>
          {error && <ErrorBox msg={error} />}
          <p style={{ margin: "0 0 14px", fontSize: 13, color: "#888" }}>Selecciona platos para moverlos a esta categoría.</p>
          <div style={{ maxHeight: 360, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
            {dishesNotInCategory(assignTargetCategory._id).length === 0 ? (
              <p style={{ textAlign: "center", color: "#aaa", padding: 24 }}>Todos los platos ya están en esta categoría</p>
            ) : (
              dishesNotInCategory(assignTargetCategory._id).map((dish) => (
                <div key={dish._id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "11px 14px", borderRadius: 10, border: "1.5px solid #eee", background: "#fafafa",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {dish.image_url ? (
                      <img src={dish.image_url} alt={dish.name} style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: 40, height: 40, borderRadius: 8, background: "#eee", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🍴</div>
                    )}
                    <div>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>{dish.name}</p>
                      <p style={{ margin: 0, fontSize: 11, color: "#aaa" }}>
                        Bs. {dish.price.toFixed(2)} · {!getCatId(dish) ? "Sin categoría" : `En: ${typeof dish.category_id === "object" && dish.category_id ? dish.category_id.nombre : "otra categoría"}`}
                      </p>
                    </div>
                  </div>
                  <Btn variant="orange" small onClick={() => handleAssignDish(dish._id, assignTargetCategory._id)}>Añadir aquí</Btn>
                </div>
              ))
            )}
          </div>
          <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end" }}>
            <Btn variant="secondary" onClick={() => setShowAssignModal(false)}>Cerrar</Btn>
          </div>
        </Modal>
      )}

      {/* ── Modal detalle / editar plato ── */}
      {showDishDetail && selectedDish && (
        <Modal title="" onClose={closeDishDetail} wide>
          {error && <ErrorBox msg={error} />}

          {/* Cabecera del modal */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#1a1a1a" }}>
                {detailEditing ? "Editar Plato" : selectedDish.name}
              </h2>
              {!detailEditing && (
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#888" }}>
                  {typeof selectedDish.category_id === "object" && selectedDish.category_id
                    ? selectedDish.category_id.nombre
                    : "Sin categoría"}
                </p>
              )}
            </div>
            {!detailEditing && (
              <div style={{ display: "flex", gap: 8 }}>
                <Btn variant="secondary" small onClick={() => setDetailEditing(true)}>✏️ Editar</Btn>
                <Btn variant="danger" small onClick={() => handleDeleteDish(selectedDish._id)}>🗑️ Eliminar</Btn>
              </div>
            )}
          </div>

          {detailEditing ? (
            /* ── Modo edición ── */
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Field label="Nombre *">
                <input value={detailForm.name} onChange={(e) => setDetailForm({ ...detailForm, name: e.target.value })}
                  style={inputStyle} />
              </Field>
              <Field label="Descripción">
                <textarea value={detailForm.description} onChange={(e) => setDetailForm({ ...detailForm, description: e.target.value })}
                  rows={2} style={{ ...inputStyle, resize: "none" }} />
              </Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Precio (Bs.) *">
                  <input type="number" min={0} value={detailForm.price}
                    onChange={(e) => setDetailForm({ ...detailForm, price: e.target.value })}
                    style={inputStyle} />
                </Field>
                <Field label="Categoría (opcional)">
                  <select value={detailForm.category_id}
                    onChange={(e) => setDetailForm({ ...detailForm, category_id: e.target.value })}
                    style={{ ...inputStyle, background: "#fff" }}>
                    <option value="">Sin categoría</option>
                    {categories.map((cat) => (
                      <option key={cat._id} value={cat._id}>{cat.nombre}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Ingredientes">
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <input value={detailNewIngredient}
                    onChange={(e) => setDetailNewIngredient(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && detailNewIngredient.trim()) {
                        setDetailForm({ ...detailForm, ingredients: [...detailForm.ingredients, detailNewIngredient.trim()] });
                        setDetailNewIngredient("");
                      }
                    }}
                    placeholder="Escribe y presiona Enter..." style={{ ...inputStyle }} />
                  <button onClick={() => {
                    if (detailNewIngredient.trim()) {
                      setDetailForm({ ...detailForm, ingredients: [...detailForm.ingredients, detailNewIngredient.trim()] });
                      setDetailNewIngredient("");
                    }
                  }} style={{
                    background: "#e85d26", color: "#fff", border: "none",
                    borderRadius: 9, padding: "0 16px", fontSize: 18, cursor: "pointer",
                  }}>+</button>
                </div>
                <IngredientTags
                  ingredients={detailForm.ingredients}
                  onRemove={(i) => setDetailForm({ ...detailForm, ingredients: detailForm.ingredients.filter((_, idx) => idx !== i) })}
                />
              </Field>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14, color: "#333" }}>
                <input type="checkbox" checked={detailForm.isAvailable}
                  onChange={(e) => setDetailForm({ ...detailForm, isAvailable: e.target.checked })}
                  style={{ width: 17, height: 17 }} />
                Disponible
              </label>
              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <Btn variant="ghost" onClick={() => { setDetailEditing(false); setError(""); }}>Cancelar</Btn>
                <Btn variant="primary" onClick={handleSaveDish}>Guardar Cambios</Btn>
              </div>
            </div>
          ) : (
            /* ── Modo vista ── */
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {selectedDish.image_url && (
                <img src={selectedDish.image_url} alt={selectedDish.name} style={{
                  width: "100%", height: 200, objectFit: "cover", borderRadius: 12,
                }} />
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <InfoBlock label="Precio" value={`Bs. ${selectedDish.price.toFixed(2)}`} valueColor="#e85d26" />
                <InfoBlock label="Estado" value={selectedDish.isAvailable ? "Disponible" : "No disponible"} valueColor={selectedDish.isAvailable ? "#27ae60" : "#999"} />
              </div>
              {selectedDish.description && (
                <InfoBlock label="Descripción" value={selectedDish.description} />
              )}
              {selectedDish.ingredients && selectedDish.ingredients.length > 0 && (
                <div>
                  <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: "#555", letterSpacing: "0.05em", textTransform: "uppercase" }}>Ingredientes</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {selectedDish.ingredients.map((ing, i) => (
                      <span key={i} style={{
                        background: "#fff8f5", border: "1px solid #e85d26",
                        color: "#e85d26", borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 600,
                      }}>{ing}</span>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <Btn variant="ghost" onClick={closeDishDetail}>Cerrar</Btn>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* ── Modal confirmar delete categoría ── */}
      {showDeleteConfirm && (
        <Modal title="" onClose={() => { setShowDeleteConfirm(null); setError(""); }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🗑️</div>
            <h2 style={{ margin: "0 0 8px", fontSize: 19, fontWeight: 700, color: "#1a1a1a" }}>¿Eliminar categoría?</h2>
            <p style={{ color: "#888", fontSize: 13, margin: 0 }}>Esta acción no se puede deshacer.</p>
            {error && <div style={{ marginTop: 14 }}><ErrorBox msg={error} /></div>}
            <div style={{ display: "flex", gap: 10, marginTop: 22, justifyContent: "center" }}>
              <Btn variant="ghost" onClick={() => { setShowDeleteConfirm(null); setError(""); }}>Cancelar</Btn>
              <Btn variant="danger" onClick={() => handleDeleteCat(showDeleteConfirm)}>Sí, eliminar</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Componentes auxiliares ───────────────────────────────────────────────────

function Modal({ title, children, onClose, wide = false }: {
  title: string; children: React.ReactNode; onClose: () => void; wide?: boolean;
}) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
      padding: 20,
    }}>
      <div style={{
        background: "#fff", borderRadius: 18, padding: "32px 36px",
        width: wide ? 600 : 460, maxWidth: "100%", maxHeight: "90vh",
        overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
      }}>
        {title && <h2 style={{ margin: "0 0 20px", fontSize: 19, fontWeight: 700, color: "#1a1a1a" }}>{title}</h2>}
        {children}
      </div>
    </div>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div style={{
      background: "#fff0ee", border: "1px solid #e85d26",
      borderRadius: 8, padding: "10px 14px", color: "#c0392b",
      fontSize: 13, marginBottom: 14,
    }}>⚠️ {msg}</div>
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

function IngredientTags({ ingredients, onRemove }: { ingredients: string[]; onRemove: (i: number) => void }) {
  if (ingredients.length === 0) return <p style={{ fontSize: 12, color: "#bbb", margin: 0 }}>Sin ingredientes aún</p>;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {ingredients.map((ing, i) => (
        <span key={i} style={{
          background: "#fff8f5", border: "1px solid #e85d26",
          color: "#e85d26", borderRadius: 20, padding: "4px 10px",
          fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6,
        }}>
          {ing}
          <button onClick={() => onRemove(i)} style={{
            background: "none", border: "none", cursor: "pointer",
            color: "#e85d26", fontSize: 13, padding: 0, lineHeight: 1,
          }}>✕</button>
        </span>
      ))}
    </div>
  );
}

function DishCard({ dish, onClick, categories, onRemove, onAssign }: {
  dish: IDish;
  onClick: () => void;
  categories?: ICategory[];
  onRemove?: () => void;
  onAssign?: (catId: string) => void;
}) {
  const [assignValue, setAssignValue] = useState("");

  return (
    <div style={{
      background: "#fff", borderRadius: 10, border: "1.5px solid #eee",
      padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8,
      transition: "box-shadow 0.15s",
    }}>
      {/* Área clickeable */}
      <div onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
        {dish.image_url ? (
          <img src={dish.image_url} alt={dish.name} style={{ width: 42, height: 42, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
        ) : (
          <div style={{ width: 42, height: 42, borderRadius: 8, background: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>🍴</div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#1a1a1a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{dish.name}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
            <span style={{ fontSize: 12, color: "#e85d26", fontWeight: 700 }}>Bs. {dish.price.toFixed(2)}</span>
            <span style={{
              fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 20,
              background: dish.isAvailable ? "#e8f8ef" : "#f5f5f5",
              color: dish.isAvailable ? "#27ae60" : "#999",
            }}>
              {dish.isAvailable ? "Disponible" : "No disponible"}
            </span>
          </div>
          {dish.ingredients && dish.ingredients.length > 0 && (
            <p style={{ margin: "3px 0 0", fontSize: 11, color: "#aaa", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {dish.ingredients.slice(0, 3).join(", ")}{dish.ingredients.length > 3 ? "..." : ""}
            </p>
          )}
        </div>
        {onRemove && (
          <button onClick={(e) => { e.stopPropagation(); onRemove(); }} title="Quitar de esta categoría" style={{
            background: "none", border: "none", cursor: "pointer", color: "#ccc", fontSize: 15, padding: 2, flexShrink: 0,
          }}>✕</button>
        )}
      </div>

      {/* Selector para platos sin categoría */}
      {categories && onAssign && (
        <div style={{ display: "flex", gap: 6 }}>
          <select value={assignValue} onChange={(e) => setAssignValue(e.target.value)} style={{
            flex: 1, padding: "6px 10px", borderRadius: 7,
            border: "1.5px solid #e0e0e0", fontSize: 12,
            fontFamily: "inherit", color: "#333", background: "#fff",
          }}>
            <option value="">Asignar a categoría...</option>
            {categories.map((c) => <option key={c._id} value={c._id}>{c.nombre}</option>)}
          </select>
          <button onClick={() => { if (assignValue) { onAssign(assignValue); setAssignValue(""); } }}
            disabled={!assignValue} style={{
              background: assignValue ? "#e85d26" : "#f0f0f0",
              color: assignValue ? "#fff" : "#aaa",
              border: "none", borderRadius: 7, padding: "6px 12px",
              fontSize: 12, fontWeight: 600,
              cursor: assignValue ? "pointer" : "not-allowed",
            }}>
            Asignar
          </button>
        </div>
      )}
    </div>
  );
}