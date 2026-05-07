// src/components/clientScreen/delivery/CategoryTabs.tsx
import React from "react";

export type DishCategory = "Todos" | "Entradas" | "Platos Fuertes" | "Postres" | "Bebidas";

export const CATEGORIES: DishCategory[] = [
    "Todos",
    "Entradas",
    "Platos Fuertes",
    "Postres",
    "Bebidas",
];

interface CategoryTabsProps {
    selected: DishCategory;
    onSelect: (category: DishCategory) => void;
}

export function CategoryTabs({ selected, onSelect }: CategoryTabsProps) {
    return (
        <div style={styles.wrapper}>
            {CATEGORIES.map((cat) => {
                const active = cat === selected;
                return (
                    <button
                        key={cat}
                        style={{
                            ...styles.tab,
                            ...(active ? styles.tabActive : null),
                        }}
                        onClick={() => onSelect(cat)}
                    >
                        {cat}
                    </button>
                );
            })}
        </div>
    );
}

const styles: { [key: string]: React.CSSProperties } = {
    wrapper: {
        display: "flex",
        flexWrap: "wrap",
        gap: "0.5rem",
    },
    tab: {
        padding: "0.5rem 1rem",
        borderRadius: 8,
        backgroundColor: "#ffffff",
        border: "1px solid #e5e7eb",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "#e5e7eb",
        color: "#374151",
        fontSize: "0.85rem",
        fontWeight: 500,
        cursor: "pointer",
        transition: "background 0.15s, color 0.15s",
    },
    tabActive: {
        backgroundColor: "#111827",
        borderColor: "#111827",
        color: "#ffffff",
    },
};
