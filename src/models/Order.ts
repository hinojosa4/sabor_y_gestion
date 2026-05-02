import mongoose, { Document, Schema } from 'mongoose';

export interface IOrder extends Document {
  restaurantId: string;
  table_id?: string;
  customer_id?: string;
  mesero_id: string;
  driver_id?: string;
  service_type: 'dine_in' | 'delivery' | 'pick_up';
  status: 'pending' | 'in_kitchen' | 'ready' | 'delivered' | 'paid' | 'cancelled';
  total_amount: number;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>({
  restaurantId: { type: String, required: true },
  table_id: { type: String },
  customer_id: { type: String },
  mesero_id: { type: String, required: true },
  driver_id: { type: String },
  service_type: { type: String, enum: ['dine_in', 'delivery', 'pick_up'], default: 'dine_in' },
  status: { type: String, enum: ['pending', 'in_kitchen', 'ready', 'delivered', 'paid', 'cancelled'], default: 'pending' },
  total_amount: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);