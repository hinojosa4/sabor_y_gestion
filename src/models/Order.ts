import mongoose, { Document, Schema } from 'mongoose';

export interface IOrder extends Document {
  restaurantId: string;
  table_id?: string;
  customer_id?: string;
  mesero_id: string;
  driver_id?: string;
  service_type: 'dine_in' | 'delivery' | 'pick_up';
  status: 'pending' | 'in_kitchen' | 'ready' | 'picked_up' | 'in_transit' | 'delivered' | 'paid' | 'cancelled';
  total_amount: number;
  payment_method?: string;
  createdAt: Date;
  updatedAt: Date;
  user_id: Schema.Types.ObjectId;
  delivery_address: string;
  delivery_coords: { lat: number | null; lng: number | null };
  delivery_phone: string;
  notes: string;
}

const OrderSchema = new Schema<IOrder>({
  restaurantId: { type: String, required: true },
  table_id:     { type: String },
  customer_id:  { type: String },
  mesero_id:    { type: String, required: true },
  driver_id:    { type: String },
  service_type: {
    type: String,
    enum: ['dine_in', 'delivery', 'pick_up'],
    default: 'dine_in',
  },
  status: {
    type: String,
    enum: ['pending', 'in_kitchen', 'ready', 'picked_up', 'in_transit', 'delivered', 'paid', 'cancelled'],
    default: 'pending',
  },
  total_amount: { type: Number, default: 0 },
  // ── Nuevo campo ──────────────────────────────────────────────────────────────
  payment_method: {
    type: String,
    enum: ['Efectivo', 'Tarjeta de Débito', 'Tarjeta de Crédito', 'QR / Transferencia'],
    default: 'Efectivo',
  },
  user_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true,
  },
  delivery_address: { type: String, trim: true, default: null },
  delivery_coords: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
  },
  delivery_phone: { type: String, trim: true, default: null },
  notes:          { type: String, trim: true, maxlength: 500, default: null },
}, { timestamps: true });

export default mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);