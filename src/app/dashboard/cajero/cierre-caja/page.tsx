// src/app/dashboard/cajero/cierre-caja/page.tsx
"use client";
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/useAuth';
import { CAJERO, ADMIN } from '@/lib/roles';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, DollarSign, CreditCard, Receipt, Printer, Download } from 'lucide-react';
import Link from 'next/link';

interface CashRegisterData {
    openingDate: string;
    openingBalance: number;
    salesTotal: number;
    cashTotal: number;
    qrTotal: number;
    tablesServed: number;
    ordersCount: number;
    status: 'abierto' | 'cerrado';
    closingDate?: string;
    closingBalance?: number;
}

export default function CierreCajaPage() {
    //const { user, loading: userLoading } = useAuth(CAJERO);
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<CashRegisterData | null>(null);
    const [closing, setClosing] = useState(false);

    useEffect(() => {
        fetchCierreData();
    }, []);

    const fetchCierreData = async () => {
        try {
            const res = await fetch('/api/cash-register/current');
            const result = await res.json();
            setData(result);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCierre = async () => {
        if (!confirm('¿Estás seguro de realizar el cierre de caja? No podrás revertirlo.')) return;
        
        setClosing(true);
        try {
            const res = await fetch('/api/cash-register/close', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ closingBalance: data?.salesTotal })
            });
            
            if (res.ok) {
                alert('Cierre de caja realizado con éxito');
                fetchCierreData();
            } else {
                const error = await res.json();
                alert(error.error || 'Error al cerrar caja');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error al cerrar caja');
        } finally {
            setClosing(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-BO', {
            style: 'currency',
            currency: 'BOB'
        }).format(amount);
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleString('es-BO');
    };

    /*if (userLoading || loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
        );
    }

    if (!user) return null;*/

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/dashboard/cajero"
                            className="inline-flex items-center justify-center text-black font-medium transition-colors hover:bg-gray-100 rounded-md h-8 px-3"
                        >
                            <ArrowLeft className="size-5" />
                        </Link>
                        <div>
                            <h1 className="text-black font-semibold">Cierre de Caja</h1>
                            <p className="text-sm text-gray-500">Reporte de ventas del turno</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-6">
                {data && data.status === 'abierto' ? (
                    <>
                        <div className="bg-white rounded-xl border border-gray-200 shadow mb-6">
                            <div className="p-6 border-b border-gray-100">
                                <h2 className="text-lg font-semibold text-black">Resumen del Turno</h2>
                                <p className="text-sm text-gray-500">
                                    Apertura: {formatDate(data.openingDate)}
                                </p>
                            </div>
                            <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <p className="text-sm text-gray-500">Apertura</p>
                                    <p className="text-xl font-bold text-black">{formatCurrency(data.openingBalance)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Ventas Totales</p>
                                    <p className="text-xl font-bold text-green-600">{formatCurrency(data.salesTotal)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Mesas Atendidas</p>
                                    <p className="text-xl font-bold text-black">{data.tablesServed}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Pedidos Totales</p>
                                    <p className="text-xl font-bold text-black">{data.ordersCount}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 shadow mb-6">
                            <div className="p-6 border-b border-gray-100">
                                <h2 className="text-lg font-semibold text-black">Desglose por Método de Pago</h2>
                            </div>
                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-green-500 rounded-full p-2">
                                            <DollarSign className="size-5 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">Efectivo</p>
                                            <p className="text-xl font-bold text-green-600">{formatCurrency(data.cashTotal)}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-blue-500 rounded-full p-2">
                                            <CreditCard className="size-5 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">QR/Digital</p>
                                            <p className="text-xl font-bold text-blue-600">{formatCurrency(data.qrTotal)}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <Button variant="outline" onClick={() => window.print()}>
                                <Printer className="size-4 mr-2" />
                                Imprimir
                            </Button>
                            <Button onClick={handleCierre} disabled={closing} className="bg-red-600 hover:bg-red-700">
                                {closing ? 'Cerrando...' : 'Cerrar Caja'}
                            </Button>
                        </div>
                    </>
                ) : (
                    <div className="bg-white rounded-xl border border-gray-200 shadow p-12 text-center">
                        <Receipt className="size-16 text-gray-400 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-black mb-2">Caja Cerrada</h2>
                        <p className="text-gray-500 mb-4">
                            El cierre de caja fue realizado
                        </p>
                        <Link href="/dashboard/cajero">
                            <Button>Volver al Panel</Button>
                        </Link>
                    </div>
                )}
            </main>
        </div>
    );
}