import mongoose, { Document, Schema } from "mongoose";

export interface IIngredientCategory extends Document {
  nombre: string;
  descripcion?: string;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const IngredientCategorySchema = new Schema<IIngredientCategory>(
  {
    nombre: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      minlength: [2, "Mínimo 2 caracteres"],
      maxlength: [100, "Máximo 100 caracteres"],
    },
    descripcion: {
      type: String,
      trim: true,
      maxlength: [255, "Máximo 255 caracteres"],
      default: "",
    },
    activo: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false }
);

const IngredientCategory =
  mongoose.models.IngredientCategory ||
  mongoose.model<IIngredientCategory>("IngredientCategory", IngredientCategorySchema);

export default IngredientCategory;