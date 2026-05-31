import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Ingredient from "@/models/Ingredient";
import IngredientCategory from "@/models/IngredientCategory";
import "@/models/IngredientCategory";
import mongoose from "mongoose";
import { pusherServer } from "@/lib/pusher";

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
      return NextResponse.json({ ok: false, message: "ID de ingrediente no válido" }, { status: 400 });
    }

    const ingredient = await Ingredient.findById(id).populate("category_id", "name");
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

// ── PUT /api/ingredients/[id] ─────────────────────────────────────────────────
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ ok: false, message: "ID de ingrediente no válido" }, { status: 400 });
    }

    const ingredient = await Ingredient.findById(id);
    if (!ingredient) {
      return NextResponse.json({ ok: false, message: "Ingrediente no encontrado" }, { status: 404 });
    }

    const body = await req.json();
    console.log("PUT BODY:", JSON.stringify(body, null, 2));

    const {
      name, currentStock,
      minStock, warningStock, reorderPoint, maxStock,
      unit, supplier, category_id, isActive,
    } = body;

    await pusherServer.trigger("restaurant", "ingredient:updated", {});
    if (!name?.trim()) {
      return NextResponse.json({ ok: true, data: ingredient });
    }

    if (currentStock === undefined || currentStock === null || typeof currentStock !== "number" || isNaN(currentStock)) {
  return NextResponse.json({ ok: false, message: "El stock actual es obligatorio" }, { status: 400 });
}

  const numFields: [string, unknown, string][] = [
    ["El stock mínimo",         minStock,     "no puede ser negativo"],
    ["El stock de advertencia", warningStock, "no puede ser negativo"],
    ["El punto de reorden",     reorderPoint, "no puede ser negativo"],
    ["El stock máximo",         maxStock,     "no puede ser negativo"],
  ];

  for (const [label, val, msg] of numFields) {
    if (val === undefined || val === null || typeof val !== "number" || isNaN(val as number) || (val as number) < 0) {
      return NextResponse.json({ ok: false, message: `${label} ${msg}` }, { status: 400 });
    }
  }

    for (const [label, val, msg] of numFields) {
      if (val === undefined || val === null || typeof val !== "number" || (val as number) < 0) {
        return NextResponse.json({ ok: false, message: `${label} ${msg}` }, { status: 400 });
      }
    }

    if (warningStock <= minStock) {
      return NextResponse.json(
        { ok: false, message: "El stock de advertencia (🟡) debe ser mayor al stock mínimo (🔴)" },
        { status: 400 }
      );
    }
    if (reorderPoint <= warningStock) {
      return NextResponse.json(
        { ok: false, message: "El punto de reorden debe ser mayor al stock de advertencia (🟡)" },
        { status: 400 }
      );
    }
    if (maxStock <= reorderPoint) {
      return NextResponse.json(
        { ok: false, message: "El stock máximo debe ser mayor al punto de reorden" },
        { status: 400 }
      );
    }

    if (currentStock > maxStock) {
      return NextResponse.json(
        { ok: false, message: "El stock actual no puede ser mayor al stock máximo" },
        { status: 400 }
      );
    }

    if (!unit || !VALID_UNITS.includes(unit)) {
      return NextResponse.json(
        { ok: false, message: `La unidad debe ser una de: ${VALID_UNITS.join(", ")}` },
        { status: 400 }
      );
    }

    const duplicate = await Ingredient.findOne({ name: name.trim(), _id: { $ne: id } });
    if (duplicate) {
      return NextResponse.json({ ok: false, message: "Ya existe otro ingrediente con ese nombre" }, { status: 409 });
    }

    if (category_id) {
      if (!mongoose.Types.ObjectId.isValid(category_id)) {
        return NextResponse.json({ ok: false, message: "ID de categoría no válido" }, { status: 400 });
      }
      const categoryExists = await IngredientCategory.findById(category_id);
      if (!categoryExists) {
        return NextResponse.json({ ok: false, message: "La categoría especificada no existe" }, { status: 404 });
      }
    }

    // FIX: Usar findByIdAndUpdate para actualizar, luego re-leer con findById
    // para que el virtual stockStatus se calcule sobre los valores nuevos.
    // findByIdAndUpdate con returnDocument:"after" devuelve el doc hidratado
    // pero el virtual puede quedar en cache con los valores viejos en algunas
    // versiones de Mongoose. Re-leer garantiza el valor correcto.
    await Ingredient.findByIdAndUpdate(
      id,
      {
        name: name.trim(),
        currentStock,
        minStock,
        warningStock,
        reorderPoint,
        maxStock,
        unit,
        supplier: supplier?.trim() || "",
        category_id: category_id || null,
        isActive: isActive ?? true,
      },
      { runValidators: false }
    );

    // Re-leer para obtener virtual stockStatus recalculado correctamente
    const updated = await Ingredient.findById(id).populate("category_id", "name");

    return NextResponse.json({
      ok: true,
      message: "Ingrediente actualizado correctamente",
      data: updated,
    });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      const messages = Object.values(error.errors).map((e) => e.message).join(". ");
      return NextResponse.json({ ok: false, message: messages }, { status: 400 });
    }
    return NextResponse.json(
      { ok: false, message: "Error al actualizar el ingrediente", error: error instanceof Error ? error.message : "Error desconocido" },
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
      return NextResponse.json({ ok: false, message: "ID de ingrediente no válido" }, { status: 400 });
    }

    const deleted = await Ingredient.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ ok: false, message: "Ingrediente no encontrado" }, { status: 404 });
    }

    await pusherServer.trigger("restaurant", "ingredient:deleted", {});
    return NextResponse.json({ ok: true, message: "Ingrediente eliminado correctamente" });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: "Error al eliminar el ingrediente", error: error instanceof Error ? error.message : "Error desconocido" },
      { status: 500 }
    );
  }
}