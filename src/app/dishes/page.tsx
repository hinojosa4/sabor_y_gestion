"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ICategory {
  _id: string;
  nombre: string;
  activo: boolean;
}

interface IDishIngredient {
  ingredient_id: { _id: string; nombre: string; unidad: string } | string;
  quantity: number;
}

interface IDish {
  _id: string;
  name: string;
  description?: string;
  price: number;
  isAvailable: boolean;
  image_url?: string;
  ingredients: IDishIngredient[];
  category_id: { _id: string; nombre: string } | string | null;
}

interface IIngredientOption {
  _id: string;
  nombre: string;
  unidad: string;
  stock_actual: number;
  stockStatus: "ok" | "bajo" | "critico";
}

type DishFormData = {
  name: string;
  description: string;
  price: string;
  isAvailable: boolean;
  category_id: string;
  ingredients: { ingredient_id: string; quantity: number }[];
  image_url: string;
};

type BtnVariant = "primary" | "secondary" | "danger" | "ghost" | "orange";

// ─── Constantes fuera del componente ─────────────────────────────────────────
const API = "/api";

const EMPTY_FORM: DishFormData = {
  name: "",
  description: "",
  price: "",
  isAvailable: true,
  category_id: "",
  ingredients: [],
  image_url: "",
};

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  borderRadius: 9,
  border: "1.5px solid #e0e0e0",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
  color: "#1a1a1a",
  background: "#fff",
};

const BTN_STYLES: Record<BtnVariant, React.CSSProperties> = {
  primary:   { background: "#1a1a1a", color: "#fff", border: "none" },
  secondary: { background: "#f4f4f4", color: "#333", border: "1.5px solid #e0e0e0" },
  danger:    { background: "#fff0ee", color: "#e85d26", border: "1.5px solid #e85d26" },
  ghost:     { background: "transparent", color: "#888", border: "1.5px solid #e0e0e0" },
  orange:    { background: "#e85d26", color: "#fff", border: "none" },
};

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

// ─── Componentes base ─────────────────────────────────────────────────────────
function Btn({
  children,
  onClick,
  variant = "secondary",
  small = false,
  disabled = false,
  fullWidth = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: BtnVariant;
  small?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...BTN_STYLES[variant],
        padding: small ? "7px 16px" : "11px 22px",
        borderRadius: 9,
        fontSize: small ? 12 : 13,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        whiteSpace: "nowrap",
        fontFamily: "inherit",
        width: fullWidth ? "100%" : undefined,
        justifyContent: fullWidth ? "center" : undefined,
      }}
    >
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "#555",
          display: "block",
          marginBottom: 6,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div
      style={{
        background: "#fff0ee",
        border: "1px solid #e85d26",
        borderRadius: 8,
        padding: "10px 14px",
        color: "#c0392b",
        fontSize: 13,
        marginBottom: 14,
      }}
    >
      ⚠️ {msg}
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
  wide = false,
  isMobile = false,
}: {
  title?: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
  isMobile?: boolean;
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
          width: isMobile ? "100%" : wide ? 620 : 480,
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
          <h2
            style={{
              margin: "0 0 22px",
              fontSize: 19,
              fontWeight: 700,
              color: "#1a1a1a",
              paddingRight: 24,
            }}
          >
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>
  );
}

