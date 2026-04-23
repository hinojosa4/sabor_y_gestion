export type TableStatus = 'Libre' | 'Ocupada' | 'Reservada' | 'Cuenta solicitada';
export type TableLocation = 'Interior - Salón Principal' | 'Interior - Salón VIP' | 'Terraza' | 'Exterior - Jardín' | 'Segundo Piso' | 'Bar';

export interface Table {
    _id: string;
    restaurantId: string;
    number: number;
    capacity: number;
    location: string;
    status: TableStatus;
    xPosition: number;
    yPosition: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateTableDTO {
    restaurantId: string;
    number: number;
    capacity: number;
    location: string;
    status?: TableStatus;
    xPosition?: number;
    yPosition?: number;
}

export interface UpdateTableDTO {
    number?: number;
    capacity?: number;
    location?: string;
    status?: TableStatus;
    xPosition?: number;
    yPosition?: number;
}

export interface TableStats {
    total: number;
    libre: number;
    ocupada: number;
    reservada: number;
    cuentaSolicitada: number;
    totalSeats: number;
    locations: number;
    distributionByLocation: Record<string, number>;
}

export const statusColors: Record<TableStatus, { bg: string; text: string; border: string; planoBg: string; planoBorder: string }> = {
    'Libre': {
        bg: 'bg-green-100',
        text: 'text-green-800',
        border: 'border-green-200',
        planoBg: 'bg-green-500',
        planoBorder: 'border-green-600'
    },
    'Ocupada': {
        bg: 'bg-red-100',
        text: 'text-red-800',
        border: 'border-red-200',
        planoBg: 'bg-red-500',
        planoBorder: 'border-red-600'
    },
    'Reservada': {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        border: 'border-yellow-200',
        planoBg: 'bg-yellow-500',
        planoBorder: 'border-yellow-600'
    },
    'Cuenta solicitada': {
        bg: 'bg-orange-100',
        text: 'text-orange-800',
        border: 'border-orange-200',
        planoBg: 'bg-orange-500',
        planoBorder: 'border-orange-600'
    },
};

export const PREDEFINED_LOCATIONS: TableLocation[] = [
    'Interior - Salón Principal',
    'Interior - Salón VIP',
    'Terraza',
    'Exterior - Jardín',
    'Segundo Piso',
    'Bar'
];
