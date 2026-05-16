// src/components/clientScreen/delivery/CategoryTabs.tsx
import React from "react";

interface CategoryTabsProps {
  /** Lista de categorías incluyendo "Todos" como primer elemento */
  categories: string[];
  selected: string;
  onSelect: (category: string) => void;
}

export function CategoryTabs({ categories, selected, onSelect }: CategoryTabsProps) {
  return (
    <div style={styles.wrapper}>
      <div style={styles.track}>
        {categories.map((cat) => {
          const isActive = cat === selected;
          return (
            <button
              key={cat}
              style={{
                ...styles.tab,
                ...(isActive ? styles.tabActive : styles.tabInactive),
              }}
              onClick={() => onSelect(cat)}
            >
              {cat}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  wrapper: {
    overflowX: "auto",
    WebkitOverflowScrolling: "touch",
    scrollbarWidth: "none",
  },
  track: {
    display: "flex",
    gap: "0.5rem",
    paddingBottom: "0.25rem",
    minWidth: "max-content",
  },
  tab: {
    padding: "0.45rem 1.1rem",
    borderRadius: 999,
    fontSize: "0.875rem",
    fontWeight: 600,
    cursor: "pointer",
    border: "none",
    transition: "background 0.15s, color 0.15s",
    whiteSpace: "nowrap",
  },
  tabActive: {
    backgroundColor: "#f97316",
    color: "#ffffff",
  },
  tabInactive: {
    backgroundColor: "#f3f4f6",
    color: "#374151",
  },
};