import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Ingredient from "@/models/Ingredient";
import "@/models/IngredientCategory"; // ← agrega esta línea

export async function GET() {
  try {
    await connectDB();
    const ingredients = await Ingredient.find({ activo: true })
      .populate("category_id", "nombre")
      .sort({ nombre: 1 });

    return NextResponse.json({ ok: true, data: ingredients });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: "Error al obtener ingredientes" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const ingredient = await Ingredient.create(body);
    return NextResponse.json({ ok: true, data: ingredient }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error al crear ingrediente";
    return NextResponse.json({ ok: false, message: msg }, { status: 400 });
  }
}