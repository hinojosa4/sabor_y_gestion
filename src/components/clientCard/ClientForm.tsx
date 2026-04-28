// src/components/clientCard/ClientForm.tsx
import { useState } from 'react';
import { Button } from '../ui/Button';
import { X } from 'lucide-react';
import { Client } from '@/types/client';

interface ClientFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (client: Partial<Client>) => void;
    client?: Client | null;
}

export function ClientForm({ isOpen, onClose, onSubmit, client }: ClientFormProps) {
    const [formData, setFormData] = useState({
        activo: client?.activo ?? true,
        loyaltyPoints: client?.loyaltyPoints ?? 0
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            _id: client?._id,
            activo: formData.activo,
            loyaltyPoints: formData.loyaltyPoints
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-center p-4 md:p-10 overflow-y-auto">
            <div className="fixed inset-0 bg-black/50" onClick={onClose} />

            <div className="relative bg-white rounded-lg shadow-lg w-full max-w-lg h-fit max-h-full overflow-hidden flex flex-col my-auto">
                <div className="px-6 py-4 border-b sticky top-0 bg-white z-10">
                    <button
                        type="button"
                        onClick={onClose}
                        className="absolute top-4 right-4 rounded-md p-1 hover:bg-gray-100 transition-colors"
                    >
                        <X className="size-5 text-gray-500 hover:text-gray-700" />
                    </button>
                    <h2 className="text-lg font-semibold text-black">
                        Editar Cliente
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Actualiza la información del cliente
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                    {/* Información básica (solo lectura) */}
                    <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                        <p className="text-sm text-gray-500">Nombre</p>
                        <p className="text-black font-medium">{client?.name}</p>
                        
                        <p className="text-sm text-gray-500 mt-2">Email</p>
                        <p className="text-black font-medium">{client?.email}</p>
                        
                        <p className="text-sm text-gray-500 mt-2">Cliente desde</p>
                        <p className="text-black font-medium">
                            {client?.createdAt ? new Date(client.createdAt).toLocaleDateString('es-BO') : '-'}
                        </p>
                    </div>

                    {/* Estado */}
                    <div>
                        <label className="text-black font-bold mb-1 block">
                            Estado
                        </label>
                        <select
                            value={formData.activo ? 'activo' : 'inactivo'}
                            onChange={(e) => setFormData(prev => ({ ...prev, activo: e.target.value === 'activo' }))}
                            className="w-full min-w-0 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none transition-all focus:border-gray-500 focus:ring-2 focus:ring-gray-500/30"
                        >
                            <option value="activo">Activo</option>
                            <option value="inactivo">Inactivo</option>
                        </select>
                    </div>

                    {/* Puntos de Lealtad */}
                    <div>
                        <label className="text-black font-bold mb-1 block">
                            Puntos de Lealtad
                        </label>
                        <input
                            type="number"
                            value={formData.loyaltyPoints}
                            onChange={(e) => setFormData(prev => ({ ...prev, loyaltyPoints: parseInt(e.target.value) || 0 }))}
                            min="0"
                            step="10"
                            className="w-full min-w-0 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition-all focus:border-gray-500 focus:ring-2 focus:ring-gray-500/30"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                            Puntos acumulados por compras (100 puntos = 1 Bs de descuento)
                        </p>
                    </div>

                    {/* Botones */}
                    <div className="flex gap-3 pt-4">
                        <Button type="button" onClick={onClose} variant="outline" className="flex-1">
                            Cancelar
                        </Button>
                        <Button type="submit" className="flex-1 bg-gray-800 hover:bg-gray-700 text-white">
                            Guardar Cambios
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}