// types/employee.ts
export type EmployeeStatus = 'Activo' | 'Vacaciones' | 'Inactivo';
export type WorkShift = 'Turno Mañana' | 'Turno Tarde' | 'Turno Completo';
export type Rol = 'admin' | 'gerente' | 'mesero' | 'cocinero' | 'delivery' | 'cajero'; 

export interface Employee {
  _id: string;
  restaurantId: string;
  name: string;
  email: string;
  password_hash: string;
  rol: Rol; 
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
