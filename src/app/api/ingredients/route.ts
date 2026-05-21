import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Ingredient from "@/models/Ingredient";
import IngredientCategory from "@/models/IngredientCategory";
import "@/models/IngredientCategory";
import mongoose from "mongoose";

const VALID_UNITS = ["kg", "lt", "unit", "gr", "ml"] as const;

// ── GET /api/ingredients ──────────────────────────────────────────────────────
export async function GET() {
  try {
    await connectDB();
    const ingredients = await Ingredient.find()
      .populate("category_id", "name")
      .sort({ name: 1 });
    return NextResponse.json({ ok: true, data: ingredients });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: "Error al obtener ingredientes", error: error instanceof Error ? error.message : "Error desconocido" },
      { status: 500 }
    );
  }
}

// ── POST /api/ingredients ─────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const {
      name, currentStock,
      minStock, warningStock, reorderPoint, maxStock,
      unit, supplier, category_id, isActive,
    } = body;

    // ── Validaciones básicas ──────────────────────────────────────────────────
    if (!name?.trim()) {
      return NextResponse.json({ ok: false, message: "El nombre es obligatorio" }, { status: 400 });
    }

    const numFields: [string, unknown, string][] = [
      ["El stock actual",        currentStock,  "no puede ser negativo"],
      ["El stock mínimo",        minStock,       "no puede ser negativo"],
      ["El stock de advertencia",warningStock,  "no puede ser negativo"],
      ["El punto de reorden",    reorderPoint,  "no puede ser negativo"],
      ["El stock máximo",        maxStock,       "no puede ser negativo"],
    ];

    for (const [label, val, msg] of numFields) {
      if (val === undefined || val === null || typeof val !== "number" || (val as number) < 0) {
        return NextResponse.json({ ok: false, message: `${label} ${msg}` }, { status: 400 });
      }
    }

    // ── Validar jerarquía: minStock < warningStock < reorderPoint < maxStock ──
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

    if (!unit || !VALID_UNITS.includes(unit)) {
      return NextResponse.json(
        { ok: false, message: `La unidad debe ser una de: ${VALID_UNITS.join(", ")}` },
        { status: 400 }
      );
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

    const existing = await Ingredient.findOne({ name: name.trim() });
    if (existing) {
      return NextResponse.json({ ok: false, message: "Ya existe un ingrediente con ese nombre" }, { status: 409 });
    }

    const ingredient = new Ingredient({
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
    });

    await ingredient.save({ validateBeforeSave: false });
    await ingredient.populate("category_id", "name");

    return NextResponse.json(
      { ok: true, message: "Ingrediente creado correctamente", data: ingredient },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      const messages = Object.values(error.errors).map((e) => e.message).join(". ");
      return NextResponse.json({ ok: false, message: messages }, { status: 400 });
    }
    if ((error as { code?: number }).code === 11000) {
      return NextResponse.json({ ok: false, message: "Ya existe un ingrediente con ese nombre" }, { status: 409 });
    }
    return NextResponse.json(
      { ok: false, message: "Error al crear el ingrediente", error: error instanceof Error ? error.message : "Error desconocido" },
      { status: 500 }
    );
  }
}