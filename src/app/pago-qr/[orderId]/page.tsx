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

const discountPreviewStyle: React.CSSProperties = {
    display: "grid",
    marginTop: "0.65rem",
    border: "1px solid #e5e7eb",
    borderRadius: "var(--radius-md)",
    background: "#fff",
    fontSize: "0.82rem",
    overflow: "hidden",
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
};

const discountTitleStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "0.75rem",
    padding: "0.6rem 0.75rem",
    background: "#f8fafc",
    borderBottom: "1px solid #e5e7eb",
};

const discountTitleMetaStyle: React.CSSProperties = {
    color: "var(--muted-foreground)",
    fontSize: "0.72rem",
    textAlign: "right",
};

const discountBodyStyle: React.CSSProperties = {
    display: "grid",
    gap: "0.55rem",
    padding: "0.7rem 0.75rem",
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

const discountTotalRowStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "0.75rem",
    margin: "0.1rem -0.2rem -0.15rem",
    padding: "0.5rem 0.2rem 0",
    borderTop: "1px solid #e5e7eb",
    color: "#065f46",
    fontWeight: 800,
};

interface OrderItem {
    dish: { name: string; price: number };
    quantity: number;
    subtotal: number;
}

type PaymentPreview = {
    subtotal: number;
    discountAmount: number;
    discountPercent: number;
    loyaltyTierName: string | null;
    deliveryFee: number;
    total: number;
};

