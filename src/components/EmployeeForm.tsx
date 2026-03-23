import { useState, useEffect } from 'react';
import { Empleado, Role, EmployeeStatus, WorkShift } from '../types/empleado';
import { Button } from './ui/Button';
import { X } from 'lucide-react';

interface EmployeeFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (employee: Omit<Empleado, '_id' | 'createdAt'> | Empleado) => void;
    employee?: Empleado | null;
}

const roleOptions: Role[] = ['Mesero', 'Chef', 'Cajero', 'Ayudante de Cocina', 'Barista'];
const statusOptions: EmployeeStatus[] = ['Activo', 'Vacaciones', 'Inactivo'];
const shiftOptions: WorkShift[] = ['Turno Mañana', 'Turno Tarde', 'Turno Completo'];

export function EmployeeForm({ isOpen, onClose, onSubmit, employee }: EmployeeFormProps) {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        role: 'Mesero' as Role,
        status: 'Activo' as EmployeeStatus,
        shift: 'Turno Mañana' as WorkShift,
        startDate: '',
        salary: '',
    });

    useEffect(() => {
        if (employee) {
            setFormData({
                name: employee.name,
                email: employee.email,
                phone: employee.phone,
                role: employee.role,
                status: employee.status,
                shift: employee.shift,
                startDate: employee.startDate,
                salary: employee.salary.toString(),
            });
        } else {
            setFormData({
                name: '',
                email: '',
                phone: '',
                role: 'Mesero',
                status: 'Activo',
                shift: 'Turno Mañana',
                startDate: new Date().toLocaleDateString('es-ES'),
                salary: '',
            });
        }
    }, [employee, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const dataToSubmit = {
            ...formData,
            salary: Number(formData.salary),
        };
        if (employee) {
            onSubmit({ ...dataToSubmit, _id: employee._id });
        } else {
            onSubmit(dataToSubmit);
        }
        onClose();
    };

    const handleChange = (field: string, value: string | number) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/50" onClick={onClose} />
            <div className="relative bg-white rounded-lg shadow-lg w-full max-w-lg">
                <div className="px-6 py-4 border-b">
                    <button
                        type="button"
                        onClick={onClose}
                        className="absolute top-4 right-4 rounded-md p-1 hover:bg-gray-100 transition-colors"
                    >
                        <X className="size-4" />
                    </button>
                    <h2 className="text-lg font-semibold text-black">
                        {employee ? 'Editar Empleado' : 'Agregar Nuevo Personal'}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        {employee ? 'Actualiza los datos del empleado' : 'Completa la información del nuevo miembro del equipo'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="text-black font-bold peer-disabled:cursor-not-allowed mb-1">
                            Nombre Completo
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => handleChange('name', e.target.value)}
                            placeholder="Juan Pérez"
                            className="w-full min-w-0 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:border-grey-500 focus:ring-2 focus:ring-dark-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                            required
                        />
                    </div>

                    <div>
                        <label className="text-black font-bold peer-disabled:cursor-not-allowed mb-1">
                            Rol
                        </label>
                        <select
                            value={formData.role}
                            onChange={(e) => handleChange('role', e.target.value as Role)}
                            className="w-full min-w-0 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:border-grey-500 focus:ring-2 focus:ring-dark-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {roleOptions.map(role => (
                                <option key={role} value={role}>{role}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-black font-bold peer-disabled:cursor-not-allowed mb-1">
                            Email
                        </label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => handleChange('email', e.target.value)}
                            placeholder="correo@ejemplo.com"
                            className="w-full min-w-0 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:border-grey-500 focus:ring-2 focus:ring-dark-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                            required
                        />
                    </div>

                    <div>
                        <label className="text-black font-bold peer-disabled:cursor-not-allowed mb-1">
                            Teléfono
                        </label>
                        <input
                            type="number"
                            value={formData.phone}
                            onChange={(e) => handleChange('phone', e.target.value)}
                            placeholder="555-0000"
                            className="w-full min-w-0 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:border-grey-500 focus:ring-2 focus:ring-dark-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                            required
                        />
                    </div>

                    <div>
                        <label className="text-black font-bold peer-disabled:cursor-not-allowed mb-1">
                            Turno
                        </label>
                        <select
                            value={formData.shift}
                            onChange={(e) => handleChange('shift', e.target.value as WorkShift)}
                            className="w-full min-w-0 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:border-grey-500 focus:ring-2 focus:ring-dark-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {shiftOptions.map(shift => (
                                <option key={shift} value={shift}>{shift}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-black font-bold peer-disabled:cursor-not-allowed mb-1">
                            Salario Mensual
                        </label>
                        <input
                            type="number"
                            value={formData.salary}
                            onChange={(e) => handleChange('salary', Number(e.target.value))}
                            placeholder="1500"
                            min="0"
                            className="w-full min-w-0 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:border-grey-500 focus:ring-2 focus:ring-dark-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                            required
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button
                            type="button"
                            onClick={onClose}
                            variant="outline"
                            className="flex-1 focus:bg-gray-50"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1 px-4 py-2 text-white rounded-md text-sm font-medium hover:bg-grey-700 transition-colors"
                        >
                            {employee ? 'Guardar Cambios' : 'Agregar Personal'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
