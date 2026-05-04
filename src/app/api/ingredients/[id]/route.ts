import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Ingredient from "@/models/Ingredient";
import IngredientCategory from "@/models/IngredientCategory";
import "@/models/IngredientCategory";
import mongoose from "mongoose";

const VALID_UNITS = ["kg", "lt", "unit", "gr", "ml"] as const;

interface Params {
  params: Promise<{ id: string }>;
}

// ── GET /api/ingredients/[id] ─────────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { ok: false, message: "ID de ingrediente no válido" },
        { status: 400 }
      );
    }

    const ingredient = await Ingredient.findById(id).populate("category_id", "name");

    if (!ingredient) {
      return NextResponse.json(
        { ok: false, message: "Ingrediente no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data: ingredient });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: "Error al obtener el ingrediente",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
}

// ── PUT /api/ingredients/[id] ─────────────────────────────────────────────────
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { ok: false, message: "ID de ingrediente no válido" },
        { status: 400 }
      );
    }

    const ingredient = await Ingredient.findById(id);
    if (!ingredient) {
      return NextResponse.json(
        { ok: false, message: "Ingrediente no encontrado" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const {
      name,
      currentStock,
      minStock,
      maxStock,
      unit,
      supplier,
      category_id,
      isActive,
    } = body;

    // Validaciones
    if (!name || !name.trim()) {
      return NextResponse.json(
        { ok: false, message: "El nombre es obligatorio" },
        { status: 400 }
      );
    }

    if (currentStock === undefined || typeof currentStock !== "number" || currentStock < 0) {
      return NextResponse.json(
        { ok: false, message: "El stock actual no puede ser negativo" },
        { status: 400 }
      );
    }

    if (minStock === undefined || typeof minStock !== "number" || minStock < 0) {
      return NextResponse.json(
        { ok: false, message: "El stock mínimo no puede ser negativo" },
        { status: 400 }
      );
    }

    if (maxStock === undefined || typeof maxStock !== "number" || maxStock <= minStock) {
      return NextResponse.json(
        { ok: false, message: "El stock máximo debe ser mayor al mínimo" },
        { status: 400 }
      );
    }

    if (!unit || !VALID_UNITS.includes(unit)) {
      return NextResponse.json(
        { ok: false, message: `La unidad debe ser una de: ${VALID_UNITS.join(", ")}` },
        { status: 400 }
      );
    }

    // Verificar nombre duplicado excluyendo el propio documento
    const duplicate = await Ingredient.findOne({
      name: name.trim(),
      _id: { $ne: id },
    });
    if (duplicate) {
      return NextResponse.json(
        { ok: false, message: "Ya existe otro ingrediente con ese nombre" },
        { status: 409 }
      );
    }

    // Validar category_id si viene
    if (category_id) {
      const categoryExists = await IngredientCategory.findById(category_id);
      if (!categoryExists) {
        return NextResponse.json(
          { ok: false, message: "La categoría especificada no existe" },
          { status: 404 }
        );
      }
    }

    const updated = await Ingredient.findByIdAndUpdate(
      id,
      {
        name: name.trim(),
        currentStock,
        minStock,
        maxStock,
        unit,
        supplier: supplier?.trim() || "",
        category_id: category_id || null,
        isActive: isActive ?? true,
      },
      { new: true, runValidators: true }
    ).populate("category_id", "name");

    return NextResponse.json({
      ok: true,
      message: "Ingrediente actualizado correctamente",
      data: updated,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: "Error al actualizar el ingrediente",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
}

// ── DELETE /api/ingredients/[id] ──────────────────────────────────────────────
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { ok: false, message: "ID de ingrediente no válido" },
        { status: 400 }
      );
    }

    const deleted = await Ingredient.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json(
        { ok: false, message: "Ingrediente no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Ingrediente eliminado correctamente",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: "Error al eliminar el ingrediente",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
}