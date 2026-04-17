export type EmployeeStatus = 'Activo' | 'Vacaciones' | 'Inactivo';
export type WorkShift = 'Turno Mañana' | 'Turno Tarde' | 'Turno Completo';
export type Role = 'admin' | 'manager' | 'waiter' | 'chef' | 'driver';

export interface Employee {
  _id: string;
  restaurantId: string;
  name: string;
  email: string;
  password_hash: string;
  role: Role;
  isActive: boolean;
  employmentDetails: {
    phone: string;
    shift: WorkShift;
    startDate: string;
    salary: number;
    status: EmployeeStatus;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface EmployeeStats {
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
  'admin': { bg: 'bg-red-100', text: 'text-red-700' },
  'manager': { bg: 'bg-purple-100', text: 'text-purple-700' },
  'waiter': { bg: 'bg-blue-100', text: 'text-blue-700' },
  'chef': { bg: 'bg-orange-100', text: 'text-orange-700' },
  'driver': { bg: 'bg-green-100', text: 'text-green-700' },
};

export const statusColors: Record<EmployeeStatus, { bg: string; text: string }> = {
  'Activo': { bg: 'bg-green-500', text: 'text-white' },
  'Vacaciones': { bg: 'bg-blue-500', text: 'text-white' },
  'Inactivo': { bg: 'bg-gray-500', text: 'text-white' },
};
