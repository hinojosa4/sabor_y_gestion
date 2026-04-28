import { Button } from '../ui/Button';
import { Users, MapPin, Pencil, Trash2 } from 'lucide-react';

interface Table {
    id: string;
    number: number;
    seats: number;
    location: string;
    status: string;
    xPosition?: number;
    yPosition?: number;
}

interface TableCardProps {
    table: Table;
    onEdit: (table: Table) => void;
    onDelete: (id: string) => void;
}

const getStatusStyle = (status: string) => {
    const styles: Record<string, { bg: string; text: string }> = {
        'Libre': { bg: 'bg-green-100', text: 'text-green-800' },
        'Ocupada': { bg: 'bg-red-100', text: 'text-red-800' },
        'Reservada': { bg: 'bg-yellow-100', text: 'text-yellow-800' },
        'Cuenta solicitada': { bg: 'bg-orange-100', text: 'text-orange-800' },
        'Activa': { bg: 'bg-green-100', text: 'text-green-800' },
        'Inactiva': { bg: 'bg-gray-100', text: 'text-gray-800' },
    };
    return styles[status] || styles['Libre'];
};

export function TableCard({ table, onEdit, onDelete }: TableCardProps) {
    const statusStyle = getStatusStyle(table.status);

    return (
        <div className="rounded-xl border border-gray-200 bg-white shadow hover:shadow-lg transition-shadow">
            <div className="p-4 md:p-6 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                    <h4 className="text-black text-base md:text-lg font-semibold">
                        Mesa {table.number}
                    </h4>
                    <span className={`inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                        {table.status}
                    </span>
                </div>

                {/* Detalles */}
                <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                        <Users className="size-4 flex-shrink-0" />
                        <span>{table.seats} {table.seats === 1 ? 'persona' : 'personas'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                        <MapPin className="size-4 flex-shrink-0" />
                        <span>{table.location}</span>
                    </div>
                </div>

                {/* Acciones */}
                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => onEdit(table)} className="w-full sm:flex-1">
                        <Pencil className="size-4 mr-2" />
                        Editar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onDelete(table.id)} className="w-full sm:w-auto">
                        <Trash2 className="size-4 text-red-500" />
                        <span className="ml-2 text-sm text-red-500 sm:hidden">Eliminar</span>
                    </Button>
                </div>
            </div>
        </div>
    );
}
