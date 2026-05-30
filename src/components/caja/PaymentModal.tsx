// src/components/caja/PaymentModal.tsx
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { FacturaFinal } from './FacturaFinal';
import { formatOrderLabel } from '@/lib/orderDisplay';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    orderId: string;
    tableId: string;
    tableNumber: number;
    totalAmount: number;
    onSuccess: () => void;
}

interface OrderItemType {
    dish: { name: string; price: number };
    quantity: number;
    subtotal: number;
}

// Estilos
const overlayStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    zIndex: 60,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "1rem",
};

const modalStyle: React.CSSProperties = {
    backgroundColor: "var(--card)",
    borderRadius: "var(--radius-lg)",
    padding: "1.5rem",
    maxWidth: "32rem",
    width: "100%",
    maxHeight: "90vh",
    overflowY: "auto",
    boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
};

// Componente para resumen de la orden
function OrderSummary({ orderId }: { orderId: string }) {
    const [items, setItems] = useState<OrderItemType[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const res = await fetch(`/api/orders/preinvoice/order/${orderId}`);
                const data = await res.json();
                if (data.items) {
                    setItems(data.items);
                    setTotal(data.total || 0);
                }
            } catch (error) {
                console.error('Error:', error);
            } finally {
                setLoading(false);
            }
        };
        if (orderId) fetchOrder();
    }, [orderId]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-BO', {
            style: 'currency',
            currency: 'BOB'
        }).format(amount);
    };

    if (loading) return <p>Cargando productos...</p>;

    return (
        <div style={{ marginBottom: "1rem", padding: "0.5rem", backgroundColor: "var(--muted)", borderRadius: "var(--radius-md)" }}>
            {orderId && (
                <p style={{ margin: "0 0 0.5rem", fontSize: "0.875rem", fontWeight: "bold" }}>
                    {formatOrderLabel(orderId)}
                </p>
            )}
            <h3 style={{ margin: "0 0 0.5rem", fontSize: "0.875rem", fontWeight: "bold" }}>Productos</h3>
            {items.map((item, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: "0.25rem" }}>
                    <span>{item.quantity}x {item.dish?.name}</span>
                    <span>{formatCurrency(item.subtotal)}</span>
                </div>
            ))}
            <div style={{ borderTop: `1px solid var(--border)`, marginTop: "0.5rem", paddingTop: "0.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
                    <span>Total</span>
                    <span>{formatCurrency(total)}</span>
                </div>
            </div>
        </div>
    );
}

