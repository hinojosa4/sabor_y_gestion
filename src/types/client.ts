// types/client.ts
export interface Client {
    _id: string;
    name: string;
    email: string;
    rol: string;
    activo: boolean;
    createdAt: string;
    loyaltyPoints?: number;
    loyaltyTier?: {
        name: string;
        discountPercent: number;
        totalPaidOrders?: number;
        totalSpent?: number;
    } | null;
}
