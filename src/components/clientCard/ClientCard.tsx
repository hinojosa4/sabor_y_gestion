import { Mail, Calendar, User, Pencil, Trash2 } from "lucide-react";
import { Button } from "../ui/Button";

interface Client {
    _id: string;
    name: string;
    email: string;
    rol: string;
    activo: boolean;
    createdAt: string;
}

interface ClientCardProps {
    client: Client;
    onEdit: (client: Client) => void;
    onDelete: (id: string) => void;
}

const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("es-BO");
};

export function ClientCard({
    client,
    onEdit,
    onDelete,
}: ClientCardProps) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white shadow hover:shadow-lg transition-shadow">
            <div className="p-6 space-y-4">

                {/* Header */}
                <div>
                    <h4 className="text-lg font-semibold text-black">
                        {client.name}
                    </h4>

                    <span
                        className={`inline-flex mt-2 rounded-md px-2 py-1 text-xs font-medium ${client.activo
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                    >
                        {client.activo ? "Activo" : "Inactivo"}
                    </span>
                </div>

                {/* Info */}
                <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                        <Mail className="size-4" />
                        {client.email}
                    </div>

                    <div className="flex items-center gap-2">
                        <User className="size-4" />
                        {client.rol}
                    </div>

                    <div className="flex items-center gap-2">
                        <Calendar className="size-4" />
                        Desde {formatDate(client.createdAt)}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => onEdit(client)}
                    >
                        <Pencil className="size-4 mr-2" />
                        Editar
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(client._id)}
                    >
                        <Trash2 className="size-4 text-red-500" />
                    </Button>
                </div>
            </div>
        </div>
    );
}