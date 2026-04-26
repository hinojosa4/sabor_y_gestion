// models/Table.ts
import mongoose from 'mongoose';

const TableSchema = new mongoose.Schema({
    // Relación con el restaurante (Obligatorio para multi-tenant)
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    number: { type: Number, required: true, min: 1 },
    capacity: { type: Number, required: true, min: 1, max: 20 },
    location: {
        type: String,
        required: true,
        enum: ['Interior - Salón Principal', 'Interior - Salón VIP', 'Terraza', 'Exterior - Jardín', 'Segundo Piso', 'Bar']
    },
    // 🔥 CAMBIAR: nuevos estados
    status: {
        type: String,
        default: 'Libre',
        enum: ['Libre', 'Ocupada', 'Reservada', 'Cuenta solicitada']
    },
    // 🔥 ELIMINAR: isAvailable (ya no se usa)
    xPosition: { type: Number, default: 50, min: 0, max: 100 },
    yPosition: { type: Number, default: 50, min: 0, max: 100 }
}, { timestamps: true });

// Índice compuesto para evitar números de mesa duplicados en el mismo restaurante
TableSchema.index({ restaurantId: 1, number: 1 }, { unique: true });

export default mongoose.models.Table || mongoose.model('Table', TableSchema);