export function PaymentModal({ isOpen, onClose, orderId, tableId, tableNumber, totalAmount, onSuccess }: PaymentModalProps) {
    const [loading, setLoading] = useState(false);
    const [cashReceivedInput, setCashReceivedInput] = useState(String(totalAmount));
    const [customerEmail, setCustomerEmail] = useState('');
    const [observations, setObservations] = useState('');
    
    // Estados para la factura final
    const [showFactura, setShowFactura] = useState(false);
    const [orderItems, setOrderItems] = useState<OrderItemType[]>([]);
    const [orderIva, setOrderIva] = useState(0);

    useEffect(() => {
        if (isOpen) {
            setCashReceivedInput(String(totalAmount));
            setCustomerEmail('');
            setObservations('');
        }
    }, [isOpen, totalAmount]);

    if (!isOpen) return null;

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-BO', {
            style: 'currency',
            currency: 'BOB'
        }).format(amount);
    };

    const cashReceived = Number(cashReceivedInput);
    const hasCashValue = cashReceivedInput.trim() !== '' && !Number.isNaN(cashReceived);
    const change = hasCashValue ? cashReceived - totalAmount : 0;
    const isValid = hasCashValue && cashReceived >= totalAmount;

    const handleCashReceivedChange = (value: string) => {
        const normalized = value
            .replace(',', '.')
            .replace(/[^\d.]/g, '')
            .replace(/(\..*)\./g, '$1');

        if (normalized === '') {
            setCashReceivedInput('');
            return;
        }

        const withoutLeadingZeros = normalized.replace(/^0+(?=\d)/, '');
        setCashReceivedInput(withoutLeadingZeros);
    };

    const handlePayment = async () => {
        if (!isValid) return;
        setLoading(true);
        try {
            // 1. Registrar pago
            const res = await fetch('/api/payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    orderId, 
                    amount: totalAmount, 
                    method: 'cash', 
                    tableId,
                    customerEmail,
                    observations
                }),
            });
            
            if (res.ok) {
                // 2. Cargar los items de la orden para la factura
                const orderRes = await fetch(`/api/orders/preinvoice/order/${orderId}`);
                const orderData = await orderRes.json();
                setOrderItems(orderData.items || []);
                setOrderIva(0);
                
                // 3. Mostrar factura final y cerrar modal de pago
                setShowFactura(true);
                onSuccess();
                onClose();
            } else {
                const error = await res.json();
                alert(error.error || 'Error al procesar pago');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error al procesar pago');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div style={overlayStyle} onClick={onClose}>
                <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
                    {/* Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                        <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "bold" }}>Pago en Efectivo</h2>
                        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}>
                            <X size={20} />
                        </button>
                    </div>

                    {/* Mejora 1: Resumen de la orden */}
                    <OrderSummary orderId={orderId} />

                    {/* Total a pagar */}
                    <p style={{ fontSize: "1.5rem", fontWeight: "bold", textAlign: "center", marginBottom: "1rem" }}>
                        Total: {formatCurrency(totalAmount)}
                    </p>

                    {/* Monto recibido */}
                    <div style={{ marginBottom: "1rem" }}>
                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>
                            Monto recibido (Bs)
                        </label>
                        <input
                            type="text"
                            inputMode="decimal"
                            value={cashReceivedInput}
                            onChange={(e) => handleCashReceivedChange(e.target.value)}
                            autoFocus
                            style={{
                                width: "100%",
                                padding: "0.5rem",
                                borderRadius: "var(--radius-md)",
                                border: `1px solid var(--border)`,
                                fontSize: "1rem",
                            }}
                        />
                        {isValid && (
                            <p style={{ marginTop: "0.5rem", fontSize: "0.875rem" }}>
                                <strong>Vuelto:</strong> {formatCurrency(change)}
                            </p>
                        )}
                        {!isValid && (
                            <p style={{ color: "var(--destructive)", marginTop: "0.5rem", fontSize: "0.875rem" }}>
                                El monto es insuficiente
                            </p>
                        )}
                    </div>

                    {/* Campo de email (para factura) */}
                    <div style={{ marginBottom: "1rem" }}>
                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>
                            Correo para factura (opcional)
                        </label>
                        <input
                            type="email"
                            value={customerEmail}
                            onChange={(e) => setCustomerEmail(e.target.value)}
                            placeholder="cliente@ejemplo.com"
                            style={{
                                width: "100%",
                                padding: "0.5rem",
                                borderRadius: "var(--radius-md)",
                                border: `1px solid var(--border)`,
                            }}
                        />
                    </div>

                    {/* Campo de observaciones */}
                    <div style={{ marginBottom: "1rem" }}>
                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>
                            Observaciones (opcional)
                        </label>
                        <textarea
                            value={observations}
                            onChange={(e) => setObservations(e.target.value)}
                            placeholder="Ej: Pagó con billete de 200"
                            rows={2}
                            style={{
                                width: "100%",
                                padding: "0.5rem",
                                borderRadius: "var(--radius-md)",
                                border: `1px solid var(--border)`,
                                fontFamily: "inherit",
                                resize: "vertical",
                            }}
                        />
                    </div>

                    {/* Botones de acción */}
                    <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
                        <button
                            onClick={onClose}
                            style={{
                                flex: 1,
                                padding: "0.5rem",
                                backgroundColor: "transparent",
                                border: `1px solid var(--border)`,
                                borderRadius: "var(--radius-md)",
                                cursor: "pointer",
                            }}
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handlePayment}
                            disabled={!isValid || loading}
                            style={{
                                flex: 1,
                                padding: "0.5rem",
                                backgroundColor: "var(--primary)",
                                color: "var(--primary-foreground)",
                                border: "none",
                                borderRadius: "var(--radius-md)",
                                cursor: "pointer",
                                opacity: (!isValid || loading) ? 0.5 : 1,
                            }}
                        >
                            {loading ? 'Procesando...' : 'Confirmar Pago'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Factura Final */}
            <FacturaFinal
                isOpen={showFactura}
                onClose={() => setShowFactura(false)}
                orderId={orderId}
                tableNumber={tableNumber}
                items={orderItems}
                iva={orderIva}
                total={totalAmount}
                paymentMethod="cash"
                cashReceived={cashReceived}
                change={change}
                customerEmail={customerEmail || undefined}
                observations={observations}
                paymentDate={new Date()}
            />
        </>
    );
}