function DiscountPreview({
    preview,
    loading,
    formatCurrency,
}: {
    preview: PaymentPreview;
    loading: boolean;
    formatCurrency: (amount: number) => string;
}) {
    if (loading) {
        return <p style={{ margin: "0.65rem 0 0", fontSize: "0.78rem", color: 'var(--muted-foreground)', textAlign: "center" }}>Calculando fidelizacion...</p>;
    }

    if (preview.discountAmount <= 0 && preview.deliveryFee <= 0) return null;

    return (
        <div style={discountPreviewStyle}>
            <div style={discountTitleStyle}>
                <strong>Detalle de pago</strong>
                <span style={discountTitleMetaStyle}>
                    {preview.discountAmount > 0 ? "Fidelizacion aplicada" : "Resumen final"}
                </span>
            </div>
            <div style={discountBodyStyle}>
                <div style={discountHeaderStyle}>
                    <span>Subtotal productos</span>
                    <strong>{formatCurrency(preview.subtotal)}</strong>
                </div>
                {preview.discountAmount > 0 && (
                    <div style={discountRowStyle}>
                        <span style={discountLabelStyle}>
                            <span>Descuento fidelizacion</span>
                            {preview.loyaltyTierName && (
                                <span style={discountMetaStyle}>{preview.loyaltyTierName}</span>
                            )}
                        </span>
                        <strong style={discountValueStyle}>
                            -{formatCurrency(preview.discountAmount)} ({preview.discountPercent}%)
                        </strong>
                    </div>
                )}
                {preview.deliveryFee > 0 && (
                    <div style={discountRowStyle}>
                        <span>Envio</span>
                        <strong>{formatCurrency(preview.deliveryFee)}</strong>
                    </div>
                )}
                <div style={discountTotalRowStyle}>
                    <span>Total a pagar</span>
                    <strong>{formatCurrency(preview.total)}</strong>
                </div>
            </div>
        </div>
    );
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
    const [preview, setPreview]       = useState<PaymentPreview>({
        subtotal: 0,
        discountAmount: 0,
        discountPercent: 0,
        loyaltyTierName: null,
        deliveryFee: 0,
        total: 0,
    });
    const [previewLoading, setPreviewLoading] = useState(false);
    const [tableNumber, setTableNumber] = useState<number | null>(null);
    const [dailyNumber, setDailyNumber] = useState<number | null>(null);
    const [serviceType, setServiceType] = useState<string>('dine_in');
    const [step, setStep]             = useState<1 | 2>(1);

    const [showFactura, setShowFactura] = useState(false);
    const [paymentData, setPaymentData] = useState<{
        orderId: string; items: OrderItem[];
        iva: number; total: number; subtotal: number;
        discountAmount: number; discountPercent: number;
        loyaltyTierName: string | null;
        deliveryFee: number;
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
                    setPreview({
                        subtotal: data.subtotal || data.total || 0,
                        discountAmount: Number(data.discountAmount ?? 0),
                        discountPercent: Number(data.discountPercent ?? 0),
                        loyaltyTierName: data.loyaltyTierName ?? null,
                        deliveryFee: Number(data.deliveryFee ?? 0),
                        total: data.total || 0,
                    });
                    setTableNumber(data.tableNumber ?? null);
                    setDailyNumber(data.dailyNumber ?? null);
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

    useEffect(() => {
        if (!orderId || total <= 0) return;

        const controller = new AbortController();
        const timeout = window.setTimeout(async () => {
            const normalizedEmail = email.trim();
            const validEmail = /^\S+@\S+\.\S+$/.test(normalizedEmail);

            if (!validEmail) {
                setPreview({
                    subtotal: total,
                    discountAmount: 0,
                    discountPercent: 0,
                    loyaltyTierName: null,
                    deliveryFee: 0,
                    total,
                });
                return;
            }

            setPreviewLoading(true);
            try {
                const res = await fetch('/api/payments/preview', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ orderId, email: normalizedEmail }),
                    signal: controller.signal,
                });
                const data = await res.json();
                if (!res.ok || !data.ok) throw new Error(data.error || 'Error al calcular descuento');

                setPreview({
                    subtotal: Number(data.subtotal ?? total),
                    discountAmount: Number(data.discountAmount ?? 0),
                    discountPercent: Number(data.discountPercent ?? 0),
                    loyaltyTierName: data.loyaltyTierName ?? null,
                    deliveryFee: Number(data.deliveryFee ?? 0),
                    total: Number(data.total ?? total),
                });
            } catch (err) {
                if (err instanceof DOMException && err.name === 'AbortError') return;
                console.error('Error:', err);
                setPreview({
                    subtotal: total,
                    discountAmount: 0,
                    discountPercent: 0,
                    loyaltyTierName: null,
                    deliveryFee: 0,
                    total,
                });
            } finally {
                if (!controller.signal.aborted) setPreviewLoading(false);
            }
        }, 450);

        return () => {
            controller.abort();
            window.clearTimeout(timeout);
        };
    }, [email, orderId, total]);

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
                setPaymentData({
                    orderId,
                    items: data.items ?? items,
                    iva: data.iva ?? iva,
                    subtotal: Number(data.subtotal ?? preview.subtotal),
                    total: Number(data.total ?? preview.total),
                    discountAmount: Number(data.discountAmount ?? 0),
                    discountPercent: Number(data.discountPercent ?? 0),
                    loyaltyTierName: data.loyaltyTierName ?? null,
                    deliveryFee: Number(data.deliveryFee ?? 0),
                    customerEmail: email,
                    paymentDate: new Date(),
                });
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
                            {formatOrderLabel(orderId, dailyNumber)}
                        </p>
                        <h3 style={{ margin: "0 0 0.5rem", fontSize: "1rem" }}>Resumen de tu pedido</h3>
                        {items.map((item, idx) => (
                            <div key={idx} style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem", fontSize: "0.875rem" }}>
                                <span>{item.quantity}x {item.dish?.name}</span>
                                <span>{formatCurrency(item.subtotal)}</span>
                            </div>
                        ))}
                        <div style={{ borderTop: "1px solid var(--border)", marginTop: "0.5rem", paddingTop: "0.5rem" }}>
                            {preview.discountAmount > 0 || preview.deliveryFee > 0 || previewLoading ? (
                                <DiscountPreview
                                    preview={preview}
                                    loading={previewLoading}
                                    formatCurrency={formatCurrency}
                                />
                            ) : (
                                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
                                    <span>Total</span>
                                    <span>{formatCurrency(total)}</span>
                                </div>
                            )}
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
                            <p style={totalStyle}>Total a pagar: {formatCurrency(preview.total || total)}</p>
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
                            <p style={totalStyle}>Total a pagar: {formatCurrency(preview.total || total)}</p>
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
                            <p style={totalStyle}>Total a pagar: {formatCurrency(preview.total || total)}</p>
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
                    dailyNumber={dailyNumber}
                    tableNumber={tableNumber}
                    items={paymentData.items}
                    iva={paymentData.iva}
                    total={paymentData.total}
                    subtotal={paymentData.subtotal}
                    discountAmount={paymentData.discountAmount}
                    discountPercent={paymentData.discountPercent}
                    loyaltyTierName={paymentData.loyaltyTierName}
                    deliveryFee={paymentData.deliveryFee}
                    paymentMethod="qr"
                    customerEmail={paymentData.customerEmail}
                    paymentDate={paymentData.paymentDate}
                />
            )}
        </>
    );
}
