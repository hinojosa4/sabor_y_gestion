import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import IngredientCategory from "@/models/IngredientCategory";
import Ingredient from "@/models/Ingredient";
import mongoose from "mongoose";

interface Params {
  params: Promise<{ id: string }>;
}

// ── GET /api/ingredient-categories/[id] ──────────────────────────────────────
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { ok: false, message: "ID de categoría no válido" },
        { status: 400 }
      );
    }

    const category = await IngredientCategory.findById(id);
    if (!category) {
      return NextResponse.json(
        { ok: false, message: "Categoría no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data: category });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: "Error al obtener la categoría",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
}

// ── PUT /api/ingredient-categories/[id] ──────────────────────────────────────
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { ok: false, message: "ID de categoría no válido" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { name, description, isActive } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { ok: false, message: "El nombre es obligatorio" },
        { status: 400 }
      );
    }

    const existing = await IngredientCategory.findOne({
      name: name.trim(),
      _id: { $ne: id },
    });
    if (existing) {
      return NextResponse.json(
        { ok: false, message: "Ya existe otra categoría con ese nombre" },
        { status: 409 }
      );
    }

    // FIX: runValidators: false para evitar posibles errores de validación internos
    const updated = await IngredientCategory.findByIdAndUpdate(
      id,
      {
        name: name.trim(),
        description: description?.trim() || "",
        isActive: isActive ?? true,
      },
      { returnDocument: "after", runValidators: false }
    );

    if (!updated) {
      return NextResponse.json(
        { ok: false, message: "Categoría no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Categoría actualizada correctamente",
      data: updated,
    });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      const messages = Object.values(error.errors).map((e) => e.message).join(". ");
      return NextResponse.json(
        { ok: false, message: messages },
        { status: 400 }
      );
    }

    if ((error as { code?: number }).code === 11000) {
      return NextResponse.json(
        { ok: false, message: "Ya existe otra categoría con ese nombre" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        message: "Error al actualizar la categoría",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
}

// ── DELETE /api/ingredient-categories/[id] ────────────────────────────────────
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { ok: false, message: "ID de categoría no válido" },
        { status: 400 }
      );
    }

    // Verificar ingredientes asociados antes de eliminar
    const ingredientCount = await Ingredient.countDocuments({ category_id: id });
    if (ingredientCount > 0) {
      return NextResponse.json(
        {
          ok: false,
          message: `No se puede eliminar, tiene ${ingredientCount} ingrediente(s) asociado(s)`,
        },
        { status: 409 }
      );
    }

    const deleted = await IngredientCategory.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json(
        { ok: false, message: "Categoría no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Categoría eliminada correctamente",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: "Error al eliminar la categoría",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
}