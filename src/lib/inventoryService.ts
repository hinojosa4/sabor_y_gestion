import { connectDB } from "@/lib/db";  
import Ingredient from "@/models/Ingredient";
import Dish from "@/models/Dish";
import OrderItem from "@/models/OrderItem";

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
  const dish = await Dish.findById(orderItem.dish_id).populate(  // ← menu_item_id → dish_id
    "ingredients.ingredient_id"
  );
  if (!dish) throw new Error("Plato no encontrado");

  const alertas: string[] = [];

  for (const item of dish.ingredients) {
    const cantidadADescontar = item.quantity * orderItem.quantity;

    const ingrediente = await Ingredient.findByIdAndUpdate(
      item.ingredient_id,
      { $inc: { currentStock: -cantidadADescontar } },  // ← stock_actual → currentStock
      { new: true }
    );

    if (!ingrediente) continue;

    // Revisar estado post-descuento
    if (ingrediente.currentStock <= 0) {
      alertas.push(`🔴 CRÍTICO: "${ingrediente.name}" sin stock`);  // ← nombre → name
    } else if (ingrediente.currentStock <= ingrediente.minStock) {  // ← stock_minimo → minStock
      alertas.push(
        `🟡 BAJO: "${ingrediente.name}" con ${ingrediente.currentStock} ${ingrediente.unit}`  // ← campos actualizados
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

  const ingredientes = await Ingredient.find({ isActive: true })  // ← activo → isActive
    .populate("category_id", "name")                               // ← nombre → name
    .lean();

  return ingredientes
    .map((ing) => ({
      ...ing,
      stockStatus:
        ing.currentStock <= 0                          // ← stock_actual → currentStock
          ? "critico"
          : ing.currentStock <= ing.minStock           // ← stock_minimo → minStock
          ? "bajo"
          : "ok",
    }))
    .filter((ing) => ing.stockStatus !== "ok")
    .sort((a, b) => {
      if (a.stockStatus === "critico" && b.stockStatus !== "critico") return -1;
      if (b.stockStatus === "critico" && a.stockStatus !== "critico") return 1;
      return 0;
    });
}