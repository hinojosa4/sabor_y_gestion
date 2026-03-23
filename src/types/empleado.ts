export type EmployeeStatus = 'Activo' | 'Vacaciones' | 'Inactivo';
export type WorkShift = 'Turno Mañana' | 'Turno Tarde' | 'Turno Completo';
export type Role = 'Mesero' | 'Chef' | 'Cajero' | 'Ayudante de Cocina' | 'Barista';

export interface Empleado {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  status: EmployeeStatus;
  shift: WorkShift;
  startDate: string;
  salary: number;
  createdAt?: Date;
}

export interface PersonalStats {
  total: number;
  active: number;
  onVacation: number;
  monthlyPayroll: number;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export const roleColors: Record<Role, { bg: string; text: string }> = {
  'Mesero': { bg: 'bg-blue-100', text: 'text-blue-700' },
  'Chef': { bg: 'bg-orange-100', text: 'text-orange-700' },
  'Cajero': { bg: 'bg-green-100', text: 'text-green-700' },
  'Ayudante de Cocina': { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  'Barista': { bg: 'bg-purple-100', text: 'text-purple-700' },
};

export const statusColors: Record<EmployeeStatus, { bg: string; text: string }> = {
  'Activo': { bg: 'bg-green-500', text: 'text-white' },
  'Vacaciones': { bg: 'bg-blue-500', text: 'text-white' },
  'Inactivo': { bg: 'bg-gray-500', text: 'text-white' },
};
