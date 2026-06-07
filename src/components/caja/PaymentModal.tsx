// src/components/caja/PaymentModal.tsx
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { FacturaFinal } from './FacturaFinal';
import { formatOrderLabel } from '@/lib/orderDisplay';
import { AppNotice } from '@/components/ui/AppNotice';

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

type PaymentReceipt = {
    total: number;
    subtotal: number;
    discountAmount: number;
    discountPercent: number;
    loyaltyTierName: string | null;
    dailyNumber: number | null;
    cashReceived: number;
    change: number;
    paymentDate: Date;
};

type PaymentPreview = {
    subtotal: number;
    discountAmount: number;
    discountPercent: number;
    loyaltyTierName: string | null;
    total: number;
    customerName: string | null;
};

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

const discountPreviewStyle: React.CSSProperties = {
    display: "grid",
    gap: "0.5rem",
    marginTop: "0.65rem",
    padding: "0.65rem 0.75rem",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-md)",
    background: "var(--card)",
    fontSize: "0.82rem",
};

const discountHeaderStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "0.75rem",
};

const discountRowStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "0.75rem",
    color: "#555",
};

const discountLabelStyle: React.CSSProperties = {
    display: "grid",
    gap: "0.15rem",
    minWidth: 0,
};

const discountMetaStyle: React.CSSProperties = {
    color: "var(--muted-foreground)",
    fontSize: "0.74rem",
};

const discountValueStyle: React.CSSProperties = {
    color: "#c2410c",
    textAlign: "right",
    whiteSpace: "nowrap",
};

const discountDividerStyle: React.CSSProperties = {
    height: 1,
    background: "var(--border)",
};

const discountTotalRowStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    gap: "0.75rem",
    color: "#1a1a1a",
    fontWeight: 800,
};

const discountHintStyle: React.CSSProperties = {
    margin: "0.65rem 0 0",
    fontSize: "0.78rem",
    color: "var(--muted-foreground)",
    textAlign: "center",
};

