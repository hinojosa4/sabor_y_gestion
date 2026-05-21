import mongoose, { Document, Schema } from "mongoose";
 
export type UnitOfMeasure = "kg" | "lt" | "unit" | "gr" | "ml";
export type StockStatus = "ok" | "low" | "critical";
 
export interface IIngredient extends Document {
  name: string;
  currentStock: number;
  minStock: number;       // 🔴 Crítico: no alcanza para el servicio
  warningStock: number;   // 🟡 Bajo: hay que comprar pronto
  reorderPoint: number;   // 📋 Referencia de gestión: cuándo llamar al proveedor
  maxStock: number;       // 📦 Capacidad máxima del almacén
  unit: UnitOfMeasure;
  supplier?: string;
  category_id?: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  stockStatus: StockStatus;
}
 
type IngredientDocType = mongoose.HydratedDocument<IIngredient>;
 
const IngredientSchema = new Schema<IIngredient>(
  {
    name: {
      type: String,
      required: [true, "El nombre es obligatorio"],
      trim: true,
      unique: true,
      minlength: [2, "El nombre debe tener al menos 2 caracteres"],
      maxlength: [100, "El nombre no puede superar los 100 caracteres"],
    },
    currentStock: {
      type: Number,
      required: [true, "El stock actual es obligatorio"],
      default: 0,
      // ← sin min
    },
    // 🔴 Si el stock llega aquí, el restaurante no puede operar con normalidad
    minStock: {
      type: Number,
      required: [true, "El stock mínimo (crítico) es obligatorio"],
      min: [0, "El stock mínimo no puede ser negativo"],
    },
    // 🟡 Zona de advertencia: hay que comprar antes de quedarse sin stock
    warningStock: {
      type: Number,
      required: [true, "El stock de advertencia es obligatorio"],
      min: [0, "El stock de advertencia no puede ser negativo"],
    },
    // 📋 Solo gestión: cuándo contactar al proveedor (no afecta badge de color)
    reorderPoint: {
      type: Number,
      required: [true, "El punto de reorden es obligatorio"],
      min: [0, "El punto de reorden no puede ser negativo"],
    },
    // 📦 Capacidad máxima del almacén/frigorífico
    maxStock: {
      type: Number,
      required: [true, "El stock máximo es obligatorio"],
      min: [0, "El stock máximo no puede ser negativo"],
    },
    unit: {
      type: String,
      enum: {
        values: ["kg", "lt", "unit", "gr", "ml"],
        message: '"{VALUE}" no es una unidad de medida válida',
      },
      required: [true, "La unidad de medida es obligatoria"],
    },
    supplier: {
      type: String,
      trim: true,
      default: "",
      maxlength: [150, "El proveedor no puede superar los 150 caracteres"],
    },
    category_id: {
      type: Schema.Types.ObjectId,
      ref: "IngredientCategory",
      default: null,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);
 
// ── Validaciones de jerarquía ──────────────────────────────────────────────────
// Orden obligatorio: minStock < warningStock < reorderPoint < maxStock
 
IngredientSchema.path("warningStock").validate(function (
  this: IngredientDocType,
  value: number
) {
  return value > this.minStock;
}, "El stock de advertencia (🟡) debe ser mayor al stock mínimo (🔴)");
 
IngredientSchema.path("reorderPoint").validate(function (
  this: IngredientDocType,
  value: number
) {
  return value > this.warningStock;
}, "El punto de reorden debe ser mayor al stock de advertencia (🟡)");
 
IngredientSchema.path("maxStock").validate(function (
  this: IngredientDocType,
  value: number
) {
  return value > this.reorderPoint;
}, "El stock máximo debe ser mayor al punto de reorden");
 
/**
 * Virtual stockStatus — lógica de restaurante real
 *
 * Ejemplo con pollo (kg):
 *   maxStock:     50  → capacidad del frigorífico
 *   reorderPoint: 15  → llamar al proveedor (gestión, no afecta badge)
 *   warningStock:  8  → 🟡 BAJO — hay que comprar pronto
 *   minStock:      2  → 🔴 CRÍTICO — no alcanza para el servicio
 *
 *   currentStock = 20 → ok       ✅ (sobre warningStock)
 *   currentStock =  6 → low      🟡 (entre minStock y warningStock)
 *   currentStock =  2 → critical 🔴 (en el límite o por debajo)
 */
IngredientSchema.virtual("stockStatus").get(function (
  this: IngredientDocType
): StockStatus {
  if (this.currentStock <= this.minStock) return "critical";
  if (this.currentStock <= this.warningStock) return "low";
  return "ok";
});
 
IngredientSchema.index({ name: "text", supplier: "text" });
IngredientSchema.set("toJSON", { virtuals: true });
IngredientSchema.set("toObject", { virtuals: true });
 
const Ingredient =
  (mongoose.models.Ingredient as mongoose.Model<IIngredient>) ||
  mongoose.model<IIngredient>("Ingredient", IngredientSchema);
 
export default Ingredient;