import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { verifyToken } from "@/lib/jwt";
import LoyaltyTier from "@/models/LoyaltyTier";

type Params = {
  params: Promise<{ id: string }>;
};

type LoyaltyTierBody = {
  name?: string;
  minOrders?: number;
  minSpent?: number;
  discountPercent?: number;
  benefits?: string[];
  sortOrder?: number;
  isActive?: boolean;
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function requireAdmin(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  try {
    const payload = verifyToken(authHeader.split(" ")[1]);
    return payload.rol === "admin" ? payload : null;
  } catch {
    return null;
  }
}

function normalizeBody(body: LoyaltyTierBody) {
  const name = body.name?.trim();
  if (!name) return { error: "El nombre es obligatorio" };

  const minOrders = Number(body.minOrders ?? 0);
  const minSpent = Number(body.minSpent ?? 0);
  const discountPercent = Number(body.discountPercent ?? 0);
  const sortOrder = Number(body.sortOrder ?? 0);

  if (!Number.isFinite(minOrders) || minOrders < 0) return { error: "Los pedidos minimos no son validos" };
  if (!Number.isFinite(minSpent) || minSpent < 0) return { error: "El gasto minimo no es valido" };
  if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) {
    return { error: "El descuento debe estar entre 0 y 100" };
  }
  if (!Number.isFinite(sortOrder) || sortOrder < 0) return { error: "El orden no es valido" };

  const benefits = Array.isArray(body.benefits)
    ? body.benefits.map((benefit) => benefit.trim()).filter(Boolean)
    : [];

  return {
    data: {
      name,
      slug: slugify(name),
      minOrders: Math.floor(minOrders),
      minSpent,
      discountPercent,
      benefits,
      sortOrder: Math.floor(sortOrder),
      isActive: body.isActive ?? true,
    },
  };
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    await connectDB();

    if (!requireAdmin(req)) {
      return NextResponse.json({ ok: false, message: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ ok: false, message: "ID no valido" }, { status: 400 });
    }

    const tier = await LoyaltyTier.findById(id);
    if (!tier) {
      return NextResponse.json({ ok: false, message: "Categoria no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data: tier });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: "Error al obtener categoria de fidelizacion",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    await connectDB();

    if (!requireAdmin(req)) {
      return NextResponse.json({ ok: false, message: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ ok: false, message: "ID no valido" }, { status: 400 });
    }

    const normalized = normalizeBody(await req.json());
    if ("error" in normalized) {
      return NextResponse.json({ ok: false, message: normalized.error }, { status: 400 });
    }

    const existingTier = await LoyaltyTier.findOne({
      _id: { $ne: id },
      $or: [{ name: normalized.data.name }, { slug: normalized.data.slug }],
    });

    if (existingTier) {
      return NextResponse.json(
        { ok: false, message: "Ya existe otra categoría con ese nombre en la segmentación de clientes" },
        { status: 409 }
      );
    }

    const tier = await LoyaltyTier.findByIdAndUpdate(id, normalized.data, {
      returnDocument: "after",
      runValidators: true,
    });

    if (!tier) {
      return NextResponse.json({ ok: false, message: "Categoría no encontrada" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      message: "Categoría de segmentación de clientes actualizada correctamente",
      data: tier,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: "Error al actualizar categoría de segmentación de clientes",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    await connectDB();

    if (!requireAdmin(req)) {
      return NextResponse.json({ ok: false, message: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ ok: false, message: "ID no válido" }, { status: 400 });
    }

    // Siempre debe quedar al menos una regla activa para calcular la segmentación.
    const tier = await LoyaltyTier.findById(id);
    if (!tier) {
      return NextResponse.json({ ok: false, message: "Categoría no encontrada" }, { status: 404 });
    }

    if (tier.isActive) {
      const activeCount = await LoyaltyTier.countDocuments({ isActive: true });
      if (activeCount <= 1) {
        return NextResponse.json(
          { ok: false, message: "Debe existir al menos una categoría activa" },
          { status: 409 }
        );
      }
    }

    await tier.deleteOne();

    return NextResponse.json({
      ok: true,
      message: "Categoría de segmentación de clientes eliminada correctamente",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: "Error al eliminar categoría de segmentación de clientes",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
}
