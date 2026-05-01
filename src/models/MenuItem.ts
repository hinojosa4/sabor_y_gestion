import mongoose, { Document, Schema } from 'mongoose';

export interface IMenuItem extends Document {
  restaurantId: string;
  name: string;
  description?: string;
  price: number;
  category_id: string;
  isAvailable: boolean;
  image_url?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MenuItemSchema = new Schema<IMenuItem>({
  restaurantId: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  category_id: { type: String, required: true },
  isAvailable: { type: Boolean, default: true },
  image_url: { type: String },
}, { 
  timestamps: true,
  collection: 'menu_items' 
});

export default mongoose.models.MenuItem || mongoose.model<IMenuItem>('MenuItem', MenuItemSchema);