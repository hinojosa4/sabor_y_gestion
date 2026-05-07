// src/components/clientScreen/delivery/DishCard.tsx
import React, { useState } from "react";
import { Plus } from "lucide-react";
import type { DishCategory } from "./CategoryTabs";

export interface Dish {
    id: string;
    name: string;
    description: string;
    price: number;
    category: Exclude<DishCategory, "Todos">;
    emoji: string;
    bgColor: string;
}

interface DishCardProps {
    dish: Dish;
    onAdd: (dish: Dish) => void;
}

export function DishCard({ dish, onAdd }: DishCardProps) {
    const [hovered, setHovered] = useState(false);

    return (
        <article
            style={{ ...styles.card, ...(hovered ? styles.cardHover : null) }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <div style={{ ...styles.imageBox, backgroundColor: dish.bgColor }}>
                <span style={styles.emoji}>{dish.emoji}</span>
            </div>

            <div style={styles.body}>
                <h3 style={styles.name}>{dish.name}</h3>
                <p style={styles.description}>{dish.description}</p>

                <div style={styles.footer}>
                    <span style={styles.price}>${dish.price.toFixed(2)}</span>
                    <button style={styles.addBtn} onClick={() => onAdd(dish)}>
                        <Plus size={14} />
                        <span>Agregar</span>
                    </button>
                </div>
            </div>
        </article>
    );
}

const styles: { [key: string]: React.CSSProperties } = {
    card: {
        backgroundColor: "#ffffff",
        borderRadius: 14,
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "#f3f4f6",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        transition: "border-color 0.2s, box-shadow 0.2s, transform 0.2s",
    },
    cardHover: {
        borderColor: "#8b5cf6",
        boxShadow: "0 10px 25px -5px rgba(139, 92, 246, 0.25), 0 4px 10px -3px rgba(139, 92, 246, 0.15)",
        transform: "translateY(-2px)",
    },
    imageBox: {
        height: 160,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    emoji: {
        fontSize: "4rem",
        lineHeight: 1,
    },
    body: {
        padding: "1rem 1.1rem 1.1rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.4rem",
    },
    name: {
        margin: 0,
        fontSize: "1rem",
        fontWeight: 700,
        color: "#111827",
    },
    description: {
        margin: 0,
        fontSize: "0.8rem",
        color: "#6b7280",
        lineHeight: 1.35,
    },
    footer: {
        marginTop: "0.6rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "0.5rem",
    },
    price: {
        fontSize: "1.15rem",
        fontWeight: 700,
        color: "#10b981",
    },
    addBtn: {
        display: "inline-flex",
        alignItems: "center",
        gap: "0.35rem",
        padding: "0.5rem 0.85rem",
        backgroundColor: "#111827",
        color: "#ffffff",
        border: "none",
        borderRadius: 8,
        cursor: "pointer",
        fontSize: "0.8rem",
        fontWeight: 600,
    },
};
