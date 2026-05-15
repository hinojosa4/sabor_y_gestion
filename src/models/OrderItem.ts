import mongoose, { Document, Schema } from 'mongoose';

export interface IOrderItem extends Document {
  order_id: mongoose.Types.ObjectId;
  dish_id: mongoose.Types.ObjectId; // ← cambio
  quantity: number;
  unit_price: number;
  subtotal: number;
  status: 'pending' | 'in_kitchen' | 'ready' | 'served' | 'cancelled';
  notes?: string;
  chef_id?: string;
  prepared_at?: Date;
  served_at?: Date;
  created_at: Date;
  updated_at: Date;
}

const OrderItemSchema = new Schema<IOrderItem>({
  order_id: { type: Schema.Types.ObjectId, ref: 'Order', required: true },

  // cambio clave
  dish_id: { type: Schema.Types.ObjectId, ref: 'Dish', required: true },

  quantity: { type: Number, default: 1 },
  unit_price: { type: Number, required: true },
  subtotal: { type: Number, required: true },

  status: { 
    type: String, 
    enum: ['pending', 'in_kitchen', 'ready', 'served', 'cancelled'], 
    default: 'pending' 
  },

  notes: { type: String },
  chef_id: { type: String },
  prepared_at: { type: Date },
  served_at: { type: Date },

}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'order_item' 
});

export default mongoose.models.OrderItem || mongoose.model<IOrderItem>('OrderItem', OrderItemSchema);