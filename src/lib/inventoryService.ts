import { connectDB } from "@/lib/db";  
import Ingredient from "@/models/Ingredient";
import Dish from "@/models/Dish";
import OrderItem from "@/models/OrderItem";
import mongoose from "mongoose";

/**
 * Descuenta stock al confirmar items en cocina.
 * Llámalo cuando OrderItem.status cambia a "in_kitchen"
 */
export async function descontarStockPorOrdenItem(
  orderItemId: string
): Promise<{ success: boolean; alertas: string[] }> {
  await connectDB();

  const orderItem = await OrderItem.findById(orderItemId);
  if (!orderItem) throw new Error("OrderItem no encontrado");

  // Busca el plato con sus ingredientes
  const dish = await Dish.findById(orderItem.menu_item_id).populate(
    "ingredients.ingredient_id"
  );
  if (!dish) throw new Error("Plato no encontrado");

  const alertas: string[] = [];

  for (const item of dish.ingredients) {
    const cantidadADescontar = item.quantity * orderItem.quantity;

    const ingrediente = await Ingredient.findByIdAndUpdate(
      item.ingredient_id,
      { $inc: { stock_actual: -cantidadADescontar } },
      { new: true }
    );

    if (!ingrediente) continue;

    // Revisar estado post-descuento
    if (ingrediente.stock_actual <= 0) {
      alertas.push(`🔴 CRÍTICO: "${ingrediente.nombre}" sin stock`);
    } else if (ingrediente.stock_actual <= ingrediente.stock_minimo) {
      alertas.push(
        `🟡 BAJO: "${ingrediente.nombre}" con ${ingrediente.stock_actual} ${ingrediente.unidad}`
      );
    }
  }

  return { success: true, alertas };
}

/**
 * Devuelve todos los ingredientes con stock bajo o crítico
 * Para la vista de administrador y cocinero
 */
export async function obtenerAlertasInventario() {
  await connectDB();

  const ingredientes = await Ingredient.find({ activo: true })
    .populate("category_id", "nombre")
    .lean();

  return ingredientes
    .map((ing) => ({
      ...ing,
      stockStatus:
        ing.stock_actual <= 0
          ? "critico"
          : ing.stock_actual <= ing.stock_minimo
          ? "bajo"
          : "ok",
    }))
    .filter((ing) => ing.stockStatus !== "ok")
    .sort((a, b) => {
      // Críticos primero
      if (a.stockStatus === "critico" && b.stockStatus !== "critico") return -1;
      if (b.stockStatus === "critico" && a.stockStatus !== "critico") return 1;
      return 0;
    });
}