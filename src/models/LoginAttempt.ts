// src/models/LoginAttempt.ts
import mongoose, { Schema } from "mongoose";

export interface ILoginAttempt {
  ip: string;
  attempts: number;
  blockedUntil: Date | null;
  lastAttempt: Date;
}

const LoginAttemptSchema = new Schema<ILoginAttempt>({
  ip: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  attempts: {
    type: Number,
    default: 1,
  },
  blockedUntil: {
    type: Date,
    default: null,
  },
  lastAttempt: {
    type: Date,
    default: Date.now,
  },
});

// TTL index: MongoDB elimina el documento automáticamente
// 15 minutos después de lastAttempt (900 segundos)
LoginAttemptSchema.index({ lastAttempt: 1 }, { expireAfterSeconds: 900 });

const LoginAttempt =
  mongoose.models.LoginAttempt ||
  mongoose.model<ILoginAttempt>("LoginAttempt", LoginAttemptSchema);

export default LoginAttempt;