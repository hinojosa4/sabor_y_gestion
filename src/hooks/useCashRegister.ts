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
  shiftName?: string;
  shiftDate?: string;
  shiftStart?: string;
  shiftEnd?: string;
  message?: string;
}

export function useCashRegister() {
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [data, setData] = useState<CashRegisterData | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchCierreData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/cash-register/current', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const result = await res.json();
      setData(result);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCierre = async () => {
    setClosing(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/cash-register/close', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ closingBalance: data?.salesTotal })
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Cierre de caja realizado con éxito' });
        fetchCierreData();
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.error || 'Error al cerrar caja' });
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage({ type: 'error', text: 'Error al cerrar caja' });
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
    message,
    clearMessage: () => setMessage(null),
    handleCierre,
    refresh: fetchCierreData
  };
}
