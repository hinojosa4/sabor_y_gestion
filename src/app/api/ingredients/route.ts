import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Ingredient from "@/models/Ingredient";
import IngredientCategory from "@/models/IngredientCategory";
import "@/models/IngredientCategory";

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
      {
        ok: false,
        message: "Error al obtener ingredientes",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
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

    if (category_id) {
      const categoryExists = await IngredientCategory.findById(category_id);
      if (!categoryExists) {
        return NextResponse.json(
          { ok: false, message: "La categoría especificada no existe" },
          { status: 404 }
        );
      }
    }

    const existing = await Ingredient.findOne({ name: name.trim() });
    if (existing) {
      return NextResponse.json(
        { ok: false, message: "Ya existe un ingrediente con ese nombre" },
        { status: 409 }
      );
    }

    const ingredient = await Ingredient.create({
      name: name.trim(),
      currentStock,
      minStock,
      maxStock,
      unit,
      supplier: supplier?.trim() || "",
      category_id: category_id || null,
      isActive: isActive ?? true,
    });

    await ingredient.populate("category_id", "name");

    return NextResponse.json(
      { ok: true, message: "Ingrediente creado correctamente", data: ingredient },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: "Error al crear el ingrediente",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
}