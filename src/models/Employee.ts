// src/models/Employee.ts
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const EmployeeSchema = new mongoose.Schema({
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, match: [/^\S+@\S+\.\S+$/, "Email inválido"] },
    password: { type: String, required: true, minlength: 8, select: false },
    rol: {
        type: String,
        required: true,
        enum: ['admin', 'gerente', 'mesero', 'cocinero', 'delivery', 'cajero', 'bartender']
    },
    isActive: { type: Boolean, default: true },
    employmentDetails: {
        phone: { type: String, required: true, match: [/^[0-9]{8,15}$/, "Teléfono inválido"] },
        shift: { type: String, required: true, enum: ['Turno Mañana', 'Turno Tarde', 'Turno Completo'] },
        startDate: { type: Date, required: true },
        salary: { type: Number, required: true, min: 0, max: 100000 },
        status: { type: String, default: 'Activo', enum: ['Activo', 'Vacaciones', 'Inactivo'] }
    }
}, { timestamps: true });

EmployeeSchema.pre("save", async function () {
    if (!this.isModified("password")) return;
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
});

EmployeeSchema.methods.comparePassword = async function (
    candidatePassword: string
): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.models.Employee || mongoose.model('Employee', EmployeeSchema, 'users');