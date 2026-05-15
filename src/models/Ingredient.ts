import mongoose, { Document, Schema } from "mongoose";

export type UnitOfMeasure = "kg" | "lt" | "unit" | "gr" | "ml";
export type StockStatus = "ok" | "low" | "critical";

export interface IIngredient extends Document {
  name: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
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
      min: [0, "El stock no puede ser negativo"],
      default: 0,
    },
    minStock: {
      type: Number,
      required: [true, "El stock mínimo es obligatorio"],
      min: [0, "El stock mínimo no puede ser negativo"],
    },
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

// Validación maxStock > minStock separada del schema para evitar problemas de tipado
IngredientSchema.path("maxStock").validate(function (this: IngredientDocType, value: number) {
  return value > this.minStock;
}, "El stock máximo debe ser mayor al stock mínimo");

IngredientSchema.virtual("stockStatus").get(function (this: IngredientDocType): StockStatus {
  if (this.currentStock <= 0) return "critical";
  if (this.currentStock <= this.minStock) return "low";
  return "ok";
});

IngredientSchema.index({ name: "text", supplier: "text" });

IngredientSchema.set("toJSON", { virtuals: true });
IngredientSchema.set("toObject", { virtuals: true });

const Ingredient =
  (mongoose.models.Ingredient as mongoose.Model<IIngredient>) ||
  mongoose.model<IIngredient>("Ingredient", IngredientSchema);

export default Ingredient;