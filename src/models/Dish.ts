import mongoose, { Document, Schema } from "mongoose";

export interface IDishIngredient {
  ingredient_id: mongoose.Types.ObjectId;
  quantity: number;
}
export interface IDish extends Document {
  name: string;
  description?: string;
  price: number;
  category_id: mongoose.Types.ObjectId | null;
  isAvailable: boolean;
  image_url?: string;
  ingredients: IDishIngredient[];   // ← nuevo
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
    ingredients: {         
      type: [
        {
          ingredient_id: {
            type: Schema.Types.ObjectId,
            ref: "Ingredient",
            required: true,
          },
          quantity: {
            type: Number,
            required: true,
            min: [0.001, "La cantidad debe ser mayor a 0"],
          },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

const Dish = mongoose.models.Dish || mongoose.model<IDish>("Dish", DishSchema);
export default Dish;