import { connectDB } from "./db";
import mongoose from "mongoose";

// Colección liviana solo para contar por día
const CounterSchema = new mongoose.Schema({
  _id: String,         // formato: "2025-06-04"
  seq: { type: Number, default: 0 },
});

const Counter =
  mongoose.models.DailyOrderCounter ||
  mongoose.model("DailyOrderCounter", CounterSchema);

export async function getNextDailyNumber(): Promise<number> {
  await connectDB();
  const today = new Date().toISOString().slice(0, 10); // "2025-06-04"
  const doc = await Counter.findByIdAndUpdate(
    today,
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  return doc.seq;
}