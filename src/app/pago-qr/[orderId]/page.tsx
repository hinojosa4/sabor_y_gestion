"use client";
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { FacturaFinal } from '@/components/caja/FacturaFinal';
import { formatOrderLabel } from '@/lib/orderDisplay';

const containerStyle: React.CSSProperties = {
    minHeight: "100vh",
    backgroundColor: "var(--background)",
    fontFamily: "inherit",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "1rem",
};

const cardStyle: React.CSSProperties = {
    backgroundColor: "var(--card)",
    borderRadius: "var(--radius-lg)",
    padding: "2rem",
    maxWidth: "28rem",
    width: "100%",
    boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
};

const totalStyle: React.CSSProperties = {
    fontSize: "1.25rem",
    fontWeight: "bold",
    textAlign: "center",
    margin: 0,
};

const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.75rem",
    borderRadius: "var(--radius-md)",
    border: `1px solid var(--border)`,
    marginBottom: "1rem",
    fontSize: "1rem",
    fontFamily: "inherit",
    backgroundColor: "var(--input-background)",
    color: "var(--foreground)",
};

const buttonStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.75rem",
    backgroundColor: "var(--primary)",
    color: "var(--primary-foreground)",
    border: "none",
    borderRadius: "var(--radius-md)",
    fontSize: "1rem",
    fontWeight: "bold",
    cursor: "pointer",
    fontFamily: "inherit",
};

const buttonDisabledStyle: React.CSSProperties = {
    ...buttonStyle,
    opacity: 0.5,
    cursor: "not-allowed",
};

const errorStyle: React.CSSProperties = {
    color: "var(--destructive)",
    fontSize: "0.875rem",
    marginBottom: "1rem",
    textAlign: "center",
};

interface OrderItem {
    dish: { name: string; price: number };
    quantity: number;
    subtotal: number;
}

