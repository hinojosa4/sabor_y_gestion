import mongoose, { Document, Schema } from "mongoose";

export interface IDish extends Document {
  name: string;
  description?: string;
  price: number;
  category_id: mongoose.Types.ObjectId | null;
  isAvailable: boolean;
  image_url?: string;
  ingredients: string[];   // ← nuevo
  createdAt: Date;
  updatedAt: Date;
}

const DishSchema = new Schema<IDish>(
  {
    name: {
      type: String,
      required: [true, "El nombre es obligatorio"],
      trim: true,
      minlength: [2, "El nombre debe tener al menos 2 caracteres"],
      maxlength: [100, "El nombre no puede superar los 100 caracteres"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [255, "La descripción no puede superar los 255 caracteres"],
      default: "",
    },
    price: {
      type: Number,
      required: [true, "El precio es obligatorio"],
      min: [0, "El precio no puede ser negativo"],
    },
    category_id: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      default: null,
      index: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    image_url: {
      type: String,
      default: "",
    },
    ingredients: {          // ← nuevo
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

const Dish = mongoose.models.Dish || mongoose.model<IDish>("Dish", DishSchema);
export default Dish;