// ─── IngredientSelector ───────────────────────────────────────────────────────
function IngredientSelector({
  selected,
  onChange,
}: {
  selected: { ingredient_id: string; quantity: number }[];
  onChange: (items: { ingredient_id: string; quantity: number }[]) => void;
}) {
  const [options, setOptions] = useState<IIngredientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedOption, setSelectedOption] = useState<IIngredientOption | null>(null);
  const [qty, setQty] = useState("1");
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch("/api/ingredients", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setOptions(d.ok && Array.isArray(d.data) ? d.data : []);
      })
      .catch(() => setOptions([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = options.filter(
    (o) =>
      o.nombre.toLowerCase().includes(query.toLowerCase()) &&
      !selected.some((s) => {
        const id = typeof s.ingredient_id === "object"
          ? (s.ingredient_id as { _id: string })._id
          : s.ingredient_id;
        return id === o._id;
      })
  );

  const selectOption = (o: IIngredientOption) => {
    setSelectedOption(o);
    setQuery(o.nombre);
    setShowDropdown(false);
    setError("");
  };

  const handleAdd = () => {
    const cantidad = parseFloat(qty);
    if (!selectedOption) { setError("Selecciona un ingrediente de la lista"); return; }
    if (isNaN(cantidad) || cantidad <= 0) { setError("Cantidad inválida"); return; }
    if (cantidad > selectedOption.stock_actual) { setError("Cantidad supera el stock disponible"); return; }

    onChange([...selected, { ingredient_id: selectedOption._id, quantity: cantidad }]);
    setSelectedOption(null);
    setQuery("");
    setQty("1");
    setError("");
  };

  // FIX: remove correctamente cerrado como función independiente
  const remove = (id: string) => {
    onChange(
      selected.filter((s) => {
        const sid = typeof s.ingredient_id === "object"
          ? (s.ingredient_id as { _id: string })._id
          : s.ingredient_id;
        return sid !== id;
      })
    );
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
        {/* Autocomplete */}
        <div style={{ position: "relative", flex: 2, minWidth: 160 }}>
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedOption(null);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            placeholder={loading ? "Cargando..." : "Buscar ingrediente..."}
            style={INPUT_STYLE}
          />
          {showDropdown && query && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                left: 0,
                right: 0,
                background: "#fff",
                border: "1.5px solid #e0e0e0",
                borderRadius: 9,
                maxHeight: 200,
                overflowY: "auto",
                zIndex: 100,
              }}
            >
              {filtered.length === 0 ? (
                <p style={{ padding: 10, fontSize: 12 }}>Sin resultados</p>
              ) : (
                filtered.map((o) => (
                  <div
                    key={o._id}
                    onMouseDown={() => selectOption(o)}
                    style={{
                      padding: "10px",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>{o.nombre}</span>
                    <span style={{ fontSize: 11 }}>
                      {o.stock_actual} {o.unidad}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Cantidad */}
        <input
          type="number"
          value={qty}
          min="0.001"
          step="0.001"
          onChange={(e) => setQty(e.target.value)}
          style={{ ...INPUT_STYLE, width: 90 }}
        />

        {/* Botón agregar */}
        <button
          onClick={handleAdd}
          style={{
            background: "#e85d26",
            color: "#fff",
            border: "none",
            borderRadius: 9,
            padding: "0 16px",
            cursor: "pointer",
            fontWeight: 700,
            fontSize: 18,
          }}
        >
          +
        </button>
      </div>

      {/* Error feedback */}
      {error && (
        <p style={{ color: "#e85d26", fontSize: 12, marginBottom: 6 }}>{error}</p>
      )}

      {/* Lista de ingredientes seleccionados */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {selected.map((s) => {
          const opt = options.find((o) => o._id === s.ingredient_id);
          return (
            // FIX: key estable usando solo ingredient_id
            <div
              key={s.ingredient_id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: 8,
                background: "#fff8f5",
                borderRadius: 8,
              }}
            >
              <span style={{ fontSize: 13 }}>
                {opt?.nombre ?? "Ingrediente"} — {s.quantity} {opt?.unidad}
              </span>
              <button
                onClick={() => remove(s.ingredient_id)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#e85d26",
                  fontSize: 14,
                  padding: "0 4px",
                }}
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── DishForm ─────────────────────────────────────────────────────────────────
function DishForm({
  initial,
  categories,
  onSubmit,
  onCancel,
  error,
  submitLabel,
  isMobile,
}: {
  initial: DishFormData;
  categories: ICategory[];
  onSubmit: (data: DishFormData) => void;
  onCancel: () => void;
  error: string;
  submitLabel: string;
  isMobile?: boolean;
}) {
  const [form, setForm] = useState<DishFormData>(initial);
  const [uploading, setUploading] = useState(false);
  // FIX: estado de error visible al usuario para uploads fallidos
  const [uploadError, setUploadError] = useState("");

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    setUploadError("");
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
        setForm((f) => ({ ...f, image_url: data.secure_url }));
      } else {
        setUploadError("La imagen no se pudo subir. Intenta de nuevo.");
      }
    } catch {
      setUploadError("Error de red al subir la imagen. Intenta de nuevo.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {error && <ErrorBox msg={error} />}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
          gap: 12,
        }}
      >
        {/* Nombre */}
        <div style={{ gridColumn: "1 / -1" }}>
          <Field label="Nombre *">
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ej: Lomo Saltado"
              style={INPUT_STYLE}
            />
          </Field>
        </div>

        {/* Precio */}
        <Field label="Precio (Bs.) *">
          <input
            type="number"
            min={0}
            step="0.01"
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            placeholder="0.00"
            style={INPUT_STYLE}
          />
        </Field>

        {/* Categoría */}
        <Field label="Categoría (opcional)">
          <select
            value={form.category_id}
            onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
            style={INPUT_STYLE}
          >
            <option value="">Sin categoría</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </Field>

        {/* Descripción */}
        <div style={{ gridColumn: "1 / -1" }}>
          <Field label="Descripción">
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Descripción del plato..."
              rows={2}
              style={{ ...INPUT_STYLE, resize: "none" }}
            />
          </Field>
        </div>

        {/* Imagen */}
        <div style={{ gridColumn: "1 / -1" }}>
          <Field label="Imagen del plato">
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 16px",
                borderRadius: 9,
                border: "1.5px dashed #e0e0e0",
                background: "#fafafa",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#e85d26")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#e0e0e0")}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 9,
                  background: "#fff8f5",
                  border: "1.5px solid #e85d26",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                  flexShrink: 0,
                }}
              >
                📷
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#1a1a1a" }}>
                  {uploading ? "Subiendo imagen..." : "Seleccionar imagen"}
                </p>
                <p style={{ margin: "2px 0 0", fontSize: 11, color: "#aaa" }}>
                  JPG, PNG, WEBP o GIF · Máx. 5MB
                </p>
              </div>
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
                  if (!allowedTypes.includes(file.type)) {
                    alert("Solo se permiten imágenes (JPG, PNG, WEBP, GIF)");
                    e.target.value = "";
                    return;
                  }
                  if (file.size > 5 * 1024 * 1024) {
                    alert("La imagen no puede superar los 5MB");
                    e.target.value = "";
                    return;
                  }
                  handleImageUpload(file);
                }}
              />
            </label>

            {/* FIX: error de upload visible */}
            {uploadError && (
              <p style={{ color: "#e85d26", fontSize: 12, marginTop: 6 }}>⚠️ {uploadError}</p>
            )}

            {uploading && (
              <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    width: "100%",
                    height: 4,
                    background: "#f0f0f0",
                    borderRadius: 2,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      background: "#e85d26",
                      borderRadius: 2,
                      width: "60%",
                      animation: "pulse 1s ease-in-out infinite",
                    }}
                  />
                </div>
                <span style={{ fontSize: 11, color: "#888", whiteSpace: "nowrap" }}>Subiendo...</span>
              </div>
            )}

            {form.image_url && !uploading && (
              <div style={{ marginTop: 8, position: "relative" }}>
                <div style={{ position: "relative", width: "100%", height: 150 }}>
                  <Image
                    src={form.image_url}
                    alt="preview"
                    fill
                    sizes="(max-width: 640px) 100vw, 620px"
                    style={{ objectFit: "cover", borderRadius: 9 }}
                  />
                </div>
                <button
                  onClick={() => setForm((f) => ({ ...f, image_url: "" }))}
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    background: "rgba(0,0,0,0.55)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    padding: "4px 10px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  ✕ Quitar
                </button>
              </div>
            )}
          </Field>
        </div>

        {/* Ingredientes */}
        <div style={{ gridColumn: "1 / -1" }}>
          <Field label="Ingredientes">
            <IngredientSelector
              selected={form.ingredients}
              onChange={(items) => setForm((f) => ({ ...f, ingredients: items }))}
            />
          </Field>
        </div>

        {/* Disponible */}
        <div style={{ gridColumn: "1 / -1" }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
              fontSize: 14,
              color: "#333",
            }}
          >
            <input
              type="checkbox"
              checked={form.isAvailable}
              onChange={(e) => setForm((f) => ({ ...f, isAvailable: e.target.checked }))}
              style={{ width: 17, height: 17 }}
            />
            Disponible en el menú
          </label>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 10,
          marginTop: 8,
          flexDirection: isMobile ? "column-reverse" : "row",
        }}
      >
        <Btn variant="ghost" onClick={onCancel} fullWidth={isMobile}>
          Cancelar
        </Btn>
        <Btn variant="orange" onClick={() => onSubmit(form)} fullWidth={isMobile}>
          {submitLabel}
        </Btn>
      </div>
    </div>
  );
}

