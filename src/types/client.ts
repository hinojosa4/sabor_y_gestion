export interface Client {
    _id: string;
    name: string;
    email: string;
    rol: string;
    activo: boolean;
    createdAt: string;
    loyaltyPoints?: number;
}