import mongoose, { Document, Schema } from 'mongoose';

export interface ICashClose extends Document {
  restaurantId: string;
  openingDate: Date;
  closingDate: Date;
  shiftName: string;
  shiftDate: string;
  shiftStart: Date;
  shiftEnd: Date;
  openingBalance: number;
  closingBalance: number;
  salesTotal: number;
  cashTotal: number;
  qrTotal: number;
  tablesServed: number;
  ordersCount: number;
  closedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const CashCloseSchema = new Schema<ICashClose>({
  restaurantId: { type: String, required: true },
  openingDate: { type: Date, required: true },
  closingDate: { type: Date, default: Date.now },
  shiftName: { type: String, required: true, index: true },
  shiftDate: { type: String, required: true, index: true },
  shiftStart: { type: Date, required: true },
  shiftEnd: { type: Date, required: true },
  openingBalance: { type: Number, default: 0 },
  closingBalance: { type: Number, default: 0 },
  salesTotal: { type: Number, default: 0 },
  cashTotal: { type: Number, default: 0 },
  qrTotal: { type: Number, default: 0 },
  tablesServed: { type: Number, default: 0 },
  ordersCount: { type: Number, default: 0 },
  closedBy: { type: String, required: true },
}, { timestamps: true });

export default mongoose.models.CashClose || mongoose.model<ICashClose>('CashClose', CashCloseSchema);