// ─── DishCard ─────────────────────────────────────────────────────────────────
function DishCard({
  dish,
  onEdit,
  onDelete,
}: {
  dish: IDish;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const catName = getCatName(dish);

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 16,
        border: "1.5px solid #eee",
        overflow: "hidden",
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Cabecera */}
      <div style={{ padding: "18px 20px 14px" }}>
        <h3
          style={{
            margin: "0 0 10px",
            fontSize: 16,
            fontWeight: 700,
            color: "#1a1a1a",
          }}
        >
          {dish.name}
        </h3>

        {/* Categoría */}
        <div style={{ marginBottom: 10 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "3px 10px",
              borderRadius: 20,
              background: catName === "Sin categoría" ? "#f5f5f5" : "#fff8f5",
              color: catName === "Sin categoría" ? "#999" : "#e85d26",
              border: `1px solid ${catName === "Sin categoría" ? "#e0e0e0" : "#e85d26"}`,
            }}
          >
            {catName}
          </span>
        </div>

        {/* Descripción */}
        {dish.description && (
          <p
            style={{
              margin: "0 0 12px",
              fontSize: 13,
              color: "#777",
              lineHeight: 1.5,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {dish.description}
          </p>
        )}
      </div>

      {/* Imagen */}
      {dish.image_url ? (
        <div style={{ position: "relative", width: "100%", height: 180 }}>
          <Image
            src={dish.image_url}
            alt={dish.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1200px) 50vw, 33vw"
            style={{ objectFit: "cover" }}
          />
        </div>
      ) : (
        <div
          style={{
            width: "100%",
            height: 100,
            background: "#f5f5f5",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 32,
            color: "#ddd",
          }}
        >
          🍴
        </div>
      )}

      {/* Precio + Estado */}
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
            <p
              style={{
                margin: 0,
                fontSize: 14,
                fontWeight: 600,
                color: dish.isAvailable ? "#27ae60" : "#999",
              }}
            >
              {dish.isAvailable ? "Disponible" : "No disponible"}
            </p>
          </div>
        </div>

        {/* Ingredientes */}
        {dish.ingredients && dish.ingredients.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <p style={{ margin: "0 0 6px", fontSize: 11, color: "#aaa" }}>Ingredientes:</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {dish.ingredients.map((ing, i) => {
                const nombre =
                  typeof ing.ingredient_id === "object"
                    ? ing.ingredient_id.nombre
                    : ing.ingredient_id;
                const unidad =
                  typeof ing.ingredient_id === "object" ? ing.ingredient_id.unidad : "";
                return (
                  <span
                    key={i}
                    style={{
                      background: "#f5f5f5",
                      color: "#555",
                      borderRadius: 20,
                      padding: "2px 8px",
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {nombre} · {ing.quantity}
                    {unidad}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Botones */}
      <div
        style={{
          padding: "12px 20px 16px",
          display: "flex",
          gap: 10,
          alignItems: "center",
          borderTop: "1.5px solid #f5f5f5",
          marginTop: "auto",
        }}
      >
        <button
          onClick={onEdit}
          style={{
            flex: 1,
            padding: "10px",
            borderRadius: 9,
            border: "1.5px solid #e0e0e0",
            background: "#fff",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            color: "#333",
            fontFamily: "inherit",
          }}
        >
          ✏️ Editar
        </button>
        <button
          onClick={onDelete}
          style={{
            width: 40,
            height: 40,
            borderRadius: 9,
            border: "1.5px solid #e85d26",
            background: "#fff0ee",
            fontSize: 16,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#e85d26",
            flexShrink: 0,
          }}
        >
          🗑️
        </button>
      </div>
    </div>
  );
}

// ─── Page principal ───────────────────────────────────────────────────────────
export default function DishesPage() {
  const router = useRouter();
  const isMobile = useIsMobile();

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

  // FIX: useCallback para evitar re-renders innecesarios
  const fetchData = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  // ── filtros ────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return dishes.filter((d) => {
      const matchSearch =
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        (d.description || "").toLowerCase().includes(search.toLowerCase());
      const matchCat =
        filterCat === "all"
          ? true
          : filterCat === "none"
          ? !getCatId(d)
          : getCatId(d) === filterCat;
      return matchSearch && matchCat;
    });
  }, [dishes, search, filterCat]);

  // ── CRUD ───────────────────────────────────────────────────────────────────
  const handleCreate = async (form: DishFormData) => {
    if (!form.name.trim()) { setFormError("El nombre es obligatorio"); return; }
    if (!form.price || Number(form.price) < 0) { setFormError("El precio es obligatorio"); return; }
    setFormError("");
    try {
      const res = await fetch(`${API}/dishes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim(),
          price: Number(form.price),
          isAvailable: form.isAvailable,
          category_id: form.category_id || null,
          ingredients: form.ingredients,
          image_url: form.image_url || "",
        }),
      });
      const data = await res.json();
      if (!data.ok) { setFormError(data.message); return; }
      showSuccess("Plato creado correctamente");
      setShowCreateModal(false);
      fetchData();
    } catch {
      setFormError("Error al crear el plato");
    }
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
          name: form.name.trim(),
          description: form.description.trim(),
          price: Number(form.price),
          isAvailable: form.isAvailable,
          category_id: form.category_id || null,
          ingredients: form.ingredients,
          image_url: form.image_url || "",
        }),
      });
      const data = await res.json();
      if (!data.ok) { setFormError(data.message); return; }
      showSuccess("Plato actualizado correctamente");
      setEditDish(null);
      fetchData();
    } catch {
      setFormError("Error al actualizar");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`${API}/dishes/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) { setError(data.message); setDeleteDishId(null); return; }
      showSuccess("Plato eliminado");
      setDeleteDishId(null);
      fetchData();
    } catch {
      setError("Error al eliminar");
    }
  };

  // ── stats ──────────────────────────────────────────────────────────────────
  const totalAvailable = dishes.filter((d) => d.isAvailable).length;
  const avgPrice =
    dishes.length > 0
      ? dishes.reduce((s, d) => s + d.price, 0) / dishes.length
      : 0;
  const uncategorized = dishes.filter((d) => !getCatId(d)).length;

  const stats: { label: string; value: string | number; color: string; isText?: boolean }[] = [
    { label: "Total Platos",    value: dishes.length,                  color: "#1a1a1a" },
    { label: "Disponibles",     value: totalAvailable,                 color: "#27ae60" },
    { label: "No disponibles",  value: dishes.length - totalAvailable, color: "#e85d26" },
    { label: "Sin categoría",   value: uncategorized,                  color: "#888" },
    { label: "Precio promedio", value: `Bs. ${avgPrice.toFixed(2)}`,   color: "#8e44ad", isText: true },
  ];

  const filterTabs = [
    { id: "all",  label: "Todos" },
    { id: "none", label: "Sin categoría" },
    ...categories.map((c) => ({ id: c._id, label: c.nombre })),
  ];

  const px = isMobile ? "16px" : "40px";

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#f8f7f4", fontFamily: "'Georgia', serif" }}>

      {/* Header */}
      <div
        style={{
          background: "#fff",
          borderBottom: "2px solid #1a1a1a",
          padding: isMobile ? "14px 16px" : "18px 40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 10 : 14, minWidth: 0 }}>
          <button
            onClick={() => router.push("/dashboard")}
            style={{
              background: "#f4f4f4",
              border: "1.5px solid #e0e0e0",
              borderRadius: 9,
              width: 38,
              height: 38,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: 16,
            }}
          >
            ←
          </button>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: "#e85d26",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: isMobile ? 18 : 22,
            }}
          >
            🍴
          </div>
          {isMobile ? (
            <h1
              style={{
                margin: 0,
                fontSize: 15,
                fontWeight: 700,
                color: "#1a1a1a",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              Gestión de Platos
            </h1>
          ) : (
            <div>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#1a1a1a" }}>
                Gestión de Platos
              </h1>
              <p style={{ margin: 0, fontSize: 12, color: "#888" }}>
                Administra los platos y precios del menú
              </p>
            </div>
          )}
        </div>

        {isMobile ? (
          <button
            onClick={() => { setFormError(""); setShowCreateModal(true); }}
            style={{
              background: "#1a1a1a",
              border: "none",
              borderRadius: 9,
              width: 38,
              height: 38,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: 18,
              color: "#fff",
            }}
          >
            +
          </button>
        ) : (
          <Btn
            variant="primary"
            onClick={() => { setFormError(""); setShowCreateModal(true); }}
          >
            + Agregar Plato
          </Btn>
        )}
      </div>

      {/* Toast */}
      {successMsg && (
        <div
          style={{
            position: "fixed",
            top: 24,
            right: isMobile ? 12 : 24,
            left: isMobile ? 12 : "auto",
            zIndex: 9999,
            background: "#1a1a1a",
            color: "#fff",
            padding: "13px 22px",
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 600,
            boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
          }}
        >
          ✓ {successMsg}
        </div>
      )}

      {/* Error global */}
      {error && (
        <div
          style={{
            margin: `16px ${px} 0`,
            background: "#fff0ee",
            border: "1px solid #e85d26",
            borderRadius: 10,
            padding: "11px 18px",
            color: "#c0392b",
            fontSize: 13,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>⚠️ {error}</span>
          <button
            onClick={() => setError("")}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#c0392b",
              fontSize: 16,
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Stats */}
      <div
        style={{
          padding: `24px ${px} 0`,
          display: "flex",
          gap: isMobile ? 8 : 14,
          flexWrap: isMobile ? "nowrap" : "wrap",
          overflowX: isMobile ? "auto" : "visible",
          paddingBottom: isMobile ? 4 : 0,
        }}
      >
        {stats.map((s) => (
          <div
            key={s.label}
            style={{
              background: "#fff",
              border: "1.5px solid #e8e8e8",
              borderRadius: 14,
              padding: isMobile ? "12px 16px" : "16px 24px",
              minWidth: isMobile ? 100 : 130,
              flexShrink: 0,
            }}
          >
            <p style={{ margin: 0, fontSize: isMobile ? 10 : 11, color: "#888", marginBottom: 4 }}>
              {s.label}
            </p>
            <p
              style={{
                margin: 0,
                fontSize: s.isText
                  ? isMobile ? 14 : 18
                  : isMobile ? 22 : 26,
                fontWeight: 700,
                color: s.color,
              }}
            >
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Búsqueda y filtros */}
      <div
        style={{
          padding: `20px ${px} 0`,
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          gap: isMobile ? 10 : 14,
          alignItems: isMobile ? "stretch" : "center",
          flexWrap: "wrap",
        }}
      >
        <div style={{ position: "relative", flex: 1, minWidth: isMobile ? "auto" : 240 }}>
          <span
            style={{
              position: "absolute",
              left: 14,
              top: "50%",
              transform: "translateY(-50%)",
              color: "#aaa",
              fontSize: 16,
            }}
          >
            🔍
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar platos..."
            style={{ ...INPUT_STYLE, paddingLeft: 40, borderRadius: 30 }}
          />
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: isMobile ? "nowrap" : "wrap",
            overflowX: isMobile ? "auto" : "visible",
            paddingBottom: isMobile ? 4 : 0,
          }}
        >
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterCat(tab.id)}
              style={{
                padding: "8px 18px",
                borderRadius: 30,
                border: "1.5px solid",
                borderColor: filterCat === tab.id ? "#1a1a1a" : "#e0e0e0",
                background: filterCat === tab.id ? "#1a1a1a" : "#fff",
                color: filterCat === tab.id ? "#fff" : "#555",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                flexShrink: 0,
                whiteSpace: "nowrap",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de platos */}
      <div style={{ padding: `20px ${px} 40px` }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "#888" }}>
            Cargando platos...
          </div>
        ) : filtered.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: 60,
              background: "#fff",
              borderRadius: 16,
              border: "2px dashed #ddd",
            }}
          >
            <p style={{ fontSize: 36, margin: 0 }}>🍴</p>
            <p style={{ color: "#888", fontSize: 15, marginTop: 10 }}>
              {dishes.length === 0
                ? "No hay platos aún"
                : "Sin resultados para tu búsqueda"}
            </p>
            {dishes.length === 0 && (
              <div style={{ marginTop: 14 }}>
                <Btn variant="orange" onClick={() => setShowCreateModal(true)}>
                  Agregar primer plato
                </Btn>
              </div>
            )}
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "1fr"
                : "repeat(auto-fill, minmax(340px, 1fr))",
              gap: isMobile ? 14 : 20,
            }}
          >
            {filtered.map((dish) => (
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

      {/* Modal crear — FIX: key para resetear form al abrir */}
      {showCreateModal && (
        <Modal
          key="create-modal"
          title="Nuevo Plato"
          onClose={() => { setShowCreateModal(false); setFormError(""); }}
          wide
          isMobile={isMobile}
        >
          <DishForm
            initial={EMPTY_FORM}
            categories={categories}
            onSubmit={handleCreate}
            onCancel={() => { setShowCreateModal(false); setFormError(""); }}
            error={formError}
            submitLabel="Crear Plato"
            isMobile={isMobile}
          />
        </Modal>
      )}

      {/* Modal editar — FIX: key={editDish._id} para resetear form al cambiar plato */}
      {editDish && (
        <Modal
          key={`edit-modal-${editDish._id}`}
          title="Editar Plato"
          onClose={() => { setEditDish(null); setFormError(""); }}
          wide
          isMobile={isMobile}
        >
          <DishForm
            initial={{
              name: editDish.name,
              description: editDish.description || "",
              price: String(editDish.price),
              isAvailable: editDish.isAvailable,
              category_id: getCatId(editDish) || "",
              ingredients: (editDish.ingredients ?? []).map((ing) => ({
                ingredient_id:
                  typeof ing.ingredient_id === "object"
                    ? (ing.ingredient_id as { _id: string })._id
                    : ing.ingredient_id,
                quantity: ing.quantity,
              })),
              image_url: editDish.image_url || "",
            }}
            categories={categories}
            onSubmit={handleEdit}
            onCancel={() => { setEditDish(null); setFormError(""); }}
            error={formError}
            submitLabel="Guardar Cambios"
            isMobile={isMobile}
          />
        </Modal>
      )}

      {/* Modal confirmar delete */}
      {deleteDishId && (
        <Modal onClose={() => setDeleteDishId(null)} isMobile={isMobile}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🗑️</div>
            <h2
              style={{
                margin: "0 0 8px",
                fontSize: 19,
                fontWeight: 700,
                color: "#1a1a1a",
              }}
            >
              ¿Eliminar plato?
            </h2>
            <p style={{ color: "#888", fontSize: 13, margin: 0 }}>
              Esta acción no se puede deshacer.
            </p>
            <div
              style={{
                display: "flex",
                gap: 10,
                marginTop: 22,
                justifyContent: "center",
                flexDirection: isMobile ? "column-reverse" : "row",
              }}
            >
              <Btn variant="ghost" onClick={() => setDeleteDishId(null)} fullWidth={isMobile}>
                Cancelar
              </Btn>
              <Btn
                variant="danger"
                onClick={() => handleDelete(deleteDishId)}
                fullWidth={isMobile}
              >
                Sí, eliminar
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}