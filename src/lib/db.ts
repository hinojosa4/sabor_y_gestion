// src/lib/db.ts
import mongoose from "mongoose";

// Quitamos el '!' y el throw de aquí afuera
const MONGO_URI = process.env.MONGO_URI;

let isConnected = false;

export async function connectDB() {
  if (isConnected) return;

  // La validación ahora vive aquí adentro
  if (!MONGO_URI) {
    console.error("❌ Error: MONGO_URI no está definida en las variables de entorno.");
    return; // O lanza el error aquí si prefieres, pero ya no matará el build
  }

  try {
    await mongoose.connect(MONGO_URI);
    isConnected = true;
    console.log("✅ Mongo conectado con éxito");
  } catch (error) {
    console.error("❌ Error conectando a Mongo:", error);
    throw error;
  }
}
