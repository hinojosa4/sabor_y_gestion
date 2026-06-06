// src/components/employeeCardForm/EmployeeForm.tsx
import { useState } from 'react';
import { Employee, Rol, EmployeeStatus, WorkShift } from '../../types/employee';
import { X } from 'lucide-react';

interface EmployeeFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (employee: Omit<Employee, '_id' | 'createdAt' | 'updatedAt'> | Employee) => void;
  employee?: Employee | null;
  restaurantId?: string;
}

const roleOptions: Rol[] = ['admin', 'gerente', 'mesero', 'cocinero', 'delivery', 'cajero','bartender'];
const shiftOptions: WorkShift[] = ['Turno Mañana', 'Turno Tarde', 'Turno Completo'];
const roleLabels: Record<Rol, string> = {
  admin: 'Administrador',
  gerente: 'Gerente',
  mesero: 'Mesero',
  cocinero: 'Cocinero',
  delivery: 'Delivery',
  cajero: 'Cajero',
  bartender: 'Bartender'
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
  const [formData, setFormData] = useState({
    name: employee?.name || '',
    email: employee?.email || '',
    password: '',
    rol: (employee?.rol as Rol) || 'mesero',
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (employee) {
      onSubmit({
        ...employee,
        name: formData.name,
        email: formData.email,
        rol: formData.rol,
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
        rol: formData.rol,
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
    if (field === 'name' || field === 'email' || field === 'password' || field === 'rol') {
      setFormData(prev => ({ ...prev, [field]: value }));
    } else if (field === 'salary' && value === '') {
      setFormData(prev => ({
        ...prev,
        employmentDetails: { ...prev.employmentDetails, salary: 0 }
      }));
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

  // Estilos en línea usando variables del globals.css
  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 50,
    display: 'flex',
    justifyContent: 'center',
    padding: '1rem',
    overflowY: 'auto',
  };

  const modalStyle: React.CSSProperties = {
    position: 'relative',
    backgroundColor: 'var(--card)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
    width: '100%',
    maxWidth: '32rem',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    margin: 'auto',
  };

  const headerStyle: React.CSSProperties = {
    position: 'sticky',
    top: 0,
    backgroundColor: 'var(--card)',
    borderBottom: `1px solid var(--border)`,
    padding: '1rem 1.5rem',
    zIndex: 10,
  };

  const closeButtonStyle: React.CSSProperties = {
    position: 'absolute',
    top: '1rem',
    right: '1rem',
    background: 'none',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    padding: '0.25rem',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--muted-foreground)',
    transition: 'background 0.2s',
  };

  const titleStyle: React.CSSProperties = {
    margin: 0,
    fontSize: '1.125rem',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--foreground)',
  };

  const subtitleStyle: React.CSSProperties = {
    margin: '0.25rem 0 0',
    fontSize: '0.875rem',
    color: 'var(--muted-foreground)',
  };

  const formStyle: React.CSSProperties = {
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    overflowY: 'auto',
  };

  const fieldLabelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '0.25rem',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--foreground)',
  };

  const requiredStarStyle: React.CSSProperties = {
    color: 'var(--destructive)',
  };

  const inputBaseStyle: React.CSSProperties = {
    width: '100%',
    borderRadius: 'var(--radius-md)',
    border: `1px solid var(--border)`,
    backgroundColor: 'var(--input-background)',
    padding: '0.5rem 0.75rem',
    fontSize: '0.875rem',
    color: 'var(--foreground)',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    fontFamily: 'inherit',
  };

  const inputErrorStyle: React.CSSProperties = {
    ...inputBaseStyle,
    borderColor: 'var(--destructive)',
  };

  const selectStyle: React.CSSProperties = {
    width: '100%',
    borderRadius: 'var(--radius-md)',
    border: `1px solid var(--border)`,
    backgroundColor: 'var(--input-background)',
    padding: '0.5rem 0.75rem',
    fontSize: '0.875rem',
    color: 'var(--foreground)',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    fontFamily: 'inherit',
  };

  const errorTextStyle: React.CSSProperties = {
    margin: '0.25rem 0 0',
    fontSize: '0.75rem',
    color: 'var(--destructive)',
  };

  const salaryInputWrapperStyle: React.CSSProperties = {
    position: 'relative',
  };

  const currencySymbolStyle: React.CSSProperties = {
    position: 'absolute',
    left: '0.75rem',
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--muted-foreground)',
    fontSize: '0.875rem',
    pointerEvents: 'none',
  };

  const salaryHelperStyle: React.CSSProperties = {
    margin: '0.25rem 0 0',
    fontSize: '0.625rem',
    color: 'var(--muted-foreground)',
    fontStyle: 'italic',
  };

  const buttonContainerStyle: React.CSSProperties = {
    display: 'flex',
    gap: '0.75rem',
    paddingTop: '1rem',
  };

  const cancelButtonStyle: React.CSSProperties = {
    flex: 1,
    backgroundColor: 'transparent',
    border: `1px solid var(--border)`,
    borderRadius: 'var(--radius-md)',
    padding: '0.5rem 0',
    fontSize: '0.875rem',
    fontWeight: 'var(--font-weight-medium)',
    cursor: 'pointer',
    color: 'var(--foreground)',
    fontFamily: 'inherit',
  };

  const submitButtonStyle: React.CSSProperties = {
    flex: 1,
    backgroundColor: 'var(--primary)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    padding: '0.5rem 0',
    fontSize: '0.875rem',
    fontWeight: 'var(--font-weight-medium)',
    cursor: 'pointer',
    color: 'var(--primary-foreground)',
    fontFamily: 'inherit',
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <button
            type="button"
            onClick={onClose}
            style={closeButtonStyle}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <X size={20} style={{ color: 'var(--muted-foreground)' }} />
          </button>
          <h2 style={titleStyle}>{employee ? 'Editar Empleado' : 'Agregar Nuevo Personal'}</h2>
          <p style={subtitleStyle}>
            {employee ? 'Actualiza los datos del empleado' : 'Completa la información del nuevo miembro del equipo'}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={formStyle}>
          {/* Nombre */}
          <div>
            <label style={fieldLabelStyle}>
              Nombre Completo <span style={requiredStarStyle}>*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              onBlur={() => setTouched(prev => ({ ...prev, name: true }))}
              placeholder="Juan Pérez"
              style={getFieldError('name') ? inputErrorStyle : inputBaseStyle}
              required
            />
            {getFieldError('name') && <p style={errorTextStyle}>{getFieldError('name')}</p>}
          </div>

          {/* Email */}
          <div>
            <label style={fieldLabelStyle}>
              Email <span style={requiredStarStyle}>*</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              onBlur={() => setTouched(prev => ({ ...prev, email: true }))}
              placeholder="correo@ejemplo.com"
              style={getFieldError('email') ? inputErrorStyle : inputBaseStyle}
              required
            />
            {getFieldError('email') && <p style={errorTextStyle}>{getFieldError('email')}</p>}
          </div>

          {/* Contraseña (solo para nuevos empleados) */}
          {!employee && (
            <div>
              <label style={fieldLabelStyle}>
                Contraseña <span style={requiredStarStyle}>*</span>
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                onBlur={() => setTouched(prev => ({ ...prev, password: true }))}
                placeholder="Mínimo 8 caracteres"
                style={getFieldError('password') ? inputErrorStyle : inputBaseStyle}
                required
              />
              {getFieldError('password') && <p style={errorTextStyle}>{getFieldError('password')}</p>}
            </div>
          )}

          {/* Rol */}
          <div>
            <label style={fieldLabelStyle}>
              Rol <span style={requiredStarStyle}>*</span>
            </label>
            <select
              value={formData.rol}
              onChange={(e) => handleChange('rol', e.target.value as Rol)}
              style={selectStyle}
              required
            >
              {roleOptions.map(role => (
                <option key={role} value={role}>{roleLabels[role]}</option>
              ))}
            </select>
          </div>

          {/* Teléfono */}
          <div>
            <label style={fieldLabelStyle}>
              Teléfono <span style={requiredStarStyle}>*</span>
            </label>
            <input
              type="tel"
              value={formData.employmentDetails.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              onBlur={() => setTouched(prev => ({ ...prev, phone: true }))}
              placeholder="12345678"
              style={getFieldError('phone') ? inputErrorStyle : inputBaseStyle}
              required
            />
            {getFieldError('phone') && <p style={errorTextStyle}>{getFieldError('phone')}</p>}
          </div>

          {/* Turno */}
          <div>
            <label style={fieldLabelStyle}>
              Turno <span style={requiredStarStyle}>*</span>
            </label>
            <select
              value={formData.employmentDetails.shift}
              onChange={(e) => handleChange('shift', e.target.value as WorkShift)}
              style={selectStyle}
              required
            >
              {shiftOptions.map(shift => (
                <option key={shift} value={shift}>{shift}</option>
              ))}
            </select>
          </div>

          {/* Fecha de Inicio */}
          <div>
            <label style={fieldLabelStyle}>
              Fecha de Inicio <span style={requiredStarStyle}>*</span>
            </label>
            <input
              type="date"
              value={formData.employmentDetails.startDate}
              onChange={(e) => handleChange('startDate', e.target.value)}
              onBlur={() => setTouched(prev => ({ ...prev, startDate: true }))}
              style={getFieldError('startDate') ? inputErrorStyle : inputBaseStyle}
              required
            />
            {getFieldError('startDate') && <p style={errorTextStyle}>{getFieldError('startDate')}</p>}
          </div>

          {/* Salario */}
          <div>
            <label style={fieldLabelStyle}>
              Salario Mensual (USD) <span style={requiredStarStyle}>*</span>
            </label>
            <div style={salaryInputWrapperStyle}>
              <span style={currencySymbolStyle}>$</span>
              <input
                type="number"
                value={formData.employmentDetails.salary || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') return handleChange('salary', '');
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
                style={{
                  ...(getFieldError('salary') ? inputErrorStyle : inputBaseStyle),
                  paddingLeft: '1.75rem',
                }}
                required
              />
            </div>
            {getFieldError('salary') && <p style={errorTextStyle}>{getFieldError('salary')}</p>}
            {formData.employmentDetails.salary > 0 && (
              <p style={salaryHelperStyle}>
                Monto: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(formData.employmentDetails.salary)}
              </p>
            )}
          </div>

          {/* Estado (solo visible en edición) */}
          {employee && (
            <div>
              <label style={fieldLabelStyle}>Estado</label>
              <select
                value={formData.employmentDetails.status}
                onChange={(e) => handleChange('status', e.target.value as EmployeeStatus)}
                style={selectStyle}
              >
                <option value="Activo">Activo</option>
                <option value="Vacaciones">Vacaciones</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>
          )}

          {/* Botones */}
          <div style={buttonContainerStyle}>
            <button type="button" onClick={onClose} style={cancelButtonStyle}>
              Cancelar
            </button>
            <button type="submit" style={submitButtonStyle}>
              {employee ? 'Guardar Cambios' : 'Agregar Personal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}