export default function PagoQRPage() {
    const params  = useParams();
    const router  = useRouter();
    const orderId = params.orderId as string;

    const [loading, setLoading]       = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [items, setItems]           = useState<OrderItem[]>([]);
    const [iva, setIva]               = useState(0);
    const [total, setTotal]           = useState(0);
    const [email, setEmail]           = useState('');
    const [emailError, setEmailError] = useState('');
    const [error, setError]           = useState('');
    const [tableNumber, setTableNumber] = useState<number | null>(null);
    const [serviceType, setServiceType] = useState<string>('dine_in');
    const [step, setStep]             = useState<1 | 2>(1);

    const [showFactura, setShowFactura] = useState(false);
    const [paymentData, setPaymentData] = useState<{
        orderId: string; items: OrderItem[];
        iva: number; total: number;
        customerEmail: string; paymentDate: Date;
    } | null>(null);

    const qrUrl = typeof window !== "undefined"
        ? `${window.location.origin}/pago-qr/${orderId}`
        : `/pago-qr/${orderId}`;

    useEffect(() => {
        if (!orderId) return;
        const fetchOrder = async () => {
            try {
                const res  = await fetch(`/api/orders/preinvoice/order/${orderId}`);
                const data = await res.json();
                if (data.items) {
                    setServiceType(data.serviceType ?? 'dine_in');
                    setItems(data.items);
                    setIva(data.iva || 0);
                    setTotal(data.total || 0);
                    setTableNumber(data.tableNumber ?? null);
                } else {
                    setError('Orden no encontrada');
                }
            } catch (err) {
                console.error('Error:', err);
                setError('Error al cargar la orden');
            } finally {
                setLoading(false);
            }
        };
        fetchOrder();
    }, [orderId]);

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(amount);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const regex = /^\S+@\S+\.\S+$/;
        if (!email)            { setEmailError('El correo es obligatorio'); return; }
        if (!regex.test(email)){ setEmailError('Ingrese un correo válido'); return; }
        setEmailError('');
        setSubmitting(true);
        try {
            const res  = await fetch('/api/payments/qr-confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId, email }),
            });
            const data = await res.json();
            if (res.ok) {
                setPaymentData({ orderId, items, iva, total, customerEmail: email, paymentDate: new Date() });
                setShowFactura(true);
            } else {
                setError(data.error || 'Error al procesar el pago');
            }
        } catch (err) {
            console.error('Error:', err);
            setError('Error de conexión');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div style={containerStyle}>
            <p style={{ textAlign: "center", color: "var(--muted-foreground)" }}>Cargando información de la orden...</p>
        </div>
    );

    if (error && !showFactura) return (
        <div style={containerStyle}>
            <div style={cardStyle}>
                <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: "bold", textAlign: "center" }}>Pago QR</h1>
                <p style={errorStyle}>{error}</p>
                <button onClick={() => router.push('/')} style={buttonStyle}>Volver al inicio</button>
            </div>
        </div>
    );

    return (
        <>
            <div style={containerStyle}>
                <div style={cardStyle}>
                    <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: "bold", textAlign: "center", color: "var(--foreground)" }}>
                        Pago con QR
                    </h1>

                    {/* Resumen — siempre visible */}
                    <div style={{ padding: "1rem", backgroundColor: "var(--muted)", borderRadius: "var(--radius-md)" }}>
                        <p style={{ margin: "0 0 0.5rem", fontSize: "0.875rem", fontWeight: "bold" }}>
                            {formatOrderLabel(orderId)}
                        </p>
                        <h3 style={{ margin: "0 0 0.5rem", fontSize: "1rem" }}>Resumen de tu pedido</h3>
                        {items.map((item, idx) => (
                            <div key={idx} style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem", fontSize: "0.875rem" }}>
                                <span>{item.quantity}x {item.dish?.name}</span>
                                <span>{formatCurrency(item.subtotal)}</span>
                            </div>
                        ))}
                        <div style={{ borderTop: "1px solid var(--border)", marginTop: "0.5rem", paddingTop: "0.5rem", display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
                            <span>Total</span>
                            <span>{formatCurrency(total)}</span>
                        </div>
                    </div>

                    {/* ── DELIVERY: Paso 1 — mostrar QR ── */}
                    {serviceType === 'delivery' && step === 1 && (
                        <>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
                                <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--muted-foreground)", textAlign: "center" }}>
                                    Escanea el código QR con tu app de pagos para transferir
                                </p>
                                <div style={{ padding: "1rem", background: "#fff", borderRadius: 12, border: "1px solid var(--border)" }}>
                                    <QRCodeSVG value={qrUrl} size={180} />
                                </div>
                            </div>
                            <p style={totalStyle}>Total a pagar: {formatCurrency(total)}</p>
                            <button
                                style={{ ...buttonStyle, backgroundColor: "#16a34a" }}
                                onClick={() => setStep(2)}
                            >
                                ✅ Ya realicé la transferencia
                            </button>
                        </>
                    )}

                    {/* ── DELIVERY: Paso 2 — confirmar con email ── */}
                    {serviceType === 'delivery' && step === 2 && (
                        <>
                            <div style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "0.75rem", fontSize: "0.85rem", color: "#065f46" }}>
                                ✅ Transferencia registrada. Ingresa tu correo para recibir el comprobante.
                            </div>
                            <p style={totalStyle}>Total a pagar: {formatCurrency(total)}</p>
                            <form onSubmit={handleSubmit}>
                                <input type="email" placeholder="Correo electrónico *" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} required />
                                {emailError && <p style={errorStyle}>{emailError}</p>}
                                <button type="submit" disabled={submitting} style={submitting ? buttonDisabledStyle : buttonStyle}>
                                    {submitting ? 'Procesando...' : 'Confirmar Pago'}
                                </button>
                            </form>
                            <button onClick={() => setStep(1)} style={{ ...buttonStyle, backgroundColor: "transparent", color: "var(--foreground)", border: "1px solid var(--border)" }}>
                                ← Volver al QR
                            </button>
                            {error && <p style={errorStyle}>{error}</p>}
                        </>
                    )}

                    {/* ── DINE_IN / PICK_UP: flujo original sin cambios ── */}
                    {serviceType !== 'delivery' && (
                        <>
                            <p style={totalStyle}>Total a pagar: {formatCurrency(total)}</p>
                            <form onSubmit={handleSubmit}>
                                <input type="email" placeholder="Correo electrónico *" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} required />
                                {emailError && <p style={errorStyle}>{emailError}</p>}
                                <button type="submit" disabled={submitting} style={submitting ? buttonDisabledStyle : buttonStyle}>
                                    {submitting ? 'Procesando...' : 'Confirmar Pago'}
                                </button>
                            </form>
                            {error && <p style={errorStyle}>{error}</p>}
                        </>
                    )}
                </div>
            </div>

            {showFactura && paymentData && (
                <FacturaFinal
                    isOpen={showFactura}
                    onClose={() => { setShowFactura(false); router.push('/'); }}
                    orderId={paymentData.orderId}
                    tableNumber={tableNumber}
                    items={paymentData.items}
                    iva={paymentData.iva}
                    total={paymentData.total}
                    paymentMethod="qr"
                    customerEmail={paymentData.customerEmail}
                    paymentDate={paymentData.paymentDate}
                />
            )}
        </>
    );
}