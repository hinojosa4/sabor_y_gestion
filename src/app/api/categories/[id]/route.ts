import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Category from "@/models/Category";
import Dish from "@/models/Dish";
import mongoose from "mongoose";

interface Params {
  params: Promise<{ id: string }>;
}

// ── GET /api/categories/[id] ──────────────────────────────────────────────────
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

    const category = await Category.findById(id);

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
        message: "Error al obtener categoría",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
}

// ── PUT /api/categories/[id] ──────────────────────────────────────────────────
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

    const existingCategory = await Category.findOne({
      name: name.trim(),
      _id: { $ne: id },
    });

    if (existingCategory) {
      return NextResponse.json(
        { ok: false, message: "Ya existe otra categoría con ese nombre" },
        { status: 409 }
      );
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      {
        name: name.trim(),
        description: description?.trim() || "",
        isActive: isActive ?? true,
      },
      { returnDocument: "after", runValidators: true }
    );

    if (!updatedCategory) {
      return NextResponse.json(
        { ok: false, message: "Categoría no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Categoría actualizada correctamente",
      data: updatedCategory,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: "Error al actualizar categoría",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
}

// ── DELETE /api/categories/[id] ───────────────────────────────────────────────
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

    // Verificar platos asociados antes de eliminar
    const dishCount = await Dish.countDocuments({ category_id: id });
    if (dishCount > 0) {
      return NextResponse.json(
        {
          ok: false,
          message: `No se puede eliminar, tiene ${dishCount} plato(s) asociado(s)`,
        },
        { status: 409 }
      );
    }

    const deletedCategory = await Category.findByIdAndDelete(id);

    if (!deletedCategory) {
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
        message: "Error al eliminar categoría",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
}