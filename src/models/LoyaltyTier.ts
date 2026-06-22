import mongoose, { Document, Schema } from "mongoose";

export interface ILoyaltyTier extends Document {
  name: string;
  slug: string;
  minOrders: number;
  minSpent: number;
  discountPercent: number;
  benefits: string[];
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LoyaltyTierSchema = new Schema<ILoyaltyTier>(
  {
    name: {
      type: String,
      required: [true, "El nombre es obligatorio"],
      trim: true,
      unique: true,
      minlength: [2, "El nombre debe tener al menos 2 caracteres"],
      maxlength: [80, "El nombre no puede superar los 80 caracteres"],
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      lowercase: true,
      maxlength: 80,
    },
    minOrders: {
      type: Number,
      default: 0,
      min: 0,
    },
    minSpent: {
      type: Number,
      default: 0,
      min: 0,
    },
    discountPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    benefits: {
      type: [String],
      default: [],
    },
    sortOrder: {
      type: Number,
      default: 0,
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

const LoyaltyTier =
  mongoose.models.LoyaltyTier ||
  mongoose.model<ILoyaltyTier>("LoyaltyTier", LoyaltyTierSchema);

export default LoyaltyTier;
