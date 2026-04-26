// hooks/useTableData.ts
import { useState, useEffect, useCallback } from 'react';
import { Table, TableStats, CreateTableDTO } from '@/types/table';

export function useTableData(restaurantId: string) {
    const [tables, setTables] = useState<Table[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLocation, setSelectedLocation] = useState('Todas');

    const stats: TableStats = {
        total: tables.length,
        libre: tables.filter(t => t.status === 'Libre').length,
        ocupada: tables.filter(t => t.status === 'Ocupada').length,
        reservada: tables.filter(t => t.status === 'Reservada').length,
        cuentaSolicitada: tables.filter(t => t.status === 'Cuenta solicitada').length,
        totalSeats: tables.reduce((sum, t) => sum + t.capacity, 0),
        locations: [...new Set(tables.map(t => t.location))].length,
        distributionByLocation: tables.reduce((acc, table) => {
            acc[table.location] = (acc[table.location] || 0) + 1;
            return acc;
        }, {} as Record<string, number>)
    };

    const locations = ['Todas', ...new Set(tables.map(t => t.location))];

    const filteredTables = tables.filter(table => {
        const tableNumberStr = table.number.toString();
        const searchLower = searchQuery.toLowerCase();

        const matchesSearch = tableNumberStr.includes(searchQuery) ||
            table.location.toLowerCase().includes(searchLower);
        const matchesLocation = selectedLocation === 'Todas' || table.location === selectedLocation;
        return matchesSearch && matchesLocation;
    });

    const fetchTables = useCallback(async () => {
        if (!restaurantId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/tables?restaurantId=${restaurantId}`);
            const data = await response.json();

            if (response.ok) {
                setTables(data);
            } else {
                setError(data.error || 'Error al cargar las mesas');
                setTables([]);
            }
        } catch (err) {
            console.error('Error al cargar mesas:', err);
            setError('Error de conexión al servidor');
            setTables([]);
        } finally {
            setLoading(false);
        }
    }, [restaurantId]);

    // ✅ Cambiar 'any' por 'CreateTableDTO'
    const addTable = async (tableData: CreateTableDTO) => {
        try {
            const payload = {
                restaurantId: tableData.restaurantId,
                number: Number(tableData.number),
                capacity: Number(tableData.capacity),
                location: tableData.location,
                xPosition: Number(tableData.xPosition) || 50,
                yPosition: Number(tableData.yPosition) || 50,
                status: 'Libre' as const
            };

            const response = await fetch('/api/tables', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                const errorMessage = data.error || 'Error al crear la mesa';
                alert(errorMessage);
                return null;
            }

            setTables(prev => [...prev, data]);
            return data;
        } catch (error) {
            console.error('Error al agregar mesa:', error);
            alert('Error de conexión al servidor');
            return null;
        }
    };

    const updateTable = async (id: string, updates: Partial<Table>) => {
        try {
            const response = await fetch(`/api/tables/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al actualizar la mesa');
            }

            setTables(prev => prev.map(t => t._id === id ? data : t));
            return data;
        } catch (error) {
            console.error('Error al actualizar mesa:', error);
            throw error;
        }
    };

    const deleteTable = async (id: string) => {
        try {
            const response = await fetch(`/api/tables/${id}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al eliminar la mesa');
            }

            setTables(prev => prev.filter(t => t._id !== id));
        } catch (error) {
            console.error('Error al eliminar mesa:', error);
            throw error;
        }
    };

    useEffect(() => {
        fetchTables();
    }, [fetchTables]);

    return {
        tables,
        loading,
        error,
        stats,
        locations,
        searchQuery,
        setSearchQuery,
        selectedLocation,
        setSelectedLocation,
        filteredTables,
        addTable,
        updateTable,
        deleteTable,
        refreshTables: fetchTables
    };
}
