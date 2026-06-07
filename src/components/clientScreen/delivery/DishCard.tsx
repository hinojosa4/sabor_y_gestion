// src/components/clientScreen/delivery/DishCard.tsx
import React from "react";
import { PlusCircle } from "lucide-react";

export interface Dish {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  /** URL real de imagen (si existe en BD) */
  image_url?: string;
  /** Color de fondo de fallback cuando no hay imagen */
  bgColor?: string;
  /** Emoji de fallback cuando no hay imagen ni color */
  emoji?: string;
  hasStock?: boolean;
}

interface DishCardProps {
  dish: Dish;
  onAdd: (dish: Dish) => void;
}


export function DishCard({ dish, onAdd }: DishCardProps) {
  const bg = dish.bgColor ?? "#f3f4f6";
  const { hasStock } = dish;
  const outOfStock = hasStock === false;
  return (
    <article style={{ ...styles.card, ...(outOfStock ? styles.cardDisabled : {}) }}>
      {/* Imagen o placeholder */}
      <div style={{ ...styles.imageBox, backgroundColor: dish.image_url ? "transparent" : bg, position: "relative" }}>
        {dish.image_url ? (
          <img
            src={dish.image_url}
            alt={dish.name}
            style={{ ...styles.image, ...(outOfStock ? styles.imageDisabled : {}) }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <span style={{ ...styles.emoji, ...(outOfStock ? styles.emojiDisabled : {}) }}>
            {dish.emoji ?? "🍽️"}
          </span>
        )}
        {outOfStock && (
          <div style={styles.stockBadge}>Sin stock</div>
        )}
      </div>

      <div style={styles.body}>
        <div>
          <h3 style={styles.name}>{dish.name}</h3>
          {dish.description && (
            <p style={styles.description}>{dish.description}</p>
          )}
        </div>

        <div style={styles.footer}>
          <span style={styles.price}>Bs. {dish.price.toFixed(2)}</span>
          <button
            style={{
              ...styles.addBtn,
              ...(outOfStock ? styles.addBtnDisabled : {}),
            }}
            onClick={() => !outOfStock && onAdd(dish)}
            disabled={outOfStock}
            aria-label={outOfStock ? `${dish.name} sin stock` : `Agregar ${dish.name}`}
          >
            <PlusCircle size={16} />
            <span>{outOfStock ? "Sin stock" : "Agregar"}</span>
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
    border: "1px solid #f3f4f6",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    transition: "transform 0.15s, box-shadow 0.15s",
  },
  imageBox: {
    height: 130,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  emoji: {
    fontSize: "3rem",
  },
  body: {
    padding: "0.9rem 1rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.6rem",
    flex: 1,
    justifyContent: "space-between",
  },
  name: {
    margin: 0,
    fontSize: "0.95rem",
    fontWeight: 700,
    color: "#111827",
    lineHeight: 1.3,
  },
  description: {
    margin: "0.3rem 0 0",
    fontSize: "0.8rem",
    color: "#6b7280",
    lineHeight: 1.4,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  } as React.CSSProperties,
  footer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "0.5rem",
  },
  price: {
    fontSize: "1.1rem",
    fontWeight: 700,
    color: "#f97316",
  },
  addBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.35rem",
    backgroundColor: "#f97316",
    color: "#ffffff",
    border: "none",
    borderRadius: 8,
    padding: "0.45rem 0.85rem",
    fontSize: "0.82rem",
    fontWeight: 600,
    cursor: "pointer",
  },

  cardDisabled: {
  opacity: 0.7,
  pointerEvents: "none" as const,
  } as React.CSSProperties,
  imageDisabled: {
    filter: "grayscale(80%)",
  } as React.CSSProperties,
  emojiDisabled: {
    filter: "grayscale(80%)",
    opacity: 0.5,
  } as React.CSSProperties,
  stockBadge: {
    position: "absolute" as const,
    top: 8,
    left: 8,
    backgroundColor: "rgba(17,24,39,0.75)",
    color: "#fff",
    fontSize: "0.72rem",
    fontWeight: 700,
    letterSpacing: "0.05em",
    textTransform: "uppercase" as const,
    padding: "0.2rem 0.55rem",
    borderRadius: 6,
  } as React.CSSProperties,
  addBtnDisabled: {
    backgroundColor: "#d1d5db",
    cursor: "not-allowed" as const,
  } as React.CSSProperties,
};