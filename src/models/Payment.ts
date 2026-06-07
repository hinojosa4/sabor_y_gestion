// models/Payment.ts
import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IPayment extends Document {
  order_id: string;
  amount: number;
  subtotal?: number;
  discount_percent?: number;
  discount_amount?: number;
  loyalty_tier_name?: string | null;
  method: 'cash' | 'card' | 'qr';
  status: 'pending' | 'completed';
  shiftName?: string;
  shiftDate?: string;
  shiftStart?: Date;
  shiftEnd?: Date;
  customer_id?: Types.ObjectId | null;
  customer_email?: string;
  timestamp: Date;
}

const PaymentSchema = new Schema<IPayment>({
  order_id: { type: String, required: true },
  amount: { type: Number, required: true },
  subtotal: { type: Number, default: 0 },
  discount_percent: { type: Number, default: 0, min: 0, max: 100 },
  discount_amount: { type: Number, default: 0, min: 0 },
  loyalty_tier_name: { type: String, trim: true, default: null },
  method: { type: String, enum: ['cash', 'card', 'qr'], required: true },
  status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
  shiftName: { type: String, default: null, index: true },
  shiftDate: { type: String, default: null, index: true },
  shiftStart: { type: Date, default: null },
  shiftEnd: { type: Date, default: null },
  customer_id: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  customer_email: { type: String, trim: true, default: null },
  timestamp: { type: Date, default: Date.now },
});

export default mongoose.models.Payment || mongoose.model<IPayment>('Payment', PaymentSchema);
