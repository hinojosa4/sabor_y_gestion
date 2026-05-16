import mongoose, { Document, Schema } from "mongoose";

export interface IReservation extends Document {
  user_id: mongoose.Types.ObjectId;
  table_id?: mongoose.Types.ObjectId;
  // Datos de contacto del titular de la reserva
  contact_name: string;       // nombre
  contact_lastname: string;   // apellido
  contact_phone: string;      // celular
  party_size: number;
  date: Date;
  occasion?: string;          // cumpleaños, aniversario, reunión, etc.
  special_requests?: string;  // peticiones especiales
  notes?: string;             // nota interna del restaurante
  status: "pending" | "confirmed" | "seated" | "cancelled";
  createdAt: Date;
  updatedAt: Date;
}

const ReservationSchema = new Schema<IReservation>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    table_id: {
      type: Schema.Types.ObjectId,
      ref: "Table",
      default: null,
    },
    contact_name: {
      type: String,
      required: [true, "El nombre es obligatorio"],
      trim: true,
      maxlength: 60,
    },
    contact_lastname: {
      type: String,
      required: [true, "El apellido es obligatorio"],
      trim: true,
      maxlength: 60,
    },
    contact_phone: {
      type: String,
      required: [true, "El celular es obligatorio"],
      trim: true,
      maxlength: 20,
    },
    party_size: {
      type: Number,
      required: true,
      min: [1, "Debe haber al menos 1 persona"],
      max: [20, "Máximo 20 personas por reserva"],
    },
    date: {
      type: Date,
      required: true,
    },
    occasion: {
      type: String,
      trim: true,
      enum: ["", "Cumpleaños", "Aniversario", "Reunión de negocios", "Celebración", "Otro"],
      default: "",
    },
    special_requests: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "seated", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true, versionKey: false }
);

const Reservation =
  mongoose.models.Reservation ||
  mongoose.model<IReservation>("Reservation", ReservationSchema);

export default Reservation;