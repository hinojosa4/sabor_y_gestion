"use client";

import React, { useState } from "react";
import { ClientHeader } from "@/components/clientScreen/ClientHeader";
import { ClientInfoCard, ClientStats } from "@/components/clientScreen/ClientInfoCard";
import { ConsumoHistory } from "@/components/clientScreen/ConsumoHistory";
import { OrderModal } from "@/components/clientScreen/OrderModal";
import { Order } from "@/components/clientScreen/OrderCard";

const MOCK_CLIENT: ClientStats = {
    name: "Cliente",
    memberSince: "marzo de 2026",
    totalVisits: 3,
    totalSpent: 245.5,
    average: 81.83,
    points: 245,
    isNew: true,
    benefits: [
        "Bienvenida especial",
        "5% descuento en tu próxima visita",
        "Bebida de cortesía",
    ],
};

const MOCK_ORDERS: Order[] = [
    {
        id: "1001",
        date: "jueves, 2 de abril de 2026",
        time: "19:45",
        location: "Mesa 12",
        waiter: "Miguel Santos",
        paymentMethod: "Tarjeta de Crédito",
        status: "Completado",
        items: [
            { name: "Filete de Res", quantity: 2, unitPrice: 45.0 },
            { name: "Ensalada César", quantity: 2, unitPrice: 12.5 },
            { name: "Vino Tinto Copa", quantity: 2, unitPrice: 18.0 },
            { name: "Tiramisú", quantity: 2, unitPrice: 8.5 },
        ],
        total: 156.5,
    },
    {
        id: "1002",
        date: "viernes, 27 de marzo de 2026",
        time: "14:30",
        location: "Mesa 5",
        waiter: "Ana Pérez",
        paymentMethod: "Efectivo",
        status: "Completado",
        items: [
            { name: "Pollo a la Parrilla", quantity: 1, unitPrice: 28.0 },
            { name: "Sopa del Día", quantity: 1, unitPrice: 9.0 },
            { name: "Limonada", quantity: 2, unitPrice: 6.0 },
            { name: "Flan Casero", quantity: 1, unitPrice: 7.0 },
        ],
        total: 89.0,
    },
    {
        id: "1003",
        date: "jueves, 19 de marzo de 2026",
        time: "20:15",
        location: "Mesa 8",
        waiter: "Carlos Ruiz",
        paymentMethod: "Tarjeta de Débito",
        status: "Completado",
        items: [
            { name: "Pasta Carbonara", quantity: 2, unitPrice: 22.0 },
            { name: "Ensalada Mixta", quantity: 1, unitPrice: 10.5 },
            { name: "Cerveza Artesanal", quantity: 3, unitPrice: 8.0 },
            { name: "Cheesecake", quantity: 1, unitPrice: 9.0 },
        ],
        total: 125.5,
    },
];

export default function ClientePage() {
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [modalOpen, setModalOpen] = useState(false);

    const handleViewOrder = (order: Order) => {
        setSelectedOrder(order);
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setTimeout(() => setSelectedOrder(null), 200);
    };

    return (
        <main style={styles.main}>
            <ClientHeader
                onDelivery={() => console.log("Pedir Delivery")}
                onLogout={() => console.log("Salir")}
            />

            <ClientInfoCard data={MOCK_CLIENT} />

            <ConsumoHistory orders={MOCK_ORDERS} onViewOrder={handleViewOrder} />

            <OrderModal
                order={selectedOrder}
                open={modalOpen}
                onClose={handleCloseModal}
                onReorder={(o) => console.log("Volver a pedir", o.id)}
            />
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
};
