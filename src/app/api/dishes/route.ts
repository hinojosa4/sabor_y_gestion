import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Dish from "@/models/Dish";
import Category from "@/models/Category";
import "@/models/Ingredient";
import mongoose from "mongoose";

// ── Helper: validar estructura de ingredients ─────────────────────────────────
function validateIngredients(ingredients: unknown[]): string | null {
  for (const ing of ingredients) {
    const item = ing as { ingredient_id?: unknown; quantity?: unknown };

    if (
      !item.ingredient_id ||
      !mongoose.Types.ObjectId.isValid(String(item.ingredient_id))
    ) {
      return "Cada ingrediente debe tener un ingredient_id válido";
    }

    if (typeof item.quantity !== "number" || item.quantity <= 0) {
      return "La cantidad de cada ingrediente debe ser un número mayor a 0";
    }
  }
  return null;
}

// ── GET /api/dishes ───────────────────────────────────────────────────────────
export async function GET() {
  try {
    await connectDB();

    const dishes = await Dish.find()
      .populate("category_id", "name")        // ← "nombre" → "name"
      .populate("ingredients.ingredient_id", "name unit currentStock minStock warningStock")  // ← "nombre unidad" → "name unit"
      .sort({ createdAt: -1 });

    return NextResponse.json({ ok: true, data: dishes });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: "Error al obtener los platos",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
}

// ── POST /api/dishes ──────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { name, description, price, category_id, isAvailable, image_url, ingredients } = body;

    // Validaciones básicas
    if (!name || !name.trim()) {
      return NextResponse.json(
        { ok: false, message: "El nombre es obligatorio" },
        { status: 400 }
      );
    }

    if (price === undefined || typeof price !== "number" || price <= 0) {
      return NextResponse.json(
        { ok: false, message: "El precio es obligatorio y debe ser mayor a 0" },
        { status: 400 }
      );
    }

    // Validar category_id si viene
    if (category_id) {
      if (!mongoose.Types.ObjectId.isValid(category_id)) {
        return NextResponse.json(
          { ok: false, message: "El ID de categoría no es válido" },
          { status: 400 }
        );
      }
      const categoryExists = await Category.findById(category_id);
      if (!categoryExists) {
        return NextResponse.json(
          { ok: false, message: "La categoría especificada no existe" },
          { status: 404 }
        );
      }
    }

    // Validar ingredients si vienen
    if (Array.isArray(ingredients) && ingredients.length > 0) {
      const ingredientError = validateIngredients(ingredients);
      if (ingredientError) {
        return NextResponse.json(
          { ok: false, message: ingredientError },
          { status: 400 }
        );
      }
    }

    // Verificar nombre duplicado
    const existingDish = await Dish.findOne({ name: name.trim() });
    if (existingDish) {
      return NextResponse.json(
        { ok: false, message: "Ya existe un plato con ese nombre" },
        { status: 409 }
      );
    }

    const dish = await Dish.create({
      name: name.trim(),
      description: description?.trim() || "",
      price,
      category_id: category_id || null,
      isAvailable: isAvailable ?? true,
      image_url: image_url?.trim() || "",
      ingredients: ingredients || [],
    });

    await dish.populate("category_id", "name");
    await dish.populate("ingredients.ingredient_id", "name unit");

    return NextResponse.json(
      { ok: true, message: "Plato creado correctamente", data: dish },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: "Error al crear el plato",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
}