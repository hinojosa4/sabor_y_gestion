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
  ingredients: IDishIngredient[];
  createdAt: Date;
  updatedAt: Date;
}

const DishIngredientSchema = new Schema<IDishIngredient>(
  {
    ingredient_id: {
      type: Schema.Types.ObjectId,
      ref: "Ingredient",
      required: [true, "El ingrediente es obligatorio"],
    },
    quantity: {
      type: Number,
      required: [true, "La cantidad es obligatoria"],
      min: [0.001, "La cantidad debe ser mayor a 0"],
    },
  },
  { _id: false }
);

const DishSchema = new Schema<IDish>(
  {
    name: {
      type: String,
      required: [true, "El nombre es obligatorio"],
      trim: true,
      unique: true,
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
      min: [0.01, "El precio debe ser mayor a 0"], // ← era 0, ahora evita precio gratis
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
      trim: true,
      default: "",
      maxlength: [500, "La URL de imagen no puede superar los 500 caracteres"], // ← nuevo
    },
    ingredients: {
      type: [DishIngredientSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);
// Validación de ingredientes duplicados
DishSchema.path("ingredients").validate(function (
  ingredients: IDishIngredient[]
) {
  const ids = ingredients.map((i) => i.ingredient_id.toString());
  return ids.length === new Set(ids).size;
}, "No se puede repetir el mismo ingrediente en un plato");

// Índice de texto para búsquedas por nombre o descripción
DishSchema.index({ name: "text", description: "text" });

// Virtual: precio formateado (útil para respuestas de API)
DishSchema.virtual("formattedPrice").get(function (this: IDish): string {
  return `$${this.price.toFixed(2)}`;
});

DishSchema.set("toJSON", { virtuals: true });
DishSchema.set("toObject", { virtuals: true });

const Dish = mongoose.models.Dish || mongoose.model<IDish>("Dish", DishSchema);
export default Dish;