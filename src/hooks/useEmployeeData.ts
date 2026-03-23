import { useState, useEffect, useMemo, useCallback } from 'react';
import { Empleado } from '../types/empleado';

export function useEmployeeData() {
    const [employees, setEmployees] = useState<Empleado[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        onVacation: 0,
        monthlyPayroll: 0
    });
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        try {
            const [employeesRes, statsRes] = await Promise.all([
                fetch('/api/employees'),
                fetch('/api/stats')
            ]);
            const [employeesData, statsData] = await Promise.all([
                employeesRes.json(),
                statsRes.json()
            ]);
            setEmployees(employeesData);
            setStats(statsData);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const refreshStats = useCallback(async () => {
        try {
            const res = await fetch('/api/stats');
            const statsData = await res.json();
            setStats(statsData);
        } catch (error) {
            console.error('Error al recargar stats:', error);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const addEmployee = useCallback(async (employee: Omit<Empleado, '_id' | 'createdAt'>) => {
        try {
            const res = await fetch('/api/employees', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(employee),
            });
            const newEmployee = await res.json();
            setEmployees(prev => [...prev, newEmployee]);
            await refreshStats();
            return newEmployee;
        } catch (error) {
            console.error('Error:', error);
            throw error;
        }
    }, [refreshStats]);

    const updateEmployee = useCallback(async (employee: Empleado) => {
        try {
            const res = await fetch(`/api/employees/${employee._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(employee),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Error al actualizar');
            }

            const updated = await res.json();
            setEmployees(prev => prev.map(emp => emp._id === updated._id ? updated : emp));
            await refreshStats();
            return updated;
        } catch (error) {
            console.error('Error:', error);
            throw error;
        }
    }, [refreshStats]);

    const deleteEmployee = useCallback(async (id: string) => {
        try {
            await fetch(`/api/employees/${id}`, { method: 'DELETE' });
            setEmployees(prev => prev.filter(emp => emp._id !== id));
            await refreshStats();
        } catch (error) {
            console.error('Error:', error);
            throw error;
        }
    }, [refreshStats]);

    const filteredEmployees = useMemo(() => {
        if (!searchQuery.trim()) return employees;
        const query = searchQuery.toLowerCase();
        return employees.filter(
            emp =>
                emp.name.toLowerCase().includes(query) ||
                emp.role.toLowerCase().includes(query) ||
                emp.email.toLowerCase().includes(query)
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
        refreshData: loadData,
    };
}
