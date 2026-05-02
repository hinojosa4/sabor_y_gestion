import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Ingredient from "@/models/Ingredient";

export async function GET() {
  try {
    await connectDB();
    const ingredients = await Ingredient.find({ activo: true })
      .populate("category_id", "nombre")
      .sort({ nombre: 1 })
      .lean();

    // Calculamos stockStatus aquí porque .lean() no ejecuta virtuals
    const data = ingredients.map((ing) => ({
      ...ing,
      stockStatus:
        ing.stock_actual <= 0
          ? "critico"
          : ing.stock_actual <= ing.stock_minimo
          ? "bajo"
          : "ok",
    }));

    return NextResponse.json({ ok: true, data });
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
    const msg =
      error instanceof Error ? error.message : "Error al crear ingrediente";
    return NextResponse.json({ ok: false, message: msg }, { status: 400 });
  }
}