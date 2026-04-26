import { Employee, roleColors, statusColors } from '../types/employee';
import { Button } from './ui/Button';
import { Mail, Phone, Clock, Calendar, Pencil, Trash2 } from 'lucide-react';

interface EmployeeCardProps {
    employee: Employee;
    onEdit: (employee: Employee) => void;
    onDelete: (id: string) => void;
}

const formatDate = (dateValue: string | Date): string => {
  if (!dateValue) return 'No registrada';
  
  const dateStr = typeof dateValue === 'string' ? dateValue : dateValue.toISOString();
  const [year, month, day] = dateStr.split('T')[0].split('-');
  
  return `${day}/${month}/${year}`;
};

export function EmployeeCard({ employee, onEdit, onDelete }: EmployeeCardProps) {
    const roleStyle = roleColors[employee.role] || { bg: 'bg-gray-100', text: 'text-gray-700' };
    const statusStyle = statusColors[employee.employmentDetails?.status || 'Activo']
        || { bg: 'bg-gray-500', text: 'text-white' };

    return (
        <div className="rounded-xl border border-gray-200 bg-white shadow hover:shadow-lg transition-shadow">
            <div className="p-6 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <h4 className="text-black md:text-lg font-semibold mb-2">{employee.name}</h4>
                        <div className="flex flex-wrap gap-2">
                            <span className={`inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-medium w-fit ${roleStyle.bg} ${roleStyle.text}`}>
                                {employee.role}
                            </span>
                            <span className={`inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-medium w-fit ${statusStyle.bg} ${statusStyle.text}`}>
                                {employee.employmentDetails?.status || 'Activo'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Contact info */}
                <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                        <Mail className="size-4 flex-shrink-0" />
                        <span className="truncate">{employee.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                        <Phone className="size-4 flex-shrink-0" />
                        <span>{employee.employmentDetails?.phone || 'No registrado'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                        <Clock className="size-4 flex-shrink-0" />
                        <span>{employee.employmentDetails?.shift || 'No asignado'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="size-4 flex-shrink-0" />
                        <span>Desde {formatDate(employee.employmentDetails?.startDate)}</span>
                    </div>
                </div>

                {/* Salary */}
                <div className="pt-3 border-t border-gray-100">
                    <p className="text-sm text-gray-500 mb-1">Salario Mensual</p>
                    <p className="text-gray-700 text-lg font-medium">
                        ${employee.employmentDetails?.salary?.toLocaleString() ?? '0'}
                    </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => onEdit(employee)} className="flex-1">
                        <Pencil className="size-4 mr-2" />
                        Editar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onDelete(employee._id)}>
                        <Trash2 className="size-4 text-red-500" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
