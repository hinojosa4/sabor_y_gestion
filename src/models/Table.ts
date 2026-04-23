import mongoose from 'mongoose';

const TableSchema = new mongoose.Schema({
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    number: { type: Number, required: true, min: 1 },
    capacity: { type: Number, required: true, min: 1, max: 20 },
    location: {
        type: String,
        required: true,
        enum: ['Interior - Salón Principal', 'Interior - Salón VIP', 'Terraza', 'Exterior - Jardín', 'Segundo Piso', 'Bar']
    },
    status: {
        type: String,
        default: 'Activa',
        enum: ['Activa', 'Inactiva']
    },
    isAvailable: { type: Boolean, default: true },
    xPosition: { type: Number, default: 50, min: 0, max: 100 },
    yPosition: { type: Number, default: 50, min: 0, max: 100 }
}, { timestamps: true });

TableSchema.index({ restaurantId: 1, number: 1 }, { unique: true });

export default mongoose.models.Table || mongoose.model('Table', TableSchema);