// app/api/employee/[id]/route.ts
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Employee from '@/models/Employee';

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();
        const { id } = await params;
        const data = await request.json();

        // ✅ Si viene password_hash, mapear a password
        if (data.password_hash) {
            data.password = data.password_hash;
            delete data.password_hash;
        }

        // ✅ Asegurar employmentDetails
        const updateData = {
            ...data,
            employmentDetails: data.employmentDetails || {
                phone: '',
                shift: 'Turno Mañana',
                startDate: new Date(),
                salary: 0,
                status: 'Activo'
            }
        };

        const employee = await Employee.findByIdAndUpdate(
            id,
            updateData,
            { returnDocument: 'after' }
        ).select('-password');  // ✅ Cambiado de '-password_hash' a '-password'

        if (!employee) {
            return NextResponse.json(
                { error: 'Empleado no encontrado' },
                { status: 404 }
            );
        }

        return NextResponse.json(employee);
    } catch (error) {
        console.error('Error en PUT:', error);
        return NextResponse.json(
            { error: 'Error al actualizar' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();
        const { id } = await params;

        const deleted = await Employee.findByIdAndDelete(id);

        if (!deleted) {
            return NextResponse.json(
                { error: 'Empleado no encontrado' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error en DELETE:', error);
        return NextResponse.json(
            { error: 'Error al eliminar' },
            { status: 500 }
        );
    }
}
