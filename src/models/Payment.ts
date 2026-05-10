// models/Payment.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IPayment extends Document {
  order_id: string;
  amount: number;
  method: 'cash' | 'card' | 'qr';
  status: 'pending' | 'completed';
  timestamp: Date;
}

const PaymentSchema = new Schema<IPayment>({
  order_id: { type: String, required: true },
  amount: { type: Number, required: true },
  method: { type: String, enum: ['cash', 'card', 'qr'], required: true },
  status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
  timestamp: { type: Date, default: Date.now },
});

export default mongoose.models.Payment || mongoose.model<IPayment>('Payment', PaymentSchema);