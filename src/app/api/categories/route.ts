import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Category from "@/models/Category";

// ── GET /api/categories ───────────────────────────────────────────────────────
export async function GET() {
  try {
    await connectDB();

    const categories = await Category.find().sort({ createdAt: -1 });

    return NextResponse.json({ ok: true, data: categories });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: "Error al obtener categorías",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
}

// ── POST /api/categories ──────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { name, description, isActive } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { ok: false, message: "El nombre es obligatorio" },
        { status: 400 }
      );
    }

    const existingCategory = await Category.findOne({ name: name.trim() });
    if (existingCategory) {
      return NextResponse.json(
        { ok: false, message: "La categoría ya existe" },
        { status: 409 }
      );
    }

    const category = await Category.create({
      name: name.trim(),
      description: description?.trim() || "",
      isActive: isActive ?? true,
    });

    return NextResponse.json(
      { ok: true, message: "Categoría creada correctamente", data: category },
      { status: 201 }
    );
  } catch (error) {
  console.error("[POST /api/categories] Error completo:", error); // ← agrega esto
  return NextResponse.json(
    {
      ok: false,
      message: "Error al crear categoría",
      error: error instanceof Error ? error.message : "Error desconocido",
    },
    { status: 500 }
  );
  }
}