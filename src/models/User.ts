import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";

// Sincronizamos los nombres con el formulario
export interface IUser extends Document {
  restaurantId: mongoose.Types.ObjectId;
  name: string;      // Cambiado de 'nombre'
  email: string;
  password: string;  // Este se usará para el hash
  role: string;      // Cambiado de 'rol'
  isActive: boolean; // Cambiado de 'activo'
  employmentDetails: {
    phone: string;
    shift: string;
    startDate: Date;
    salary: number;
    status: string;
  };
}

const UserSchema = new Schema<IUser>({
  restaurantId: { type: Schema.Types.ObjectId, required: true },
  name: { type: String, required: [true, "El nombre es obligatorio"] },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: [true, "La contraseña es obligatoria"], select: false },
  role: { type: String, default: "waiter" },
  isActive: { type: Boolean, default: true },
  employmentDetails: {
    phone: String,
    shift: String,
    startDate: { type: Date, default: Date.now },
    salary: { type: Number, default: 0 },
    status: { type: String, default: "Activo" }
  }
}, { timestamps: true });

// Hash de contraseña automático antes de guardar
UserSchema.pre("save", async function () {
  // Si la contraseña no cambió, no hacemos nada
  if (!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  
  // ¡ELIMINAMOS next()! Al ser async, Mongoose espera a que termine la función solo.
});

export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema);