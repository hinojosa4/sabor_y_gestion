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
 
  const dish = await Dish.findById(orderItem.dish_id).populate(
    "ingredients.ingredient_id"
  );
  if (!dish) throw new Error("Plato no encontrado");
 
  const alertas: string[] = [];
 
  for (const item of dish.ingredients) {
    const cantidadADescontar = item.quantity * orderItem.quantity;
 
    const ingrediente = await Ingredient.findByIdAndUpdate(
      item.ingredient_id,
      { $inc: { currentStock: -cantidadADescontar } },
      { new: true }
    );
 
    if (!ingrediente) continue;
 
    // Usa el virtual del modelo — única fuente de verdad para el status
    if (ingrediente.stockStatus === "critical") {
      alertas.push(
        `🔴 CRÍTICO: "${ingrediente.name}" con ${ingrediente.currentStock} ${ingrediente.unit} (mínimo: ${ingrediente.minStock})`
      );
    } else if (ingrediente.stockStatus === "low") {
      alertas.push(
        `🟡 BAJO: "${ingrediente.name}" con ${ingrediente.currentStock} ${ingrediente.unit} (advertencia: ${ingrediente.warningStock})`
      );
    }
  }
 
  return { success: true, alertas };
}
 
/**
 * Devuelve todos los ingredientes con stock bajo o crítico.
 * Sin .lean() para que los virtuals (stockStatus) estén disponibles.
 */
export async function obtenerAlertasInventario() {
  await connectDB();
 
  const ingredientes = await Ingredient.find({ isActive: true }).populate(
    "category_id",
    "name"
  );
 
  return ingredientes
    .filter((ing) => ing.stockStatus !== "ok")
    .map((ing) => ing.toJSON())
    .sort((a, b) => {
      if (a.stockStatus === "critical" && b.stockStatus !== "critical") return -1;
      if (b.stockStatus === "critical" && a.stockStatus !== "critical") return 1;
      return 0;
    });
}