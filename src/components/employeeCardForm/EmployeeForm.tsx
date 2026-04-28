import { useState } from 'react';
import { Employee, Role, EmployeeStatus, WorkShift } from '../../types/employee';
import { Button } from '../ui/Button';
import { X } from 'lucide-react';

interface EmployeeFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (employee: Omit<Employee, '_id' | 'createdAt' | 'updatedAt'> | Employee) => void;
  employee?: Employee | null;
  restaurantId?: string;
}

const roleOptions: Role[] = ['admin', 'manager', 'waiter', 'chef', 'driver'];
const shiftOptions: WorkShift[] = ['Turno Mañana', 'Turno Tarde', 'Turno Completo'];
const roleLabels: Record<Role, string> = {
  'admin': 'Administrador',
  'manager': 'Gerente',
  'waiter': 'Mesero',
  'chef': 'Chef',
  'driver': 'Conductor'
};

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  phone?: string;
  salary?: string;
  startDate?: string;
}

export function EmployeeForm({ isOpen, onClose, onSubmit, employee, restaurantId }: EmployeeFormProps) {
  // Inicializamos el estado usando los datos del 'employee' si existe (Edición)
  // o valores vacíos si es null (Creación).
  const [formData, setFormData] = useState({
    name: employee?.name || '',
    email: employee?.email || '',
    password: '',
    role: (employee?.role as Role) || 'waiter',
    employmentDetails: {
      phone: employee?.employmentDetails?.phone || '',
      shift: (employee?.employmentDetails?.shift as WorkShift) || 'Turno Mañana',
      startDate: employee?.employmentDetails?.startDate 
        ? (typeof employee.employmentDetails.startDate === 'string' 
            ? employee.employmentDetails.startDate.split('T')[0] 
            : new Date(employee.employmentDetails.startDate).toISOString().split('T')[0])
        : new Date().toISOString().split('T')[0],
      salary: employee?.employmentDetails?.salary || 0,
      status: (employee?.employmentDetails?.status as EmployeeStatus) || 'Activo'
    }
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es obligatorio';
    } else if (formData.name.length < 2) {
      newErrors.name = 'El nombre debe tener al menos 2 caracteres';
    } else if (formData.name.length > 100) {
      newErrors.name = 'El nombre no puede superar los 100 caracteres';
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'El email es obligatorio';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'El email no tiene un formato válido';
    }

    if (!employee && !formData.password) {
      newErrors.password = 'La contraseña es obligatoria';
    } else if (!employee && formData.password.length < 8) {
      newErrors.password = 'La contraseña debe tener al menos 8 caracteres';
    }

    const phoneRegex = /^[0-9]{8,15}$/;
    if (!formData.employmentDetails.phone.trim()) {
      newErrors.phone = 'El teléfono es obligatorio';
    } else if (!phoneRegex.test(formData.employmentDetails.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'El teléfono debe tener entre 8 y 15 dígitos';
    }

    if (formData.employmentDetails.salary <= 0) {
      newErrors.salary = 'El salario debe ser mayor a 0';
    } else if (formData.employmentDetails.salary > 100000) {
      newErrors.salary = 'El salario no puede superar los 100,000';
    }

    if (!formData.employmentDetails.startDate) {
      newErrors.startDate = 'La fecha de inicio es obligatoria';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /*useEffect(() => {
  // Solo ejecutamos la lógica si el modal está abierto
  if (!isOpen) return;

  if (employee) {
    setFormData({
      name: employee.name,
      email: employee.email,
      password: '',
      role: employee.role,
      employmentDetails: {
        phone: employee.employmentDetails.phone,
        shift: employee.employmentDetails.shift,
        startDate: typeof employee.employmentDetails.startDate === 'string'
          ? employee.employmentDetails.startDate.split('T')[0]
          : new Date(employee.employmentDetails.startDate).toISOString().split('T')[0],
        salary: employee.employmentDetails.salary,
        status: employee.employmentDetails.status
      }
    });
  } else {
    // Resetear a valores iniciales si no hay empleado (creación nueva)
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'waiter',
      employmentDetails: {
        phone: '',
        shift: 'Turno Mañana',
        startDate: new Date().toISOString().split('T')[0],
        salary: 0,
        status: 'Activo'
      }
    });
  }
  
}, [employee, isOpen]);*/

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    if (employee) {
      onSubmit({
        ...employee,
        name: formData.name,
        email: formData.email,
        role: formData.role,
        employmentDetails: {
          phone: formData.employmentDetails.phone,
          shift: formData.employmentDetails.shift,
          startDate: formData.employmentDetails.startDate,
          salary: formData.employmentDetails.salary,
          status: formData.employmentDetails.status
        }
      });
    } else {
      if (!restaurantId) {
        console.error('restaurantId es requerido para crear un empleado');
        return;
      }

      onSubmit({
        restaurantId,
        name: formData.name,
        email: formData.email,
        password_hash: formData.password,
        role: formData.role,
        isActive: true,
        employmentDetails: {
          phone: formData.employmentDetails.phone,
          shift: formData.employmentDetails.shift,
          startDate: formData.employmentDetails.startDate,
          salary: formData.employmentDetails.salary,
          status: formData.employmentDetails.status
        }
      });
    }
    onClose();
  };

  const handleChange = (field: string, value: string | number) => {
    if (field === 'name' || field === 'email' || field === 'password' || field === 'role') {
      setFormData(prev => ({ ...prev, [field]: value }));
    } else {
      setFormData(prev => ({
        ...prev,
        employmentDetails: { ...prev.employmentDetails, [field]: value }
      }));
    }

    setTouched(prev => ({ ...prev, [field]: true }));

    if (field in errors) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const getFieldError = (field: string): string | undefined => {
    return touched[field] ? errors[field as keyof FormErrors] : undefined;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-center p-4 md:p-10 overflow-y-auto">
      {/* Fondo oscuro */}
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
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
            {employee ? 'Editar Empleado' : 'Agregar Nuevo Personal'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {employee ? 'Actualiza los datos del empleado' : 'Completa la información del nuevo miembro del equipo'}
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {/* Nombre */}
          <div>
            <label className="text-black font-bold mb-1 block">
              Nombre Completo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              onBlur={() => setTouched(prev => ({ ...prev, name: true }))}
              placeholder="Juan Pérez"
              className={`w-full min-w-0 rounded-md border px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${getFieldError('name')
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
                : 'border-gray-300 focus:border-gray-500 focus:ring-gray-500/30'
                }`}
              required
            />
            {getFieldError('name') && (
              <p className="text-red-500 text-xs mt-1">{getFieldError('name')}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="text-black font-bold mb-1 block">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              onBlur={() => setTouched(prev => ({ ...prev, email: true }))}
              placeholder="correo@ejemplo.com"
              className={`w-full min-w-0 rounded-md border px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${getFieldError('email')
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
                : 'border-gray-300 focus:border-gray-500 focus:ring-gray-500/30'
                }`}
              required
            />
            {getFieldError('email') && (
              <p className="text-red-500 text-xs mt-1">{getFieldError('email')}</p>
            )}
          </div>

          {/* Contraseña (solo para nuevos empleados) */}
          {!employee && (
            <div>
              <label className="text-black font-bold mb-1 block">
                Contraseña <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                onBlur={() => setTouched(prev => ({ ...prev, password: true }))}
                placeholder="Mínimo 8 caracteres"
                className={`w-full min-w-0 rounded-md border px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:ring-2 ${getFieldError('password')
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
                  : 'border-gray-300 focus:border-gray-500 focus:ring-gray-500/30'
                  }`}
                required
              />
              {getFieldError('password') && (
                <p className="text-red-500 text-xs mt-1">{getFieldError('password')}</p>
              )}
            </div>
          )}

          {/* Rol */}
          <div>
            <label className="text-black font-bold mb-1 block">
              Rol <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.role}
              onChange={(e) => handleChange('role', e.target.value as Role)}
              className="w-full min-w-0 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none transition-all focus:border-gray-500 focus:ring-2 focus:ring-gray-500/30"
              required
            >
              {roleOptions.map(role => (
                <option key={role} value={role}>{roleLabels[role]}</option>
              ))}
            </select>
          </div>

          {/* Teléfono */}
          <div>
            <label className="text-black font-bold mb-1 block">
              Teléfono <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={formData.employmentDetails.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              onBlur={() => setTouched(prev => ({ ...prev, phone: true }))}
              placeholder="12345678"
              className={`w-full min-w-0 rounded-md border px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:ring-2 ${getFieldError('phone')
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
                : 'border-gray-300 focus:border-gray-500 focus:ring-gray-500/30'
                }`}
              required
            />
            {getFieldError('phone') && (
              <p className="text-red-500 text-xs mt-1">{getFieldError('phone')}</p>
            )}
          </div>

          {/* Turno */}
          <div>
            <label className="text-black font-bold mb-1 block">
              Turno <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.employmentDetails.shift}
              onChange={(e) => handleChange('shift', e.target.value as WorkShift)}
              className="w-full min-w-0 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none transition-all focus:border-gray-500 focus:ring-2 focus:ring-gray-500/30"
              required
            >
              {shiftOptions.map(shift => (
                <option key={shift} value={shift}>{shift}</option>
              ))}
            </select>
          </div>

          {/* Fecha de Inicio */}
          <div>
            <label className="text-black font-bold mb-1 block">
              Fecha de Inicio <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.employmentDetails.startDate}
              onChange={(e) => handleChange('startDate', e.target.value)}
              onBlur={() => setTouched(prev => ({ ...prev, startDate: true }))}
              className={`w-full min-w-0 rounded-md border px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:ring-2 ${getFieldError('startDate')
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
                : 'border-gray-300 focus:border-gray-500 focus:ring-gray-500/30'
                }`}
              required
            />
            {getFieldError('startDate') && (
              <p className="text-red-500 text-xs mt-1">{getFieldError('startDate')}</p>
            )}
          </div>

          {/* Salario */}
          <div>
            <label className="text-black font-bold mb-1 block">
              Salario Mensual (USD) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              {/* Símbolo de moneda visual */}
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none">
                $
              </span>

              <input
                type="number"
                value={formData.employmentDetails.salary || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "") return handleChange('salary', '');

                  const num = parseFloat(val);
                  if (num >= 0 && num <= 20000) {
                    handleChange('salary', val);
                  }
                }}
                onBlur={() => setTouched(prev => ({ ...prev, salary: true }))}
                placeholder="0.00"
                min="0"
                max="20000"
                step="0.01"
                className={`w-full min-w-0 rounded-md border pl-7 pr-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:ring-2 ${getFieldError('salary')
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
                  : 'border-gray-300 focus:border-gray-500 focus:ring-gray-500/30'
                  }`}
                required
              />
            </div>

            {getFieldError('salary') && (
              <p className="text-red-500 text-xs mt-1">{getFieldError('salary')}</p>
            )}

            {/* Ayuda visual opcional para confirmar el monto */}
            {formData.employmentDetails.salary > 0 && (
              <p className="text-[10px] text-gray-400 mt-1 italic">
                Monto: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(formData.employmentDetails.salary)}
              </p>
            )}
          </div>

          {/* Estado (solo visible en edición) */}
          {employee && (
            <div>
              <label className="text-black font-bold mb-1 block">
                Estado
              </label>
              <select
                value={formData.employmentDetails.status}
                onChange={(e) => handleChange('status', e.target.value as EmployeeStatus)}
                className="w-full min-w-0 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none transition-all focus:border-gray-500 focus:ring-2 focus:ring-gray-500/30"
              >
                <option value="Activo">Activo</option>
                <option value="Vacaciones">Vacaciones</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>
          )}

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
              {employee ? 'Guardar Cambios' : 'Agregar Personal'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
