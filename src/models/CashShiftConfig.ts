import mongoose, { Document, Schema } from 'mongoose';

export interface ICashShiftConfig extends Document {
  restaurantId: string;
  morningStart: string;
  morningEnd: string;
  afternoonStart: string;
  afternoonEnd: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CashShiftConfigSchema = new Schema<ICashShiftConfig>(
  {
    restaurantId: { type: String, required: true, unique: true, index: true },
    morningStart: { type: String, required: true, default: '08:00' },
    morningEnd: { type: String, required: true, default: '16:00' },
    afternoonStart: { type: String, required: true, default: '16:00' },
    afternoonEnd: { type: String, required: true, default: '21:00' },
    updatedBy: { type: String, default: null },
  },
  { timestamps: true }
);

export default mongoose.models.CashShiftConfig ||
  mongoose.model<ICashShiftConfig>('CashShiftConfig', CashShiftConfigSchema);
