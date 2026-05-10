import { useState, useEffect, useCallback } from 'react';

interface PreinvoiceItem {
  dish: {
    name: string;
    price: number;
  };
  quantity: number;
  subtotal?: number;
}

export function usePreinvoice(tableId: string, isOpen: boolean) {
  const [items, setItems] = useState<PreinvoiceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [subtotal, setSubtotal] = useState(0);
  const [iva, setIva] = useState(0);
  const [total, setTotal] = useState(0);

  const fetchPreinvoice = useCallback(async () => {
    if (!tableId || !isOpen) return;

    setLoading(true);

    try {
      const res = await fetch(`/api/orders/preinvoice/${tableId}`);
      const data = await res.json();

      setItems(data.items || []);
      setSubtotal(data.subtotal || 0);
      setIva(data.iva || 0);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Error al cargar prefactura:', error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [tableId, isOpen]);

  useEffect(() => {
    fetchPreinvoice();
  }, [fetchPreinvoice]);

  return {
    items,
    loading,
    subtotal,
    iva,
    total,
    refreshPreinvoice: fetchPreinvoice
  };
}