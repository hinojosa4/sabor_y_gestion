// types/employee.ts
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
