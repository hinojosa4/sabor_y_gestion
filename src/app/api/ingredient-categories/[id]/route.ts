import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import IngredientCategory from "@/models/IngredientCategory";
import mongoose from "mongoose";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { ok: false, message: "ID no válido" },
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

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { ok: false, message: "ID no válido" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { nombre, descripcion, activo } = body;

    if (!nombre || !nombre.trim()) {
      return NextResponse.json(
        { ok: false, message: "El nombre es obligatorio" },
        { status: 400 }
      );
    }

    const existing = await IngredientCategory.findOne({
      nombre: nombre.trim(),
      _id: { $ne: id },
    });
    if (existing) {
      return NextResponse.json(
        { ok: false, message: "Ya existe otra categoría con ese nombre" },
        { status: 409 }
      );
    }

    const updated = await IngredientCategory.findByIdAndUpdate(
      id,
      {
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || "",
        activo: activo ?? true,
      },
      { returnDocument: "after", runValidators: true }
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

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { ok: false, message: "ID no válido" },
        { status: 400 }
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
