import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Ingredient from "@/models/Ingredient";
import "@/models/IngredientCategory";
import mongoose from "mongoose";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ ok: false, message: "ID de ingrediente no válido" }, { status: 400 });
    }
    const ingredient = await Ingredient.findById(id).populate("category_id", "nombre");
    if (!ingredient) {
      return NextResponse.json({ ok: false, message: "Ingrediente no encontrado" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, data: ingredient });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: "Error al obtener el ingrediente", error: error instanceof Error ? error.message : "Error desconocido" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ ok: false, message: "ID de ingrediente no válido" }, { status: 400 });
    }

    const body = await req.json();
    const { nombre, stock_actual, stock_minimo, stock_maximo, unidad, proveedor, category_id, activo } = body;

    if (!nombre || !nombre.trim()) {
      return NextResponse.json({ ok: false, message: "El nombre es obligatorio" }, { status: 400 });
    }
    if (stock_actual === undefined || stock_actual < 0) {
      return NextResponse.json({ ok: false, message: "El stock actual no puede ser negativo" }, { status: 400 });
    }
    if (stock_minimo === undefined || stock_minimo < 0) {
      return NextResponse.json({ ok: false, message: "El stock mínimo no puede ser negativo" }, { status: 400 });
    }
    if (stock_maximo === undefined || stock_maximo < stock_minimo) {
      return NextResponse.json({ ok: false, message: "El stock máximo debe ser mayor al mínimo" }, { status: 400 });
    }
    if (!unidad) {
      return NextResponse.json({ ok: false, message: "La unidad de medida es obligatoria" }, { status: 400 });
    }

    const existing = await Ingredient.findOne({ nombre: nombre.trim(), _id: { $ne: id } });
    if (existing) {
      return NextResponse.json({ ok: false, message: "Ya existe otro ingrediente con ese nombre" }, { status: 409 });
    }

    const updated = await Ingredient.findByIdAndUpdate(
      id,
      {
        nombre: nombre.trim(),
        stock_actual,
        stock_minimo,
        stock_maximo,
        unidad,
        proveedor: proveedor?.trim() || "",
        category_id: category_id || null,
        activo: activo ?? true,
      },
      { returnDocument: "after", runValidators: true }
    ).populate("category_id", "nombre");

    if (!updated) {
      return NextResponse.json({ ok: false, message: "Ingrediente no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, message: "Ingrediente actualizado correctamente", data: updated });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: "Error al actualizar el ingrediente", error: error instanceof Error ? error.message : "Error desconocido" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ ok: false, message: "ID de ingrediente no válido" }, { status: 400 });
    }
    const deleted = await Ingredient.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ ok: false, message: "Ingrediente no encontrado" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, message: "Ingrediente eliminado correctamente" });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: "Error al eliminar el ingrediente", error: error instanceof Error ? error.message : "Error desconocido" },
      { status: 500 }
    );
  }
}