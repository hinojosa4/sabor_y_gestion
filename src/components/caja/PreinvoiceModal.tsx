// app/components/PreinvoiceModal.tsx
import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { X, Printer, CreditCard } from 'lucide-react';

interface PreinvoiceItem {
  dish: {
    name: string;
    price: number;
  };
  quantity: number;
  subtotal?: number;
}

interface PreinvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableId: string;        // ✅ Agregado
  tableNumber: number;    // ✅ Agregado
  onPay?: () => void;     // ✅ Cambiado de onConfirm
  onPrint?: () => void;
}

export function PreinvoiceModal({ 
  isOpen, 
  onClose, 
  tableId, 
  tableNumber, 
  onPay,
  onPrint 
}: PreinvoiceModalProps) {
  const [items, setItems] = useState<PreinvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [subtotal, setSubtotal] = useState(0);
  const [iva, setIva] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (isOpen && tableId) {
      fetchPreinvoice();
    }
  }, [isOpen, tableId]);

  const fetchPreinvoice = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/preinvoice/${tableId}`);
      const data = await res.json();
      
      if (data.items) {
        setItems(data.items);
        setSubtotal(data.subtotal || 0);
        setIva(data.iva || 0);
        setTotal(data.total || 0);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-BO', {
      style: 'currency',
      currency: 'BOB'
    }).format(amount);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Pre-factura</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="size-5" />
          </button>
        </div>

        <p className="text-sm text-gray-500 mb-4">Mesa {tableNumber}</p>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800 mx-auto"></div>
            <p className="mt-2 text-gray-500">Cargando...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No hay pedidos pendientes
          </div>
        ) : (
          <>
            <div className="space-y-2 mb-4 max-h-96 overflow-y-auto">
              {items.map((item, index) => (
                <div key={index} className="flex justify-between border-b pb-2">
                  <div>
                    <span className="font-medium">{item.quantity}x</span>
                    <span className="ml-2">{item.dish?.name || 'Plato'}</span>
                  </div>
                  <span>{formatCurrency((item.dish?.price || 0) * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>IVA (13%)</span>
                <span>{formatCurrency(iva)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-4">
              <Button variant="outline" onClick={onClose}>
                Cerrar
              </Button>
              {onPrint && (
                <Button variant="outline" onClick={onPrint}>
                  <Printer className="size-4 mr-2" />
                  Imprimir
                </Button>
              )}
              {onPay && (
                <Button onClick={onPay} className="bg-green-600 hover:bg-green-700">
                  <CreditCard className="size-4 mr-2" />
                  Cobrar
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}