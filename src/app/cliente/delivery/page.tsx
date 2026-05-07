"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DeliveryHeader } from "@/components/clientScreen/delivery/DeliveryHeader";
import { DeliveryEstimateBanner } from "@/components/clientScreen/delivery/DeliveryEstimateBanner";
import {
    CategoryTabs,
    DishCategory,
} from "@/components/clientScreen/delivery/CategoryTabs";
import { DishCard, Dish } from "@/components/clientScreen/delivery/DishCard";
import { OrderCart, CartItem } from "@/components/clientScreen/delivery/OrderCart";
import { OngoingOrder } from "@/components/clientScreen/delivery/OngoingOrder";

const MOCK_DISHES: Dish[] = [
    {
        id: "d1",
        name: "Filete de Res",
        description: "Filete de res premium con guarnición de vegetales",
        price: 24.99,
        category: "Platos Fuertes",
        emoji: "🥩",
        bgColor: "#fde68a",
    },
    {
        id: "d2",
        name: "Pizza Margarita",
        description: "Pizza clásica con tomate, mozzarella y albahaca",
        price: 12.99,
        category: "Platos Fuertes",
        emoji: "🍕",
        bgColor: "#fecaca",
    },
    {
        id: "d3",
        name: "Ensalada César",
        description: "Lechuga romana, crutones, parmesano y aderezo césar",
        price: 9.5,
        category: "Entradas",
        emoji: "🥗",
        bgColor: "#bbf7d0",
    },
    {
        id: "d4",
        name: "Sopa del Día",
        description: "Crema de zapallo con un toque de jengibre",
        price: 7.5,
        category: "Entradas",
        emoji: "🍲",
        bgColor: "#fed7aa",
    },
    {
        id: "d5",
        name: "Tiramisú",
        description: "Postre italiano con café, mascarpone y cacao",
        price: 8.5,
        category: "Postres",
        emoji: "🍰",
        bgColor: "#e9d5ff",
    },
    {
        id: "d6",
        name: "Cheesecake",
        description: "Tarta de queso con coulis de frutos rojos",
        price: 8.0,
        category: "Postres",
        emoji: "🍮",
        bgColor: "#fbcfe8",
    },
    {
        id: "d7",
        name: "Limonada Natural",
        description: "Limonada fresca con menta y un toque de jengibre",
        price: 4.5,
        category: "Bebidas",
        emoji: "🍋",
        bgColor: "#fef08a",
    },
    {
        id: "d8",
        name: "Cerveza Artesanal",
        description: "IPA local de 330ml, lúpulos cítricos",
        price: 6.0,
        category: "Bebidas",
        emoji: "🍺",
        bgColor: "#fcd34d",
    },
];

export default function DeliveryPage() {
    const router = useRouter();
    const [selectedCategory, setSelectedCategory] = useState<DishCategory>("Todos");
    const [cart, setCart] = useState<CartItem[]>([]);

    const filteredDishes = useMemo(() => {
        if (selectedCategory === "Todos") return MOCK_DISHES;
        return MOCK_DISHES.filter((d) => d.category === selectedCategory);
    }, [selectedCategory]);

    const handleAdd = (dish: Dish) => {
        setCart((prev) => {
            const existing = prev.find((it) => it.dish.id === dish.id);
            if (existing) {
                return prev.map((it) =>
                    it.dish.id === dish.id ? { ...it, quantity: it.quantity + 1 } : it
                );
            }
            return [...prev, { dish, quantity: 1 }];
        });
    };

    const handleIncrement = (dishId: string) => {
        setCart((prev) =>
            prev.map((it) =>
                it.dish.id === dishId ? { ...it, quantity: it.quantity + 1 } : it
            )
        );
    };

    const handleDecrement = (dishId: string) => {
        setCart((prev) =>
            prev
                .map((it) =>
                    it.dish.id === dishId ? { ...it, quantity: it.quantity - 1 } : it
                )
                .filter((it) => it.quantity > 0)
        );
    };

    const handleRemove = (dishId: string) => {
        setCart((prev) => prev.filter((it) => it.dish.id !== dishId));
    };

    const handleCheckout = () => {
        console.log("Proceder al pago", cart);
    };

    const handleComerEnRestaurante = () => {
        router.push("/cliente");
    };

    const handleLogout = () => {
        router.push("/login");
    };

    return (
        <main style={styles.main}>
            <DeliveryHeader
                onComerEnRestaurante={handleComerEnRestaurante}
                onLogout={handleLogout}
            />

            <div style={styles.layout}>
                <div style={styles.menuColumn}>
                    <DeliveryEstimateBanner />

                    <CategoryTabs
                        selected={selectedCategory}
                        onSelect={setSelectedCategory}
                    />

                    <div style={styles.dishGrid}>
                        {filteredDishes.map((dish) => (
                            <DishCard key={dish.id} dish={dish} onAdd={handleAdd} />
                        ))}
                    </div>
                </div>

                <aside style={styles.sidebar}>
                    <OrderCart
                        items={cart}
                        onIncrement={handleIncrement}
                        onDecrement={handleDecrement}
                        onRemove={handleRemove}
                        onCheckout={handleCheckout}
                    />
                    <OngoingOrder />
                </aside>
            </div>
        </main>
    );
}

const styles: { [key: string]: React.CSSProperties } = {
    main: {
        minHeight: "100vh",
        backgroundColor: "#f9fafb",
        display: "flex",
        flexDirection: "column",
    },
    layout: {
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) 360px",
        gap: "1.5rem",
        padding: "1.5rem 2rem",
        alignItems: "flex-start",
    },
    menuColumn: {
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        minWidth: 0,
    },
    dishGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
        gap: "1rem",
    },
    sidebar: {
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        position: "sticky",
        top: "1rem",
    },
};
