"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

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

// ─── Hook responsive ──────────────────────────────────────────────────────────
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
  const router = useRouter();
  const isMobile = useIsMobile();

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

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignTargetCategory, setAssignTargetCategory] = useState<ICategory | null>(null);

  const [selectedDish, setSelectedDish] = useState<IDish | null>(null);
  const [showDishDetail, setShowDishDetail] = useState(false);

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
          image_url: dish.image_url || "",
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

  // ─── Padding lateral responsive ────────────────────────────────────────────
  const px = isMobile ? "16px" : "40px";

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#f8f7f4", fontFamily: "'Georgia', serif" }}>

      {/* Header */}
      <div style={{
        background: "#fff",
        borderBottom: "2px solid #1a1a1a",
        padding: isMobile ? "14px 16px" : "18px 40px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
      }}>
        {/* Izquierda: back + ícono + título */}
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 10 : 14, minWidth: 0 }}>
          <button onClick={() => router.push("/dashboard")} style={{
            background: "#f4f4f4", border: "1.5px solid #e0e0e0", borderRadius: 9,
            width: 38, height: 38, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", fontSize: 16,
          }}>←</button>
          <div style={{
            width: 40, height: 40, borderRadius: 12, background: "#e85d26",
            flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: isMobile ? 18 : 22,
          }}>🍽️</div>
          {!isMobile && (
            <div>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#1a1a1a" }}>Gestión de Categorías</h1>
              <p style={{ margin: 0, fontSize: 12, color: "#888" }}>Organiza y asigna los platos de tu menú</p>
            </div>
          )}
          {isMobile && (
            <h1 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#1a1a1a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              Categorías
            </h1>
          )}
        </div>

        {/* Derecha: botones */}
        <div style={{ display: "flex", gap: isMobile ? 6 : 10, flexShrink: 0 }}>
          {isMobile ? (
            <>
              <button onClick={() => router.push("/dishes")} title="Gestión de Platos" style={{
                background: "#f4f4f4", border: "1.5px solid #e0e0e0", borderRadius: 9,
                width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", fontSize: 18,
              }}>🍴</button>
              <button onClick={openCreateCat} title="Nueva Categoría" style={{
                background: "#1a1a1a", border: "none", borderRadius: 9,
                width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", fontSize: 18, color: "#fff",
              }}>+</button>
            </>
          ) : (
            <>
              <Btn variant="secondary" onClick={() => router.push("/dishes")}>🍴 Gestión de Platos</Btn>
              <Btn variant="primary" onClick={openCreateCat}>+ Nueva Categoría</Btn>
            </>
          )}
        </div>
      </div>

      {/* Toast */}
      {successMsg && (
        <div style={{
          position: "fixed", top: 24, right: isMobile ? 12 : 24, left: isMobile ? 12 : "auto", zIndex: 9999,
          background: "#1a1a1a", color: "#fff",
          padding: "13px 22px", borderRadius: 10, fontSize: 14, fontWeight: 600,
          boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
        }}>✓ {successMsg}</div>
      )}

      {/* Error global */}
      {error && !showCatModal && !showAssignModal && !showDishDetail && (
        <div style={{
          margin: `16px ${px} 0`, background: "#fff0ee", border: "1px solid #e85d26",
          borderRadius: 10, padding: "11px 18px", color: "#c0392b", fontSize: 13,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span>⚠️ {error}</span>
          <button onClick={() => setError("")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#c0392b" }}>✕</button>
        </div>
      )}

      {/* Stats */}
      <div style={{
        padding: `24px ${px} 0`,
        display: "flex",
        gap: isMobile ? 8 : 14,
        flexWrap: "wrap",
        overflowX: isMobile ? "auto" : "visible",
      }}>
        {[
          { label: "Total Categorías", value: categories.length, color: "#1a1a1a" },
          { label: "Activas", value: categories.filter(c => c.activo).length, color: "#27ae60" },
          { label: "Inactivas", value: categories.filter(c => !c.activo).length, color: "#e85d26" },
          { label: "Total Platos", value: dishes.length, color: "#8e44ad" },
          { label: "Sin Categoría", value: uncategorizedDishes.length, color: "#888" },
        ].map((s) => (
          <div key={s.label} style={{
            background: "#fff", border: "1.5px solid #e8e8e8",
            borderRadius: 14,
            padding: isMobile ? "12px 16px" : "16px 24px",
            minWidth: isMobile ? 100 : 130,
            flexShrink: 0,
          }}>
            <p style={{ margin: 0, fontSize: isMobile ? 10 : 11, color: "#888", marginBottom: 4 }}>{s.label}</p>
            <p style={{ margin: 0, fontSize: isMobile ? 22 : 26, fontWeight: 700, color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Lista */}
      <div style={{ padding: `24px ${px}` }}>
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
                  {/* Cabecera de categoría */}
                  <div style={{
                    padding: isMobile ? "14px 16px" : "18px 24px",
                    display: "flex",
                    flexDirection: isMobile ? "column" : "row",
                    alignItems: isMobile ? "flex-start" : "center",
                    justifyContent: "space-between",
                    gap: isMobile ? 12 : 0,
                    borderBottom: catDishes.length > 0 ? "1.5px solid #f0f0f0" : "none",
                  }}>
                    {/* Info */}
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{
                        width: 46, height: 46, borderRadius: 12, flexShrink: 0,
                        background: cat.activo ? "#fff8f5" : "#f5f5f5",
                        border: `2px solid ${cat.activo ? "#e85d26" : "#ddd"}`,
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
                      }}>🏷️</div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
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

                    {/* Botones de acción */}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <Btn variant="secondary" small onClick={() => openAssignModal(cat)}>＋ Asignar plato</Btn>
                      <Btn variant="secondary" small onClick={() => openEditCat(cat)}>✏️ Editar</Btn>
                      <Btn variant="danger" small onClick={() => { setError(""); setShowDeleteConfirm(cat._id); }}>🗑️</Btn>
                    </div>
                  </div>

                  {catDishes.length > 0 && (
                    <div style={{ padding: isMobile ? "12px 16px 16px" : "14px 24px 18px", background: "#fafafa" }}>
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: isMobile
                          ? "1fr"
                          : "repeat(auto-fill, minmax(220px, 1fr))",
                        gap: 12,
                      }}>
                        {catDishes.map((dish) => (
                          <DishCard
                            key={dish._id}
                            dish={dish}
                            onClick={() => { setSelectedDish(dish); setShowDishDetail(true); }}
                            onRemove={() => handleAssignDish(dish._id, null)}
                          />
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
                  padding: isMobile ? "14px 16px" : "18px 24px",
                  display: "flex", alignItems: "center",
                  borderBottom: "1.5px solid #f0f0f0",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{
                      width: 46, height: 46, borderRadius: 12, background: "#f5f5f5", flexShrink: 0,
                      border: "2px solid #ddd", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
                    }}>📦</div>
                    <div>
                      <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#888" }}>Sin categoría</h2>
                      <p style={{ margin: "3px 0 0", fontSize: 12, color: "#aaa" }}>
                        {uncategorizedDishes.length} plato{uncategorizedDishes.length !== 1 ? "s" : ""} sin asignar · Usa el selector para asignarlos o haz click para ver detalles
                      </p>
                    </div>
                  </div>
                </div>
                <div style={{ padding: isMobile ? "12px 16px 16px" : "14px 24px 18px", background: "#fafafa" }}>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: isMobile
                      ? "1fr"
                      : "repeat(auto-fill, minmax(220px, 1fr))",
                    gap: 12,
                  }}>
                    {uncategorizedDishes.map((dish) => (
                      <DishCard
                        key={dish._id}
                        dish={dish}
                        onClick={() => { setSelectedDish(dish); setShowDishDetail(true); }}
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
        <Modal title={catModalMode === "create" ? "Nueva Categoría" : "Editar Categoría"} onClose={closeCatModal} isMobile={isMobile}>
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

      {/* ── Modal asignar platos ── */}
      {showAssignModal && assignTargetCategory && (
        <Modal title={`Asignar platos → ${assignTargetCategory.nombre}`} onClose={() => setShowAssignModal(false)} wide isMobile={isMobile}>
          {error && <ErrorBox msg={error} />}
          <p style={{ margin: "0 0 14px", fontSize: 13, color: "#888" }}>Selecciona platos para moverlos a esta categoría.</p>
          <div style={{ maxHeight: 360, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
            {dishesNotInCategory(assignTargetCategory._id).length === 0 ? (
              <p style={{ textAlign: "center", color: "#aaa", padding: 24 }}>Todos los platos ya están en esta categoría</p>
            ) : (
              dishesNotInCategory(assignTargetCategory._id).map((dish) => (
                <div key={dish._id} style={{
                  display: "flex",
                  alignItems: isMobile ? "flex-start" : "center",
                  justifyContent: "space-between",
                  flexDirection: isMobile ? "column" : "row",
                  gap: isMobile ? 10 : 0,
                  padding: "11px 14px", borderRadius: 10, border: "1.5px solid #eee", background: "#fafafa",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {dish.image_url ? (
                      <Image
                        src={dish.image_url}
                        alt={dish.name}
                        width={40}
                        height={40}
                        style={{ borderRadius: 8, objectFit: "cover", flexShrink: 0 }}
                      />
                    ) : (
                      <div style={{ width: 40, height: 40, borderRadius: 8, background: "#eee", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>🍴</div>
                    )}
                    <div>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>{dish.name}</p>
                      <p style={{ margin: 0, fontSize: 11, color: "#aaa" }}>
                        Bs. {dish.price.toFixed(2)} · {!getCatId(dish) ? "Sin categoría" : `En: ${typeof dish.category_id === "object" && dish.category_id ? dish.category_id.nombre : "otra categoría"}`}
                      </p>
                    </div>
                  </div>
                  <div style={{ alignSelf: isMobile ? "flex-end" : "auto" }}>
                    <Btn variant="orange" small onClick={() => handleAssignDish(dish._id, assignTargetCategory._id)}>Añadir aquí</Btn>
                  </div>
                </div>
              ))
            )}
          </div>
          <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end" }}>
            <Btn variant="secondary" onClick={() => setShowAssignModal(false)}>Cerrar</Btn>
          </div>
        </Modal>
      )}

      {/* ── Modal detalle plato (solo vista) ── */}
      {showDishDetail && selectedDish && (
        <Modal title="" onClose={() => { setShowDishDetail(false); setSelectedDish(null); }} wide isMobile={isMobile}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: isMobile ? 17 : 20, fontWeight: 700, color: "#1a1a1a" }}>{selectedDish.name}</h2>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#888" }}>
                {typeof selectedDish.category_id === "object" && selectedDish.category_id
                  ? selectedDish.category_id.nombre
                  : "Sin categoría"}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {selectedDish.image_url && (
              <div style={{ position: "relative", width: "100%", height: isMobile ? 160 : 200 }}>
                <Image
                  src={selectedDish.image_url}
                  alt={selectedDish.name}
                  fill
                  sizes="(max-width: 640px) 100vw, 600px"
                  style={{ objectFit: "cover", borderRadius: 12 }}
                />
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <InfoBlock label="Precio" value={`Bs. ${selectedDish.price.toFixed(2)}`} valueColor="#e85d26" />
              <InfoBlock
                label="Estado"
                value={selectedDish.isAvailable ? "Disponible" : "No disponible"}
                valueColor={selectedDish.isAvailable ? "#27ae60" : "#999"}
              />
            </div>

            {selectedDish.description && (
              <InfoBlock label="Descripción" value={selectedDish.description} />
            )}

            {selectedDish.ingredients && selectedDish.ingredients.length > 0 && (
              <div>
                <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: "#555", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  Ingredientes
                </p>
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

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginTop: 4 }}>
              <p style={{ margin: 0, fontSize: 12, color: "#bbb" }}>
                Para editar este plato ve a{" "}
                <span
                  onClick={() => router.push("/dishes")}
                  style={{ color: "#e85d26", cursor: "pointer", fontWeight: 600 }}
                >
                  Gestión de Platos
                </span>
              </p>
              <Btn variant="ghost" onClick={() => { setShowDishDetail(false); setSelectedDish(null); }}>Cerrar</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal confirmar delete categoría ── */}
      {showDeleteConfirm && (
        <Modal title="" onClose={() => { setShowDeleteConfirm(null); setError(""); }} isMobile={isMobile}>
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

function Modal({ title, children, onClose, wide = false, isMobile = false }: {
  title: string; children: React.ReactNode; onClose: () => void; wide?: boolean; isMobile?: boolean;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: isMobile ? "flex-end" : "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: isMobile ? 0 : 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          background: "#fff",
          borderRadius: isMobile ? "18px 18px 0 0" : 18,
          padding: isMobile ? "28px 20px 32px" : "32px 36px",
          width: isMobile ? "100%" : wide ? 600 : 460,
          maxWidth: "100%",
          maxHeight: isMobile ? "92vh" : "90vh",
          overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 12,
            right: 16,
            background: "none",
            border: "none",
            fontSize: 18,
            cursor: "pointer",
            color: "#888",
          }}
        >
          ✕
        </button>

        {title && (
          <h2 style={{
            margin: "0 0 20px",
            fontSize: 19,
            fontWeight: 700,
            color: "#1a1a1a",
            paddingRight: 24,
          }}>
            {title}
          </h2>
        )}

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
    }}>
      <div onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
        {dish.image_url ? (
          <Image
            src={dish.image_url}
            alt={dish.name}
            width={42}
            height={42}
            style={{ borderRadius: 8, objectFit: "cover", flexShrink: 0 }}
          />
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
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <select value={assignValue} onChange={(e) => setAssignValue(e.target.value)} style={{
            flex: 1, minWidth: 0,
            padding: "6px 8px", borderRadius: 7,
            border: "1.5px solid #e0e0e0", fontSize: 11,
            fontFamily: "inherit", color: "#333", background: "#fff",
            overflow: "hidden", textOverflow: "ellipsis",
          }}>
            <option value="">Asignar a categoría...</option>
            {categories.map((c) => <option key={c._id} value={c._id}>{c.nombre}</option>)}
          </select>
          <button onClick={() => { if (assignValue) { onAssign(assignValue); setAssignValue(""); } }}
            disabled={!assignValue} style={{
              background: assignValue ? "#e85d26" : "#f0f0f0",
              color: assignValue ? "#fff" : "#aaa",
              border: "none", borderRadius: 7,
              padding: "6px 12px",
              fontSize: 12, fontWeight: 600,
              cursor: assignValue ? "pointer" : "not-allowed",
              flexShrink: 0,
              whiteSpace: "nowrap",
            }}>
            Asignar
          </button>
        </div>
      )}
    </div>
  );
}