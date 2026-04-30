// src/app/dashboard/cajero/page.tsx
"use client";
import { useState } from 'react';
import { useAuth } from '@/lib/useAuth';
import { CAJERO } from '@/lib/roles';
import { Button } from '@/components/ui/Button';
import { Search, DollarSign, Receipt, Clock, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useTableData } from '@/hooks/useTableData';
import { PreinvoiceModal } from '@/components/caja/PreinvoiceModal';

export default function CajeroDashboard() {
    //const { user, loading: userLoading } = useAuth(CAJERO);
    const restaurantId = "69e170e941daf8c2b2f76677";
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTable, setSelectedTable] = useState<{ id: string; number: number } | null>(null);
    const [isPreinvoiceOpen, setIsPreinvoiceOpen] = useState(false);

    // ✅ Usar el hook existente
    const { tables, loading, refreshTables } = useTableData(restaurantId);

    const filteredTables = tables.filter(table =>
        table.number.toString().includes(searchQuery) ||
        table.location.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const billingTables = filteredTables.filter(t => t.status === 'Cuenta solicitada');
    const occupiedTables = filteredTables.filter(t =>
        t.status !== 'Cuenta solicitada' && t.status !== 'Libre'
    );
    const freeTables = filteredTables.filter(t => t.status === 'Libre');

    const handleTableClick = (tableId: string, tableNumber: number, status: string) => {
        if (status === 'Cuenta solicitada') {
            setSelectedTable({ id: tableId, number: tableNumber });
            setIsPreinvoiceOpen(true);
        }
    };

    /*if (userLoading || loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
        );
    }*/

    //if (!user) return null;

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50" style={{ zoom: 1.25 }}>
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 md:py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <Link
                                href="/dashboard"
                                className="inline-flex items-center justify-center text-black font-medium transition-colors hover:bg-gray-100 rounded-md h-8 px-3"
                            >
                                <ArrowLeft className="size-5" />
                            </Link>
                            <div>
                                <h1 className="text-black leading-none font-semibold">
                                    Panel de Cajero
                                </h1>
                                <p className="text-xs md:text-sm text-gray-500">
                                    Gestiona pagos y facturación
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Link href="/dashboard/cajero/cierre-caja">
                                <Button variant="outline">
                                    <Receipt className="size-4 mr-2" />
                                    Cierre de Caja
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-3 md:py-5">
                <div className="mb-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar mesa por número o ubicación..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                    </div>
                </div>

                {/* Cuentas por Cobrar */}
                {billingTables.length > 0 && (
                    <div className="mb-8">
                        <div className="flex items-center gap-2 mb-4">
                            <DollarSign className="size-5 text-orange-600" />
                            <h2 className="text-lg font-semibold text-black">Cuentas por Cobrar</h2>
                            <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full">
                                {billingTables.length}
                            </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {billingTables.map((table) => (
                                <div
                                    key={table._id}
                                    onClick={() => handleTableClick(table._id, table.number, table.status)}
                                    className="cursor-pointer rounded-xl border-2 border-orange-400 bg-orange-50 p-4 hover:shadow-lg transition-all"
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-xl font-bold text-orange-700">Mesa {table.number}</h3>
                                            <p className="text-sm text-gray-600">{table.location}</p>
                                            <p className="text-xs text-orange-600 mt-1 font-medium">Solicita cuenta</p>
                                        </div>
                                        <div className="bg-orange-500 rounded-full p-3">
                                            <Receipt className="size-5 text-white" />
                                        </div>
                                    </div>
                                    <Button className="w-full mt-3 bg-orange-600 hover:bg-orange-700 text-white">
                                        Ver cuenta
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Mesas Ocupadas */}
                {occupiedTables.length > 0 && (
                    <div className="mb-8">
                        <div className="flex items-center gap-2 mb-4">
                            <Clock className="size-5 text-blue-600" />
                            <h2 className="text-lg font-semibold text-black">Mesas en Servicio</h2>
                            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">
                                {occupiedTables.length}
                            </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {occupiedTables.map((table) => (
                                <div key={table._id} className="rounded-xl border border-gray-200 bg-white p-4 opacity-70">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-700">Mesa {table.number}</h3>
                                            <p className="text-sm text-gray-500">{table.location}</p>
                                            <p className="text-xs text-blue-600 mt-1 font-medium">
                                                {table.status === 'Ocupada' ? 'En servicio' : 'Reservada'}
                                            </p>
                                        </div>
                                        <div className="bg-gray-100 rounded-full p-3">
                                            <Clock className="size-5 text-gray-500" />
                                        </div>
                                    </div>
                                    <Button variant="outline" className="w-full mt-3" disabled>
                                        Esperando solicitud
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Mesas Libres */}
                {freeTables.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <h2 className="text-lg font-semibold text-black">Mesas Libres</h2>
                            <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">
                                {freeTables.length}
                            </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {freeTables.map((table) => (
                                <div key={table._id} className="rounded-xl border border-green-200 bg-green-50 p-4 opacity-60">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-xl font-bold text-green-700">Mesa {table.number}</h3>
                                            <p className="text-sm text-gray-500">{table.location}</p>
                                        </div>
                                        <div className="bg-green-100 rounded-full p-3">
                                            <div className="size-5 rounded-full bg-green-500"></div>
                                        </div>
                                    </div>
                                    <Button variant="outline" className="w-full mt-3" disabled>
                                        Disponible
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {filteredTables.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-gray-500">No se encontraron mesas</p>
                    </div>
                )}
            </main>

            <PreinvoiceModal
                isOpen={isPreinvoiceOpen}
                onClose={() => {
                    setIsPreinvoiceOpen(false);
                    setSelectedTable(null);
                    refreshTables();  // ✅ Usar refreshTables del hook
                }}
                tableId={selectedTable?.id || ''}
                tableNumber={selectedTable?.number || 0}
                onPay={() => {
                    setIsPreinvoiceOpen(false);
                    // setIsPaymentOpen(true);
                }}
            />
        </div>
    );
}