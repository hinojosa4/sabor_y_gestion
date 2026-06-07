// src/components/caja/FacturaFinal.tsx
import { useRef } from 'react';
import { X, Printer, Mail } from 'lucide-react';
import { formatOrderLabel } from '@/lib/orderDisplay';
//import { QRCodeCanvas } from 'qrcode.react';

interface OrderItem {
    dish: { name: string; price: number };
    quantity: number;
    subtotal: number;
}

interface FacturaFinalProps {
    isOpen: boolean;
    onClose: () => void;
    orderId: string;
    dailyNumber?: number | null;
    tableNumber: number | null;
    items: OrderItem[];
    iva: number;
    total: number;
    subtotal?: number;
    discountAmount?: number;
    discountPercent?: number;
    loyaltyTierName?: string | null;
    deliveryFee?: number;
    paymentMethod: 'cash' | 'qr';
    cashReceived?: number;
    change?: number;
    customerEmail?: string;
    observations?: string;
    paymentDate: Date;
    onSendEmail?: () => void;
}

const overlayStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    zIndex: 70,
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

export function FacturaFinal({
    isOpen,
    onClose,
    orderId,
    dailyNumber,
    tableNumber,
    items,
    total,
    subtotal,
    discountAmount = 0,
    discountPercent = 0,
    loyaltyTierName,
    deliveryFee = 0,
    paymentMethod,
    cashReceived,
    change,
    customerEmail,
    observations,
    paymentDate,
    onSendEmail
}: FacturaFinalProps) {
    const printRef = useRef<HTMLDivElement>(null);

    if (!isOpen) return null;

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-BO', {
            style: 'currency',
            currency: 'BOB'
        }).format(amount);
    };

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('es-BO', {
            dateStyle: 'full',
            timeStyle: 'medium'
        }).format(date);
    };

    const handlePrint = () => {
        if (printRef.current) {
            const printContent = printRef.current.innerHTML;
            const originalContent = document.body.innerHTML;
            document.body.innerHTML = printContent;
            window.print();
            document.body.innerHTML = originalContent;
            window.location.reload();
        }
    };

    return (
        <div style={overlayStyle} onClick={onClose}>
            <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "bold" }}>Factura Final</h2>
                    <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}>
                        <X size={20} />
                    </button>
                </div>

                <div ref={printRef}>
                    {/* Contenido de la factura */}
                    <div style={{ textAlign: "center", marginBottom: "1rem" }}>
                        <h3 style={{ margin: 0 }}>RESTAURANTE SABOR Y GESTIÓN</h3>
                        <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--muted-foreground)" }}>
                            NIT: 1234567890
                        </p>
                        <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--muted-foreground)" }}>
                            Calle Principal #123, Cochabamba - Bolivia
                        </p>
                    </div>

                    <div style={{ borderTop: `1px solid var(--border)`, borderBottom: `1px solid var(--border)`, padding: "0.5rem 0", marginBottom: "1rem" }}>
                        <p style={{ margin: 0, fontSize: "0.75rem" }}><strong>{formatOrderLabel(orderId, dailyNumber)}</strong></p>
                        <p style={{ margin: 0, fontSize: "0.75rem" }}><strong>Mesa:</strong> {tableNumber ?? 'No disponible'}</p>
                        <p style={{ margin: 0, fontSize: "0.75rem" }}><strong>Fecha:</strong> {formatDate(paymentDate)}</p>
                        <p style={{ margin: 0, fontSize: "0.75rem" }}>
                            <strong>Método de pago:</strong> {paymentMethod === 'cash' ? 'Efectivo' : 'QR'}
                        </p>
                        {customerEmail && (
                            <p style={{ margin: 0, fontSize: "0.75rem" }}>
                                <strong>Factura enviada a:</strong> {customerEmail}
                            </p>
                        )}
                    </div>

                    <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "1rem" }}>
                        <thead>
                            <tr style={{ borderBottom: "1px solid var(--border)" }}>
                                <th style={{ textAlign: "left", padding: "0.5rem 0", fontSize: "0.75rem" }}>Producto</th>
                                <th style={{ textAlign: "center", padding: "0.5rem 0", fontSize: "0.75rem" }}>Cant.</th>
                                <th style={{ textAlign: "right", padding: "0.5rem 0", fontSize: "0.75rem" }}>Precio</th>
                                <th style={{ textAlign: "right", padding: "0.5rem 0", fontSize: "0.75rem" }}>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, idx) => (
                                <tr key={idx}>
                                    <td style={{ padding: "0.25rem 0", fontSize: "0.75rem" }}>{item.dish?.name}</td>
                                    <td style={{ textAlign: "center", padding: "0.25rem 0", fontSize: "0.75rem" }}>{item.quantity}</td>
                                    <td style={{ textAlign: "right", padding: "0.25rem 0", fontSize: "0.75rem" }}>{formatCurrency(item.dish?.price || 0)}</td>
                                    <td style={{ textAlign: "right", padding: "0.25rem 0", fontSize: "0.75rem" }}>{formatCurrency(item.subtotal)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div style={{ textAlign: "right", marginBottom: "1rem" }}>
                        {discountAmount > 0 && (
                            <>
                                <p style={{ margin: "0.5rem 0 0", fontSize: "0.75rem" }}>Subtotal: {formatCurrency(subtotal ?? total + discountAmount)}</p>
                                <p style={{ margin: 0, fontSize: "0.75rem" }}>
                                    Descuento fidelizacion{loyaltyTierName ? ` (${loyaltyTierName})` : ''}: -{formatCurrency(discountAmount)} ({discountPercent}%)
                                </p>
                            </>
                        )}
                        {deliveryFee > 0 && (
                            <p style={{ margin: discountAmount > 0 ? 0 : "0.5rem 0 0", fontSize: "0.75rem" }}>Envio: {formatCurrency(deliveryFee)}</p>
                        )}
                        <p style={{ margin: "0.5rem 0 0", fontWeight: "bold" }}>Total: {formatCurrency(total)}</p>

                        {paymentMethod === 'cash' && cashReceived !== undefined && (
                            <>
                                <p style={{ margin: 0, fontSize: "0.75rem" }}>Efectivo: {formatCurrency(cashReceived)}</p>
                                <p style={{ margin: 0, fontSize: "0.75rem" }}><strong>Vuelto: {formatCurrency(change || 0)}</strong></p>
                            </>
                        )}
                    </div>

                    {observations && (
                        <div style={{ marginBottom: "1rem", padding: "0.5rem", backgroundColor: "var(--muted)", borderRadius: "var(--radius-md)" }}>
                            <p style={{ margin: 0, fontSize: "0.75rem", fontStyle: "italic" }}>Observaciones: {observations}</p>
                        </div>
                    )}

                    {/* QR para comprobante digital (comentado para futuros enhancements) */}
                    {/* <div style={{ textAlign: "center", marginTop: "1rem" }}>
                    <QRCodeCanvas value={`${window.location.origin}/comprobante/${orderId}`} size={80} />
                        <p style={{ fontSize: "0.7rem", marginTop: "0.5rem" }}>Escanea para ver comprobante digital</p>
                    </div> */}

                    <div style={{ textAlign: "center", marginTop: "1rem", fontSize: "0.7rem", color: "var(--muted-foreground)" }}>
                        ¡Gracias por su visita!
                    </div>
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
                        Cerrar
                    </button>
                    {onSendEmail && (
                        <button
                            onClick={onSendEmail}
                            style={{
                                padding: "0.5rem 1rem",
                                backgroundColor: "var(--secondary)",
                                border: `1px solid var(--border)`,
                                borderRadius: "var(--radius-md)",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.5rem",
                            }}
                        >
                            <Mail size={16} /> Reenviar
                        </button>
                    )}
                    <button
                        onClick={handlePrint}
                        style={{
                            flex: 1,
                            padding: "0.5rem",
                            backgroundColor: "var(--primary)",
                            color: "var(--primary-foreground)",
                            border: "none",
                            borderRadius: "var(--radius-md)",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            justifyContent: "center",
                        }}
                    >
                        <Printer size={16} /> Imprimir
                    </button>
                </div>
            </div>
        </div>
    );
}
