import { useState, useEffect, useMemo, useCallback } from 'react';
import { Employee } from '../types/employee';

export function useEmployeeData() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        onVacation: 0,
        monthlyPayroll: 0
    });
    const [loading, setLoading] = useState(true);

    const calculateStats = useCallback((emps: Employee[]) => {
        const active = emps.filter(emp => emp.employmentDetails?.status === 'Activo').length;
        const onVacation = emps.filter(emp => emp.employmentDetails?.status === 'Vacaciones').length;
        const monthlyPayroll = emps.reduce((sum, emp) => sum + (emp.employmentDetails?.salary || 0), 0);

        setStats({
            total: emps.length,
            active,
            onVacation,
            monthlyPayroll
        });
    }, []);

    const loadData = useCallback(async () => {
        try {
            const employeesRes = await fetch('/api/employee');
            const employeesData = await employeesRes.json();
            setEmployees(employeesData);
            calculateStats(employeesData);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    }, [calculateStats]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const addEmployee = useCallback(async (employee: Omit<Employee, '_id' | 'createdAt' | 'updatedAt'>) => {
        try {
            const res = await fetch('/api/employee', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(employee),
            });
            const newEmployee = await res.json();

            setEmployees(prev => {
                const updated = [...prev, newEmployee];
                calculateStats(updated);
                return updated;
            });

            return newEmployee;
        } catch (error) {
            console.error('Error:', error);
            throw error;
        }
    }, [calculateStats]);

    const updateEmployee = useCallback(async (employee: Employee) => {
        try {
            const res = await fetch(`/api/employee/${employee._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(employee),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Error al actualizar');
            }

            const updated = await res.json();

            setEmployees(prev => {
                const updatedList = prev.map(emp => emp._id === updated._id ? updated : emp);
                calculateStats(updatedList);
                return updatedList;
            });

            return updated;
        } catch (error) {
            console.error('Error:', error);
            throw error;
        }
    }, [calculateStats]);

    const updateClient = useCallback(async (clientData: { _id: string; isActive: boolean; loyaltyPoints?: number }) => {
        try {
            const res = await fetch(`/api/users/${clientData._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    activo: clientData.isActive,
                    loyaltyPoints: clientData.loyaltyPoints, // ✅ agregar esta línea
                }),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Error al actualizar cliente');
            }

            const updated = await res.json();

            // Actualizar el estado local incluyendo loyaltyPoints
            setEmployees(prev => prev.map(emp => {
                if (emp._id === updated._id) {
                    return {
                        ...emp,
                        isActive: updated.activo,
                        loyaltyPoints: updated.loyaltyPoints ?? clientData.loyaltyPoints, // guardar puntos local
                    };
                }
                return emp;
            }));

            setEmployees(prev => {
                calculateStats(prev);
                return prev;
            });

            return updated;
        } catch (error) {
            console.error('Error en updateClient:', error);
            throw error;
        }
    }, [calculateStats]);

    const deleteEmployee = useCallback(async (id: string) => {
        try {
            await fetch(`/api/employee/${id}`, { method: 'DELETE' });

            setEmployees(prev => {
                const updated = prev.filter(emp => emp._id !== id);
                calculateStats(updated);
                return updated;
            });
        } catch (error) {
            console.error('Error:', error);
            throw error;
        }
    }, [calculateStats]);

    const filteredEmployees = useMemo(() => {
        if (!searchQuery.trim()) return employees;
        const query = searchQuery.toLowerCase();
        return employees.filter(
            emp =>
                emp.name.toLowerCase().includes(query) ||
                emp.role.toLowerCase().includes(query) ||
                emp.email.toLowerCase().includes(query) ||
                emp.employmentDetails?.phone?.toLowerCase().includes(query)
        );
    }, [employees, searchQuery]);

    return {
        employees,
        stats,
        loading,
        searchQuery,
        setSearchQuery,
        filteredEmployees,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        updateClient,
    };
}