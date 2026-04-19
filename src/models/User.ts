import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";

export type UserRole = "admin" | "cajero" | "cocinero" | "mesero" | "cliente";
export interface IUser extends Document {
  nombre: string;
  email: string;
  password: string;
  rol: UserRole;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    nombre: {
      type: String,
      required: [true, "El nombre es obligatorio"],
      trim: true,
      minlength: [2, "El nombre debe tener al menos 2 caracteres"],
      maxlength: [100, "El nombre no puede superar los 100 caracteres"],
    },
    email: {
      type: String,
      required: [true, "El email es obligatorio"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "El email no tiene un formato válido"],
    },
    password: {
      type: String,
      required: [true, "La contraseña es obligatoria"],
      minlength: [8, "La contraseña debe tener al menos 8 caracteres"],
      select: false, // No se devuelve en queries por defecto
    },
    rol: {
      type: String,
      enum: {
        values: ["admin", "cajero", "cocinero", "mesero", "cliente"],
        message: "El rol '{VALUE}' no es válido",
      },
      default: "mesero",
    },
    activo: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);


// --- Hash de contraseña antes de guardar ---
UserSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});


// --- Método de instancia para comparar contraseñas ---
UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};


// --- Evitar modelo duplicado en hot-reload de Next.js ---
const User = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);


export default User;
