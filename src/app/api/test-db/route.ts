import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";

export const dynamic = 'force-dynamic'; 

export async function GET() {
  try {
    await connectDB();

    return NextResponse.json({
      ok: true,
      message: "Mongo conectado correctamente desde la API",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: "Error al conectar a MongoDB",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
}