// app/api/employee/route.ts
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Employee from '@/models/Employee';
// ✅ Eliminar import no usado
// import { Employee as EmployeeType } from '@/types/employee';

// ✅ Definir interfaz para tipar el documento de MongoDB
interface MongoEmployee {
    _id: string;
    restaurantId: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    employmentDetails?: {
        phone: string;
        shift: string;
        startDate: Date;
        salary: number;
        status: string;
    };
    createdAt: Date;
    updatedAt: Date;
    [key: string]: unknown;
}

export async function GET() {
    try {
        await connectDB();
        const employees = await Employee.find({})
            .select('-password')
            .sort({ createdAt: -1 })
            .lean();

        // ✅ Usar MongoEmployee en lugar de any
        const normalizedEmployees = employees.map((emp: MongoEmployee) => {
            const formatDateOnly = (date: Date | string | undefined) => {
                if (!date) return null;
                const d = new Date(date);
                if (isNaN(d.getTime())) return null;
                return d.toISOString().split('T')[0];
            };

            return {
                ...emp,
                employmentDetails: emp.employmentDetails ? {
                    ...emp.employmentDetails,
                    startDate: formatDateOnly(emp.employmentDetails.startDate)
                } : {
                    phone: '',
                    shift: 'Turno Mañana',
                    startDate: formatDateOnly(emp.createdAt) || new Date().toISOString().split('T')[0],
                    salary: 0,
                    status: 'Activo'
                }
            };
        });

        return NextResponse.json(normalizedEmployees);
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json([], { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        await connectDB();
        const data = await request.json();

        // ✅ Mapear password_hash a password
        const employeeData = {
            restaurantId: data.restaurantId,
            name: data.name,
            email: data.email,
            password: data.password_hash || data.password,
            role: data.role,
            isActive: data.isActive,
            employmentDetails: data.employmentDetails || {
                phone: '',
                shift: 'Turno Mañana',
                startDate: new Date(),
                salary: 0,
                status: 'Activo'
            }
        };

        // ✅ Validar que password existe
        if (!employeeData.password) {
            return NextResponse.json(
                { error: 'La contraseña es obligatoria' },
                { status: 400 }
            );
        }

        const employee = await Employee.create(employeeData);

        const employeeResponse = employee.toObject();
        delete employeeResponse.password;

        return NextResponse.json(employeeResponse, { status: 201 });
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json(
            { error: 'Error al crear empleado' },
            { status: 500 }
        );
    }
}
