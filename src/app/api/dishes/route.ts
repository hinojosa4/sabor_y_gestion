import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Dish from "@/models/Dish";

export async function GET() {
  try {
    await connectDB();
    const dishes = await Dish.find()
      .populate("category_id", "nombre")
      .sort({ createdAt: -1 });
    return NextResponse.json({ ok: true, data: dishes });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: "Error al obtener los platos", error: error instanceof Error ? error.message : "Error desconocido" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { name, description, price, category_id, isAvailable, image_url, ingredients } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ ok: false, message: "El nombre es obligatorio" }, { status: 400 });
    }

    if (price === undefined || price < 0) {
      return NextResponse.json({ ok: false, message: "El precio es obligatorio y no puede ser negativo" }, { status: 400 });
    }

    // ✅ category_id ya NO es obligatorio
    // ✅ ingredients es opcional, default []

    const existingDish = await Dish.findOne({ name: name.trim() });
    if (existingDish) {
      return NextResponse.json({ ok: false, message: "Ya existe un plato con ese nombre" }, { status: 409 });
    }

    const dish = await Dish.create({
      name: name.trim(),
      description: description?.trim() || "",
      price,
      category_id: category_id || null,   // ← null si no viene
      isAvailable: isAvailable ?? true,
      image_url: image_url || "",
      ingredients: ingredients || [],       // ← nuevo campo
    });

    return NextResponse.json({ ok: true, message: "Plato creado correctamente", data: dish }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: "Error al crear el plato", error: error instanceof Error ? error.message : "Error desconocido" },
      { status: 500 }
    );
  }
}