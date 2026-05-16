// src/components/clientScreen/delivery/OrderCart.tsx
import React from "react";
import { ShoppingBag, Plus, Minus, Trash2, MapPin, CreditCard } from "lucide-react";
import type { Dish } from "./DishCard";

export interface CartItem {
    dish: Dish;
    quantity: number;
}

interface OrderCartProps {
    items: CartItem[];
    shippingFee?: number;
    onIncrement: (dishId: string) => void;
    onDecrement: (dishId: string) => void;
    onRemove: (dishId: string) => void;
    onCheckout: () => void;
}

export function OrderCart({
    items,
    shippingFee = 3.99,
    onIncrement,
    onDecrement,
    onRemove,
    onCheckout,
}: OrderCartProps) {
    const totalCount = items.reduce((sum, it) => sum + it.quantity, 0);
    const subtotal = items.reduce((sum, it) => sum + it.dish.price * it.quantity, 0);
    const total = items.length === 0 ? 0 : subtotal + shippingFee;

    return (
        <section style={styles.card}>
            <header style={styles.header}>
                <ShoppingBag size={18} color="#8b5cf6" />
                <h3 style={styles.title}>Tu pedido ({totalCount})</h3>
            </header>

            {items.length === 0 ? (
                <div style={styles.empty}>
                    <div style={styles.emptyIcon}>
                        <ShoppingBag size={36} color="#d1d5db" />
                    </div>
                    <p style={styles.emptyText}>Tu carrito está vacío</p>
                </div>
            ) : (
                <>
                    <div style={styles.itemList}>
                        {items.map((item) => (
                            <div key={item.dish.id} style={styles.item}>
                                <div style={styles.itemInfo}>
                                    <span style={styles.itemName}>{item.dish.name}</span>
                                    <span style={styles.itemPrice}>
                                        ${item.dish.price.toFixed(2)} c/u
                                    </span>
                                </div>
                                <div style={styles.itemControls}>
                                    <button
                                        style={styles.qtyBtn}
                                        onClick={() => onDecrement(item.dish.id)}
                                    >
                                        <Minus size={14} />
                                    </button>
                                    <span style={styles.qty}>{item.quantity}</span>
                                    <button
                                        style={styles.qtyBtn}
                                        onClick={() => onIncrement(item.dish.id)}
                                    >
                                        <Plus size={14} />
                                    </button>
                                    <button
                                        style={styles.deleteBtn}
                                        onClick={() => onRemove(item.dish.id)}
                                    >
                                        <Trash2 size={16} color="#ef4444" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={styles.summary}>
                        <div style={styles.summaryRow}>
                            <span style={styles.summaryLabel}>Subtotal:</span>
                            <span style={styles.summaryValue}>${subtotal.toFixed(2)}</span>
                        </div>
                        <div style={styles.summaryRow}>
                            <span style={styles.summaryLabel}>Envío:</span>
                            <span style={styles.summaryValue}>${shippingFee.toFixed(2)}</span>
                        </div>
                        <div style={styles.shippingNote}>
                            <MapPin size={13} color="#f97316" />
                            <span>Tarifa estándar</span>
                        </div>

                        <div style={styles.divider} />

                        <div style={styles.totalRow}>
                            <span style={styles.totalLabel}>Total:</span>
                            <span style={styles.totalValue}>${total.toFixed(2)}</span>
                        </div>
                    </div>

                    <button style={styles.checkoutBtn} onClick={onCheckout}>
                        <CreditCard size={16} />
                        <span>Proceder al Pago</span>
                    </button>
                </>
            )}
        </section>
    );
}

const styles: { [key: string]: React.CSSProperties } = {
    card: {
        backgroundColor: "#ffffff",
        borderRadius: 14,
        border: "1px solid #f3f4f6",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        padding: "1.1rem 1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.9rem",
    },
    header: {
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        paddingBottom: "0.75rem",
        borderBottom: "1px solid #f3f4f6",
    },
    title: {
        margin: 0,
        fontSize: "1rem",
        fontWeight: 700,
        color: "#111827",
    },
    empty: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.6rem",
        padding: "2rem 0 1rem",
    },
    emptyIcon: {
        width: 64,
        height: 64,
        borderRadius: 12,
        backgroundColor: "#f9fafb",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    emptyText: {
        margin: 0,
        fontSize: "0.875rem",
        color: "#9ca3af",
    },
    itemList: {
        display: "flex",
        flexDirection: "column",
        gap: "0.9rem",
    },
    item: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "0.75rem",
        paddingBottom: "0.75rem",
        borderBottom: "1px solid #f3f4f6",
    },
    itemInfo: {
        display: "flex",
        flexDirection: "column",
        gap: 2,
    },
    itemName: {
        fontSize: "0.9rem",
        fontWeight: 600,
        color: "#111827",
    },
    itemPrice: {
        fontSize: "0.75rem",
        color: "#6b7280",
    },
    itemControls: {
        display: "flex",
        alignItems: "center",
        gap: "0.4rem",
    },
    qtyBtn: {
        width: 26,
        height: 26,
        borderRadius: 6,
        border: "1px solid #e5e7eb",
        backgroundColor: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        color: "#374151",
    },
    qty: {
        fontSize: "0.875rem",
        fontWeight: 600,
        color: "#111827",
        minWidth: 16,
        textAlign: "center",
    },
    deleteBtn: {
        marginLeft: 4,
        width: 28,
        height: 28,
        borderRadius: 6,
        border: "none",
        backgroundColor: "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
    },
    summary: {
        display: "flex",
        flexDirection: "column",
        gap: "0.4rem",
    },
    summaryRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: "0.875rem",
    },
    summaryLabel: {
        color: "#6b7280",
    },
    summaryValue: {
        color: "#111827",
        fontWeight: 600,
    },
    shippingNote: {
        display: "inline-flex",
        alignItems: "center",
        gap: "0.3rem",
        fontSize: "0.75rem",
        color: "#f97316",
    },
    divider: {
        height: 1,
        backgroundColor: "#f3f4f6",
        margin: "0.4rem 0",
    },
    totalRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
    },
    totalLabel: {
        fontSize: "1rem",
        fontWeight: 700,
        color: "#111827",
    },
    totalValue: {
        fontSize: "1.4rem",
        fontWeight: 700,
        color: "#8b5cf6",
    },
    checkoutBtn: {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.5rem",
        padding: "0.8rem 1rem",
        backgroundColor: "#111827",
        color: "#ffffff",
        border: "none",
        borderRadius: 10,
        cursor: "pointer",
        fontSize: "0.9rem",
        fontWeight: 600,
    },
};
