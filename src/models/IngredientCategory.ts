import mongoose, { Document, Schema } from "mongoose";

export interface IIngredientCategory extends Document {
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const IngredientCategorySchema = new Schema<IIngredientCategory>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      minlength: [2, "Minimum 2 characters"],
      maxlength: [100, "Maximum 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [255, "Maximum 255 characters"],
      default: "",
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false }
);

const IngredientCategory =
  mongoose.models.IngredientCategory ||
  mongoose.model<IIngredientCategory>("IngredientCategory", IngredientCategorySchema);

export default IngredientCategory;