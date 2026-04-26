// components/TableFormModal.tsx - Versión corregida con capacity
/* eslint-disable react-hooks/set-state-in-effect */  // ✅ Agregar al inicio

import { useState, useEffect, useCallback } from 'react';  // ✅ Agregar useCallback
import { Button } from './ui/Button';
import { X } from 'lucide-react';
import { TableStatus, statusColors, Table } from '@/types/table';

// ✅ Usar Partial<Table> directamente
interface TableFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (tableData: Partial<Table>) => void;
    table?: Partial<Table> | null;
    existingTables?: Partial<Table>[];
}

// Ubicaciones predefinidas
const locationOptions = [
    'Interior - Salón Principal',
    'Interior - Salón VIP',
    'Terraza',
    'Exterior - Jardín',
    'Segundo Piso',
    'Bar'
];

const statusOptions: TableStatus[] = ['Libre', 'Ocupada', 'Reservada', 'Cuenta solicitada'];

interface FormErrors {
    number?: string;
    capacity?: string;
    location?: string;
    status?: string;
    xPosition?: string;
    yPosition?: string;
}

export function TableFormModal({ isOpen, onClose, onSubmit, table, existingTables = [] }: TableFormModalProps) {
    const [formData, setFormData] = useState({
        number: '',
        capacity: 2,
        location: locationOptions[0],
        customLocation: '',
        status: 'Libre' as TableStatus,
        xPosition: 50,
        yPosition: 50
    });

    const [errors, setErrors] = useState<FormErrors>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    // ✅ Envolver getNextTableNumber en useCallback para evitar recreaciones
    const getNextTableNumber = useCallback((): number => {
        if (!existingTables || existingTables.length === 0) return 1;

        const numbers = existingTables
            .map(t => Number(t.number))
            .filter(n => !isNaN(n))
            .sort((a, b) => a - b);

        let nextNumber = 1;
        for (let i = 0; i < numbers.length; i++) {
            if (numbers[i] > nextNumber) {
                break;
            }
            nextNumber = numbers[i] + 1;
        }

        return nextNumber;
    }, [existingTables]);

    const validateForm = (): boolean => {
        const newErrors: FormErrors = {};

        if (!formData.number.toString().trim()) {
            newErrors.number = 'El número de mesa es obligatorio';
        } else if (isNaN(Number(formData.number))) {
            newErrors.number = 'El número de mesa debe ser un valor numérico';
        } else if (Number(formData.number) < 1) {
            newErrors.number = 'El número de mesa debe ser mayor a 0';
        }

        if (formData.capacity < 1) {
            newErrors.capacity = 'La capacidad debe ser al menos 1 persona';
        } else if (formData.capacity > 20) {
            newErrors.capacity = 'La capacidad no puede superar las 20 personas';
        }

        if (!formData.location && !formData.customLocation.trim()) {
            newErrors.location = 'Debes seleccionar o escribir una ubicación';
        }

        if (formData.xPosition < 0 || formData.xPosition > 100) {
            newErrors.xPosition = 'La posición X debe estar entre 0 y 100';
        }

        if (formData.yPosition < 0 || formData.yPosition > 100) {
            newErrors.yPosition = 'La posición Y debe estar entre 0 y 100';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    useEffect(() => {
        if (table) {
            setFormData({
                number: table.number?.toString() || '',
                capacity: table.capacity !== undefined ? table.capacity : 2,
                location: table.location && locationOptions.includes(table.location) ? table.location : '',
                customLocation: table.location && !locationOptions.includes(table.location) ? table.location : '',
                status: table.status || 'Libre',
                xPosition: table.xPosition ?? 50,
                yPosition: table.yPosition ?? 50
            });
        } else if (isOpen) {
            const nextNumber = getNextTableNumber();
            setFormData({
                number: nextNumber.toString(),
                capacity: 2,
                location: locationOptions[0],
                customLocation: '',
                status: 'Libre',
                xPosition: 50,
                yPosition: 50
            });
        } else {
            setFormData({
                number: '',
                capacity: 2,
                location: locationOptions[0],
                customLocation: '',
                status: 'Libre',
                xPosition: 50,
                yPosition: 50
            });
        }
        setErrors({});
        setTouched({});
    }, [table, isOpen, getNextTableNumber]);  // ✅ Agregar getNextTableNumber a las dependencias

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        const finalLocation = formData.customLocation.trim() || formData.location;
        const numberValue = formData.number ? Number(formData.number) : 0;

        if (table) {
            onSubmit({
                ...table,
                number: numberValue,
                capacity: formData.capacity,
                location: finalLocation,
                status: formData.status,
                xPosition: formData.xPosition,
                yPosition: formData.yPosition
            });
        } else {
            onSubmit({
                number: numberValue,
                capacity: formData.capacity,
                location: finalLocation,
                status: formData.status,
                xPosition: formData.xPosition,
                yPosition: formData.yPosition
            });
        }
        onClose();
    };

    const handleChange = (field: string, value: string | number) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setTouched(prev => ({ ...prev, [field]: true }));
        if (field in errors) {
            setErrors(prev => ({ ...prev, [field as keyof FormErrors]: undefined }));
        }
    };

    const getFieldError = (field: string): string | undefined => {
        return touched[field] ? errors[field as keyof FormErrors] : undefined;
    };

    const currentStatusStyle = statusColors[formData.status] || statusColors['Libre'];

    if (!isOpen) return null;

    return (
        // ... el resto del JSX se mantiene igual
        <div className="fixed inset-0 z-50 flex justify-center p-4 md:p-10 overflow-y-auto">
            <div className="fixed inset-0 bg-black/50" onClick={onClose} />

            <div className="relative bg-white rounded-lg shadow-lg w-full max-w-lg h-fit max-h-full overflow-hidden flex flex-col my-auto">
                <div className="px-6 py-4 border-b sticky top-0 bg-white z-10">
                    <button
                        type="button"
                        onClick={onClose}
                        className="absolute top-4 right-4 rounded-md p-1 hover:bg-gray-100 transition-colors"
                    >
                        <X className="size-5 text-gray-500 hover:text-gray-700 transition-colors" />
                    </button>
                    <h2 className="text-lg font-semibold text-black">
                        {table ? 'Editar Mesa' : 'Agregar Nueva Mesa'}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        {table ? 'Actualiza los datos de la mesa' : 'Completa la información de la nueva mesa'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                    {/* Número de Mesa */}
                    <div>
                        <label className="text-black font-bold mb-1 block">
                            Número de Mesa <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            value={formData.number}
                            onChange={(e) => handleChange('number', parseInt(e.target.value) || '')}
                            onBlur={() => setTouched(prev => ({ ...prev, number: true }))}
                            placeholder="Ej: 11"
                            min={1}
                            className={`w-full min-w-0 rounded-md border px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:ring-2 ${getFieldError('number')
                                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
                                : 'border-gray-300 focus:border-gray-500 focus:ring-gray-500/30'
                                }`}
                            required
                        />
                        {getFieldError('number') && (
                            <p className="text-red-500 text-xs mt-1">{getFieldError('number')}</p>
                        )}
                    </div>

                    {/* Capacidad */}
                    <div>
                        <label className="text-black font-bold mb-1 block">
                            Capacidad (Personas) <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            value={formData.capacity}
                            onChange={(e) => handleChange('capacity', parseInt(e.target.value) || 0)}
                            onBlur={() => setTouched(prev => ({ ...prev, capacity: true }))}
                            min={1}
                            max={20}
                            className={`w-full min-w-0 rounded-md border px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:ring-2 ${getFieldError('capacity')
                                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
                                : 'border-gray-300 focus:border-gray-500 focus:ring-gray-500/30'
                                }`}
                            required
                        />
                        {getFieldError('capacity') && (
                            <p className="text-red-500 text-xs mt-1">{getFieldError('capacity')}</p>
                        )}
                    </div>

                    {/* Selector de Estado - SOLO visible en edición */}
                    {table && (
                        <div>
                            <label className="text-black font-bold mb-1 block">
                                Estado <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.status}
                                onChange={(e) => handleChange('status', e.target.value as TableStatus)}
                                className={`w-full min-w-0 rounded-md border px-3 py-2 text-sm outline-none transition-all focus:ring-2 ${currentStatusStyle.bg} ${currentStatusStyle.text} ${currentStatusStyle.border}`}
                            >
                                {statusOptions.map((option) => (
                                    <option key={option} value={option} className="text-black">
                                        {option}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Ubicación - Selector */}
                    <div>
                        <label className="text-black font-bold mb-1 block">
                            Ubicación
                        </label>
                        <select
                            value={formData.location}
                            onChange={(e) => handleChange('location', e.target.value)}
                            className="w-full min-w-0 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none transition-all focus:border-gray-500 focus:ring-2 focus:ring-gray-500/30"
                        >
                            {locationOptions.map(loc => (
                                <option key={loc} value={loc}>{loc}</option>
                            ))}
                        </select>
                    </div>

                    {/* Ubicación Personalizada */}
                    <div>
                        <label className="text-black font-bold mb-1 block">
                            O escribe una ubicación personalizada:
                        </label>
                        <input
                            type="text"
                            value={formData.customLocation}
                            onChange={(e) => handleChange('customLocation', e.target.value)}
                            onBlur={() => setTouched(prev => ({ ...prev, location: true }))}
                            placeholder="Ej: Patio trasero, Área privada..."
                            className={`w-full min-w-0 rounded-md border px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:ring-2 ${getFieldError('location')
                                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
                                : 'border-gray-300 focus:border-gray-500 focus:ring-gray-500/30'
                                }`}
                        />
                        {getFieldError('location') && (
                            <p className="text-red-500 text-xs mt-1">{getFieldError('location')}</p>
                        )}
                    </div>

                    {/* Posición en el Plano */}
                    <div className="border-t pt-4">
                        <label className="text-black font-bold mb-2 block">
                            Posición en el Plano (opcional)
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-gray-600 mb-1 block">
                                    Posición X (%)
                                </label>
                                <input
                                    type="number"
                                    value={formData.xPosition}
                                    onChange={(e) => handleChange('xPosition', parseInt(e.target.value) || 0)}
                                    onBlur={() => setTouched(prev => ({ ...prev, xPosition: true }))}
                                    min={0}
                                    max={100}
                                    className={`w-full min-w-0 rounded-md border px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:ring-2 ${getFieldError('xPosition')
                                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
                                        : 'border-gray-300 focus:border-gray-500 focus:ring-gray-500/30'
                                        }`}
                                />
                                {getFieldError('xPosition') && (
                                    <p className="text-red-500 text-xs mt-1">{getFieldError('xPosition')}</p>
                                )}
                            </div>
                            <div>
                                <label className="text-xs text-gray-600 mb-1 block">
                                    Posición Y (%)
                                </label>
                                <input
                                    type="number"
                                    value={formData.yPosition}
                                    onChange={(e) => handleChange('yPosition', parseInt(e.target.value) || 0)}
                                    onBlur={() => setTouched(prev => ({ ...prev, yPosition: true }))}
                                    min={0}
                                    max={100}
                                    className={`w-full min-w-0 rounded-md border px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:ring-2 ${getFieldError('yPosition')
                                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
                                        : 'border-gray-300 focus:border-gray-500 focus:ring-gray-500/30'
                                        }`}
                                />
                                {getFieldError('yPosition') && (
                                    <p className="text-red-500 text-xs mt-1">{getFieldError('yPosition')}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Botones */}
                    <div className="flex gap-3 pt-4">
                        <Button
                            type="button"
                            onClick={onClose}
                            variant="outline"
                            className="flex-1"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1 px-4 py-2 text-white rounded-md text-sm font-medium bg-gray-800 hover:bg-gray-700 transition-colors"
                        >
                            {table ? 'Guardar Cambios' : 'Agregar Mesa'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}