import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Dish from "@/models/Dish";
import mongoose from "mongoose";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ ok: false, message: "ID de plato no válido" }, { status: 400 });
    }
    const dish = await Dish.findById(id).populate("category_id", "nombre");
    if (!dish) {
      return NextResponse.json({ ok: false, message: "Plato no encontrado" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, data: dish });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: "Error al obtener el plato", error: error instanceof Error ? error.message : "Error desconocido" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ ok: false, message: "ID de plato no válido" }, { status: 400 });
    }

    const body = await req.json();
    const { name, description, price, category_id, isAvailable, image_url, ingredients } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ ok: false, message: "El nombre es obligatorio" }, { status: 400 });
    }

    if (price === undefined || price < 0) {
      return NextResponse.json({ ok: false, message: "El precio es obligatorio y no puede ser negativo" }, { status: 400 });
    }

    // ✅ category_id ya NO es obligatorio

    const existingDish = await Dish.findOne({ name: name.trim(), _id: { $ne: id } });
    if (existingDish) {
      return NextResponse.json({ ok: false, message: "Ya existe otro plato con ese nombre" }, { status: 409 });
    }

    const updatedDish = await Dish.findByIdAndUpdate(
      id,
      {
        name: name.trim(),
        description: description?.trim() || "",
        price,
        category_id: category_id || null,   // ← null si no viene
        isAvailable: isAvailable ?? true,
        image_url: image_url || "",
        ingredients: ingredients || [],       // ← nuevo campo
      },
      { returnDocument: "after", runValidators: true }
    ).populate("category_id", "nombre");

    if (!updatedDish) {
      return NextResponse.json({ ok: false, message: "Plato no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, message: "Plato actualizado correctamente", data: updatedDish });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: "Error al actualizar el plato", error: error instanceof Error ? error.message : "Error desconocido" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ ok: false, message: "ID de plato no válido" }, { status: 400 });
    }
    const deletedDish = await Dish.findByIdAndDelete(id);
    if (!deletedDish) {
      return NextResponse.json({ ok: false, message: "Plato no encontrado" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, message: "Plato eliminado correctamente" });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: "Error al eliminar el plato", error: error instanceof Error ? error.message : "Error desconocido" },
      { status: 500 }
    );
  }
}