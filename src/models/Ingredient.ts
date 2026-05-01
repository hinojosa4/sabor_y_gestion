import mongoose, { Document, Schema } from "mongoose";

export type UnitOfMeasure = "kg" | "lt" | "unidad" | "gr" | "ml";
export type StockStatus = "ok" | "bajo" | "critico";

export interface IIngredient extends Document {
  nombre: string;
  stock_actual: number;
  stock_minimo: number;
  stock_maximo: number;
  unidad: UnitOfMeasure;
  proveedor?: string;
  category_id?: mongoose.Types.ObjectId;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
  // virtual
  stockStatus: StockStatus;
}

const IngredientSchema = new Schema<IIngredient>(
  {
    nombre: {
      type: String,
      required: [true, "El nombre es obligatorio"],
      trim: true,
      unique: true,
      minlength: [2, "Mínimo 2 caracteres"],
      maxlength: [100, "Máximo 100 caracteres"],
    },
    stock_actual: {
      type: Number,
      required: true,
      min: [0, "El stock no puede ser negativo"],
      default: 0,
    },
    stock_minimo: {
      type: Number,
      required: true,
      min: [0, "El stock mínimo no puede ser negativo"],
    },
    stock_maximo: {
      type: Number,
      required: true,
    },
    unidad: {
      type: String,
      enum: ["kg", "lt", "unidad", "gr", "ml"],
      required: true,
    },
    proveedor: {
      type: String,
      trim: true,
      default: "",
    },
    category_id: {
      type: Schema.Types.ObjectId,
      ref: "IngredientCategory",
      default: null,
    },
    activo: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true, versionKey: false }
);

// Virtual para calcular estado sin guardar en BD
IngredientSchema.virtual("stockStatus").get(function (): StockStatus {
  if (this.stock_actual <= 0) return "critico";
  if (this.stock_actual <= this.stock_minimo) return "bajo";
  return "ok";
});

IngredientSchema.set("toJSON", { virtuals: true });
IngredientSchema.set("toObject", { virtuals: true });

const Ingredient =
  mongoose.models.Ingredient ||
  mongoose.model<IIngredient>("Ingredient", IngredientSchema);

export default Ingredient;