"use client";
import { useState, useEffect, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────
interface Ingredient {
  ingredient_id: {
    _id: string;
    name: string;
    unit: string;
  };
  quantity: number;
}

interface Dish {
  _id: string;
  name: string;
  price: number;
  description?: string;
  image_url?: string;
  category_id?: { name: string } | null;
  ingredients?: Ingredient[];
}

interface ComandaItem {
  _id: string;
  quantity: number;
  unit_price: number;
  notes?: string;
  status: string;
  dish_id?: Dish | null;
}

interface ComandaOrder {
  _id: string;
  status: string;
  service_type: string;
  table_number?: number | null;
  table_id?: string;
  createdAt: string;
  total_amount: number;
  items: ComandaItem[];
}

// ─── Helpers ──────────────────────────────────────────────────────
function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("es-BO", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-BO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatCurrency(amount: number): string {
  return `Bs. ${amount.toFixed(2)}`;
}

// ─── Modal Comanda Mesero ─────────────────────────────────────────
export function ComandaMeseroModal({
  orderId,
  tableNumber,
  onClose,
}: {
  orderId: string;
  tableNumber?: number | null;
  onClose: () => void;
}) {
  const [order, setOrder] = useState<ComandaOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        const data = await res.json();
        if (data.ok) setOrder(data.data);
      } catch {
        // silencioso
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const activeItems = order?.items.filter(i => i.status !== "cancelled") ?? [];
  const total = activeItems.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      style={{
        position: "fixed", inset: 0, zIndex: 2000,
        background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
    >
      <div style={{
        background: "#fff",
        borderRadius: 20,
        width: "100%",
        maxWidth: 480,
        maxHeight: "90vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
      }}>
        {/* Header */}
        <div style={{
          padding: "20px 24px 16px",
          borderBottom: "1px solid #f3f4f6",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          background: "#fff",
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <span style={{ fontSize: 22 }}>🍽</span>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#111" }}>
                Comanda — Mesa {tableNumber ?? order?.table_number ?? "—"}
              </h2>
            </div>
            {order && (
              <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>
                {formatDate(order.createdAt)} · {formatTime(order.createdAt)}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: "50%",
              border: "1.5px solid #e5e7eb", background: "#fff",
              cursor: "pointer", fontSize: 16,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#6b7280", flexShrink: 0,
            }}
          >×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
          {loading ? (
            <p style={{ textAlign: "center", color: "#9ca3af", padding: 32 }}>Cargando comanda...</p>
          ) : !order || activeItems.length === 0 ? (
            <p style={{ textAlign: "center", color: "#9ca3af", padding: 32 }}>Sin ítems en esta orden</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {activeItems.map((item, idx) => (
                <div key={item._id} style={{
                  padding: "14px 16px",
                  borderRadius: 12,
                  border: "1.5px solid #f3f4f6",
                  background: "#fafafa",
                }}>
                  {/* Plato */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{
                          width: 28, height: 28, borderRadius: "50%",
                          background: "#ea580c", color: "#fff",
                          fontSize: 13, fontWeight: 800,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0,
                        }}>
                          {item.quantity}
                        </span>
                        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#111" }}>
                          {item.dish_id?.name ?? "Plato"}
                        </p>
                      </div>
                      {item.dish_id?.category_id?.name && (
                        <p style={{ margin: "4px 0 0 36px", fontSize: 11, color: "#9ca3af" }}>
                          {item.dish_id.category_id.name}
                        </p>
                      )}
                      {item.notes && (
                        <div style={{
                          margin: "6px 0 0 36px",
                          padding: "4px 10px",
                          background: "#fffbeb",
                          border: "1px solid #fde68a",
                          borderRadius: 6,
                          fontSize: 12,
                          color: "#d97706",
                          display: "inline-block",
                        }}>
                          ⚠ {item.notes}
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#374151", flexShrink: 0 }}>
                      {formatCurrency(item.unit_price * item.quantity)}
                    </span>
                  </div>

                  {/* Separador entre items */}
                  {idx < activeItems.length - 1 && (
                    <div style={{ height: 1, background: "#f3f4f6", marginTop: 12 }} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer — total */}
        {!loading && order && (
          <div style={{
            padding: "16px 24px",
            borderTop: "1.5px solid #f3f4f6",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <span style={{ fontSize: 14, color: "#6b7280", fontWeight: 600 }}>
              {activeItems.length} {activeItems.length === 1 ? "plato" : "platos"}
            </span>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>Total</p>
              <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#111" }}>
                {formatCurrency(total)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Modal Comanda Cocinero ───────────────────────────────────────
export function ComandaCocineroModal({
  orderId,
  tableNumber,
  onClose,
}: {
  orderId: string;
  tableNumber?: number | null;
  onClose: () => void;
}) {
  const [order, setOrder] = useState<ComandaOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        const data = await res.json();
        if (data.ok) setOrder(data.data);
      } catch {
        // silencioso
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const activeItems = order?.items.filter(i => i.status !== "cancelled") ?? [];

  // Total de ingredientes agrupados por nombre
  const ingredientSummary = activeItems.reduce<Record<string, { name: string; unit: string; total: number }>>((acc, item) => {
    const ingredients = item.dish_id?.ingredients ?? [];
    ingredients.forEach(ing => {
      if (!ing.ingredient_id) return;
      const key = ing.ingredient_id._id;
      const totalQty = ing.quantity * item.quantity;
      if (acc[key]) {
        acc[key].total += totalQty;
      } else {
        acc[key] = {
          name: ing.ingredient_id.name,
          unit: ing.ingredient_id.unit,
          total: totalQty,
        };
      }
    });
    return acc;
  }, {});

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      style={{
        position: "fixed", inset: 0, zIndex: 2000,
        background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
    >
      <div style={{
        background: "#fff",
        borderRadius: 20,
        width: "100%",
        maxWidth: 560,
        maxHeight: "90vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
      }}>
        {/* Header */}
        <div style={{
          padding: "20px 24px 16px",
          borderBottom: "1px solid #f3f4f6",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          background: "#fff",
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <span style={{ fontSize: 22 }}>👨‍🍳</span>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#111" }}>
                Comanda Cocina — Mesa {tableNumber ?? order?.table_number ?? "—"}
              </h2>
            </div>
            {order && (
              <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>
                {formatDate(order.createdAt)} · {formatTime(order.createdAt)}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: "50%",
              border: "1.5px solid #e5e7eb", background: "#fff",
              cursor: "pointer", fontSize: 16,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#6b7280", flexShrink: 0,
            }}
          >×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
          {loading ? (
            <p style={{ textAlign: "center", color: "#9ca3af", padding: 32 }}>Cargando comanda...</p>
          ) : !order || activeItems.length === 0 ? (
            <p style={{ textAlign: "center", color: "#9ca3af", padding: 32 }}>Sin ítems en esta orden</p>
          ) : (
            <>
              {/* Platos con ingredientes */}
              <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: 1 }}>
                Platos
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
                {activeItems.map(item => (
                  <div key={item._id} style={{
                    borderRadius: 12,
                    border: "1.5px solid #e5e7eb",
                    overflow: "hidden",
                  }}>
                    {/* Header plato */}
                    <div style={{
                      padding: "12px 16px",
                      background: "#1a1a1a",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}>
                      <span style={{
                        width: 28, height: 28, borderRadius: "50%",
                        background: "#e85d26", color: "#fff",
                        fontSize: 13, fontWeight: 800,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                      }}>
                        {item.quantity}
                      </span>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#fff" }}>
                          {item.dish_id?.name ?? "Plato"}
                        </p>
                        {item.dish_id?.category_id?.name && (
                          <p style={{ margin: 0, fontSize: 11, color: "#9ca3af" }}>
                            {item.dish_id.category_id.name}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Ingredientes */}
                    <div style={{ padding: "10px 16px", background: "#fafafa" }}>
                      {item.notes && (
                        <div style={{
                          marginBottom: 8,
                          padding: "4px 10px",
                          background: "#fffbeb",
                          border: "1px solid #fde68a",
                          borderRadius: 6,
                          fontSize: 12,
                          color: "#d97706",
                        }}>
                          ⚠ {item.notes}
                        </div>
                      )}
                      {!item.dish_id?.ingredients || item.dish_id.ingredients.length === 0 ? (
                        <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>Sin ingredientes registrados</p>
                      ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                          {item.dish_id.ingredients.map((ing, idx) => {
                            if (!ing.ingredient_id) return null;
                            const totalQty = ing.quantity * item.quantity;
                            return (
                              <div key={idx} style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "6px 10px",
                                background: "#fff",
                                borderRadius: 8,
                                border: "1px solid #f3f4f6",
                              }}>
                                <span style={{ fontSize: 12, color: "#374151", fontWeight: 600 }}>
                                  {ing.ingredient_id.name}
                                </span>
                                <span style={{
                                  fontSize: 12, fontWeight: 700,
                                  color: "#e85d26",
                                  background: "#fff7ed",
                                  padding: "2px 8px",
                                  borderRadius: 20,
                                }}>
                                  {totalQty} {ing.ingredient_id.unit}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Resumen total de ingredientes */}
              {Object.keys(ingredientSummary).length > 0 && (
                <>
                  <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: 1 }}>
                    Total Ingredientes
                  </p>
                  <div style={{
                    borderRadius: 12,
                    border: "1.5px solid #e5e7eb",
                    overflow: "hidden",
                  }}>
                    {Object.values(ingredientSummary).map((ing, idx, arr) => (
                      <div key={ing.name} style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 16px",
                        borderBottom: idx < arr.length - 1 ? "1px solid #f3f4f6" : "none",
                        background: idx % 2 === 0 ? "#fff" : "#fafafa",
                      }}>
                        <span style={{ fontSize: 13, color: "#374151", fontWeight: 600 }}>
                          {ing.name}
                        </span>
                        <span style={{
                          fontSize: 13, fontWeight: 700,
                          color: "#e85d26",
                          background: "#fff7ed",
                          padding: "3px 12px",
                          borderRadius: 20,
                        }}>
                          {ing.total} {ing.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!loading && order && (
          <div style={{
            padding: "14px 24px",
            borderTop: "1.5px solid #f3f4f6",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#fafafa",
          }}>
            <span style={{ fontSize: 13, color: "#6b7280" }}>
              {activeItems.length} {activeItems.length === 1 ? "plato" : "platos"}
            </span>
            <span style={{ fontSize: 13, color: "#6b7280" }}>
              Orden #{order._id.slice(-4).toUpperCase()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
