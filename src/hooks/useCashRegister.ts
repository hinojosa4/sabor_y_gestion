// hooks/useCashRegister.ts
import { useState, useEffect, useCallback } from 'react';

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

export function useCashRegister() {
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [data, setData] = useState<CashRegisterData | null>(null);

  const fetchCierreData = useCallback(async () => {
    try {
      const res = await fetch('/api/cash-register/current');
      const result = await res.json();
      setData(result);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

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

  useEffect(() => {
    fetchCierreData();
  }, [fetchCierreData]);

  return {
    data,
    loading,
    closing,
    handleCierre,
    refresh: fetchCierreData
  };
}