// Componente para resumen de la orden
function OrderSummary({
    orderId,
    preview,
    previewLoading,
    formatCurrency,
}: {
    orderId: string;
    preview: PaymentPreview;
    previewLoading: boolean;
    formatCurrency: (amount: number) => string;
}) {
    const [items, setItems] = useState<OrderItemType[]>([]);
    const [total, setTotal] = useState(0);
    const [dailyNumber, setDailyNumber] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const res = await fetch(`/api/orders/preinvoice/order/${orderId}`);
                const data = await res.json();
                if (data.items) {
                    setItems(data.items);
                    setTotal(data.total || 0);
                    setDailyNumber(data.dailyNumber ?? null);
                }
            } catch (error) {
                console.error('Error:', error);
            } finally {
                setLoading(false);
            }
        };
        if (orderId) fetchOrder();
    }, [orderId]);

    if (loading) return <p>Cargando productos...</p>;

    return (
        <div style={{ marginBottom: "1rem", padding: "0.75rem", backgroundColor: "var(--muted)", borderRadius: "var(--radius-md)" }}>
            {orderId && (
                <p style={{ margin: "0 0 0.5rem", fontSize: "0.875rem", fontWeight: "bold" }}>
                    {formatOrderLabel(orderId, dailyNumber)}
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
                {preview.discountAmount > 0 ? (
                    <PaymentDiscountPreview
                        preview={preview}
                        loading={previewLoading}
                        formatCurrency={formatCurrency}
                    />
                ) : (
                    <>
                        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
                            <span>Total</span>
                            <span>{formatCurrency(total)}</span>
                        </div>
                        {previewLoading && <p style={discountHintStyle}>Calculando fidelizacion...</p>}
                    </>
                )}
            </div>
        </div>
    );
}

function PaymentDiscountPreview({
    preview,
    loading,
    formatCurrency,
}: {
    preview: PaymentPreview;
    loading: boolean;
    formatCurrency: (amount: number) => string;
}) {
    if (loading) {
        return (
            <p style={discountHintStyle}>Calculando fidelizacion...</p>
        );
    }

    if (preview.discountAmount <= 0) {
        return null;
    }

    return (
        <div style={discountPreviewStyle}>
            <div style={discountHeaderStyle}>
                <span>Subtotal</span>
                <strong>{formatCurrency(preview.subtotal)}</strong>
            </div>
            <div style={discountRowStyle}>
                <span style={discountLabelStyle}>
                    <span>
                        Descuento fidelizacion{preview.discountPercent > 0 ? ` (${preview.discountPercent}%)` : ''}
                    </span>
                    {preview.loyaltyTierName && (
                        <span style={discountMetaStyle}>{preview.loyaltyTierName}</span>
                    )}
                </span>
                <strong style={discountValueStyle}>
                    -{formatCurrency(preview.discountAmount)}
                </strong>
            </div>
            <div style={discountDividerStyle} />
            <div style={discountTotalRowStyle}>
                <span>Total con descuento</span>
                <strong>{formatCurrency(preview.total)}</strong>
            </div>
        </div>
    );
}

export function PaymentModal({ isOpen, onClose, orderId, tableId, tableNumber, totalAmount, onSuccess }: PaymentModalProps) {
    const [loading, setLoading] = useState(false);
    const [cashReceivedInput, setCashReceivedInput] = useState(String(totalAmount));
    const [customerEmail, setCustomerEmail] = useState('');
    const [preview, setPreview] = useState<PaymentPreview>({
        subtotal: totalAmount,
        discountAmount: 0,
        discountPercent: 0,
        loyaltyTierName: null,
        total: totalAmount,
        customerName: null,
    });
    const [previewLoading, setPreviewLoading] = useState(false);
    const [observations, setObservations] = useState('');
    const [notice, setNotice] = useState<{ type: 'error' | 'warning'; message: string } | null>(null);
    
    // Estados para la factura final
    const [showFactura, setShowFactura] = useState(false);
    const [orderItems, setOrderItems] = useState<OrderItemType[]>([]);
    const [orderIva, setOrderIva] = useState(0);
    const [receipt, setReceipt] = useState<PaymentReceipt | null>(null);

    useEffect(() => {
        if (isOpen) {
            setCashReceivedInput(String(totalAmount));
            setCustomerEmail('');
            setPreview({
                subtotal: totalAmount,
                discountAmount: 0,
                discountPercent: 0,
                loyaltyTierName: null,
                total: totalAmount,
                customerName: null,
            });
            setPreviewLoading(false);
            setObservations('');
            setNotice(null);
            setShowFactura(false);
            setReceipt(null);
        }
    }, [isOpen, totalAmount]);

    useEffect(() => {
        if (!isOpen || !orderId) return;

        const controller = new AbortController();
        const timeout = window.setTimeout(async () => {
            const email = customerEmail.trim();

            if (email === '' || !/^\S+@\S+\.\S+$/.test(email)) {
                setPreview({
                    subtotal: totalAmount,
                    discountAmount: 0,
                    discountPercent: 0,
                    loyaltyTierName: null,
                    total: totalAmount,
                    customerName: null,
                });
                return;
            }

            setPreviewLoading(true);
            try {
                const res = await fetch('/api/payments/preview', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ orderId, email }),
                    signal: controller.signal,
                });
                const data = await res.json();
                if (!res.ok || !data.ok) throw new Error(data.error || 'Error al calcular descuento');

                setPreview({
                    subtotal: Number(data.subtotal ?? totalAmount),
                    discountAmount: Number(data.discountAmount ?? 0),
                    discountPercent: Number(data.discountPercent ?? 0),
                    loyaltyTierName: data.loyaltyTierName ?? null,
                    total: Number(data.total ?? totalAmount),
                    customerName: data.customer?.name ?? null,
                });
            } catch (error) {
                if (error instanceof DOMException && error.name === 'AbortError') return;
                console.error('Error:', error);
                setPreview({
                    subtotal: totalAmount,
                    discountAmount: 0,
                    discountPercent: 0,
                    loyaltyTierName: null,
                    total: totalAmount,
                    customerName: null,
                });
            } finally {
                if (!controller.signal.aborted) setPreviewLoading(false);
            }
        }, 450);

        return () => {
            controller.abort();
            window.clearTimeout(timeout);
        };
    }, [customerEmail, isOpen, orderId, totalAmount]);

    if (!isOpen) return null;

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-BO', {
            style: 'currency',
            currency: 'BOB'
        }).format(amount);
    };

    const cashReceived = Number(cashReceivedInput);
    const payableTotal = preview.total;
    const hasCashValue = cashReceivedInput.trim() !== '' && !Number.isNaN(cashReceived);
    const change = hasCashValue ? cashReceived - payableTotal : 0;
    const isValid = hasCashValue && cashReceived >= payableTotal;

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
            const token = localStorage.getItem('token');
            // 1. Registrar pago
            const res = await fetch('/api/payments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ 
                    orderId, 
                    amount: payableTotal, 
                    method: 'cash', 
                    tableId,
                    customerEmail,
                    observations
                }),
            });
            
            const paymentData = await res.json();

            if (res.ok) {
                onSuccess();
                onClose();
            } else {
                setNotice({ type: 'error', message: paymentData.error || 'Error al procesar pago' });
            }
        } catch (error) {
            console.error('Error:', error);
            setNotice({ type: 'error', message: 'Error al procesar pago' });
        } finally {
            setLoading(false);
        }
    };

    const closeReceipt = () => {
        setShowFactura(false);
        setReceipt(null);
        onSuccess();
        onClose();
    };

    if (showFactura && receipt) {
        return (
            <FacturaFinal
                isOpen
                onClose={closeReceipt}
                orderId={orderId}
                dailyNumber={receipt.dailyNumber}
                tableNumber={tableNumber}
                items={orderItems}
                iva={orderIva}
                total={receipt.total}
                subtotal={receipt.subtotal}
                discountAmount={receipt.discountAmount}
                discountPercent={receipt.discountPercent}
                loyaltyTierName={receipt.loyaltyTierName}
                paymentMethod="cash"
                cashReceived={receipt.cashReceived}
                change={receipt.change}
                customerEmail={customerEmail || undefined}
                observations={observations}
                paymentDate={receipt.paymentDate}
            />
        );
    }

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

                    {notice && (
                        <div style={{ marginBottom: "1rem" }}>
                            <AppNotice
                                type={notice.type}
                                title="No se pudo registrar el pago"
                                message={notice.message}
                                onClose={() => setNotice(null)}
                            />
                        </div>
                    )}

                    {/* Mejora 1: Resumen de la orden */}
                    <OrderSummary
                        orderId={orderId}
                        preview={preview}
                        previewLoading={previewLoading}
                        formatCurrency={formatCurrency}
                    />

                    {/* Total a pagar */}
                    <p style={{ fontSize: "1.5rem", fontWeight: "bold", textAlign: "center", marginBottom: "1rem" }}>
                        Total: {formatCurrency(payableTotal)}
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

        </>
    );
}
