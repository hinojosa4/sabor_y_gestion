import mongoose, { Document, Schema } from "mongoose";

export interface ICategory extends Document {
  nombre: string;
  descripcion?: string;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    nombre: {
      type: String,
      required: [true, "El nombre es obligatorio"],
      trim: true,
      minlength: [2, "El nombre debe tener al menos 2 caracteres"],
      maxlength: [100, "El nombre no puede superar los 100 caracteres"],
      unique: true,
    },
    descripcion: {
      type: String,
      trim: true,
      maxlength: [255, "La descripción no puede superar los 255 caracteres"],
      default: "",
    },
    activo: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false, //  esto elimina __v
  }
);

const Category =
  mongoose.models.Category ||
  mongoose.model<ICategory>("Category", CategorySchema);

export default Category;