// // src/app/pago-qr/[orderId]/page.tsx
"use client";
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FacturaFinal } from '@/components/caja/FacturaFinal';

// Estilos
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
};

const titleStyle: React.CSSProperties = {
    margin: "0 0 1rem",
    fontSize: "1.5rem",
    fontWeight: "bold",
    textAlign: "center",
    color: "var(--foreground)",
};

const orderSummaryStyle: React.CSSProperties = {
    marginBottom: "1.5rem",
    padding: "1rem",
    backgroundColor: "var(--muted)",
    borderRadius: "var(--radius-md)",
};

const totalStyle: React.CSSProperties = {
    fontSize: "1.25rem",
    fontWeight: "bold",
    textAlign: "center",
    margin: "1rem 0",
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

const loadingStyle: React.CSSProperties = {
    textAlign: "center",
    padding: "2rem",
    color: "var(--muted-foreground)",
};

interface OrderItem {
    dish: { name: string; price: number };
    quantity: number;
    subtotal: number;
}

export default function PagoQRPage() {
    const params = useParams();
    const router = useRouter();
    const orderId = params.orderId as string;

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [items, setItems] = useState<OrderItem[]>([]);
    const [iva, setIva] = useState(0);
    const [total, setTotal] = useState(0);
    const [email, setEmail] = useState('');
    const [emailError, setEmailError] = useState('');
    const [error, setError] = useState('');
    const [tableNumber, setTableNumber] = useState<number | null>(null);

    // Estados para la factura final
    const [showFactura, setShowFactura] = useState(false);
    const [paymentData, setPaymentData] = useState<{
        orderId: string;
        items: OrderItem[];
        iva: number;
        total: number;
        customerEmail: string;
        paymentDate: Date;
    } | null>(null);

    // Cargar datos de la orden
    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const res = await fetch(`/api/orders/preinvoice/order/${orderId}`);
                const data = await res.json();
                if (data.items) {
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
        if (orderId) {
            fetchOrder();
        }
    }, [orderId]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-BO', {
            style: 'currency',
            currency: 'BOB'
        }).format(amount);
    };

    const validateEmail = (email: string) => {
        const regex = /^\S+@\S+\.\S+$/;
        if (!email) return 'El correo es obligatorio';
        if (!regex.test(email)) return 'Ingrese un correo válido';
        return '';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const emailValidation = validateEmail(email);
        if (emailValidation) {
            setEmailError(emailValidation);
            return;
        }
        setEmailError('');
        setSubmitting(true);

        try {
            const res = await fetch('/api/payments/qr-confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId, email }),
            });

            const data = await res.json();

            if (res.ok) {
                // Guardar datos para la factura final
                setPaymentData({
                    orderId,
                    items,
                    iva,
                    total,
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

    if (loading) {
        return (
            <div style={containerStyle}>
                <div style={loadingStyle}>Cargando información de la orden...</div>
            </div>
        );
    }

    if (error && !showFactura) {
        return (
            <div style={containerStyle}>
                <div style={cardStyle}>
                    <h1 style={titleStyle}>Pago QR</h1>
                    <p style={errorStyle}>{error}</p>
                    <button onClick={() => router.push('/')} style={buttonStyle}>
                        Volver al inicio
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            <div style={containerStyle}>
                <div style={cardStyle}>
                    <h1 style={titleStyle}>Pago con QR</h1>

                    {/* Resumen de la orden */}
                    <div style={orderSummaryStyle}>
                        <h3 style={{ margin: "0 0 0.5rem", fontSize: "1rem" }}>Resumen de tu pedido</h3>
                        {items.map((item, idx) => (
                            <div key={idx} style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem", fontSize: "0.875rem" }}>
                                <span>{item.quantity}x {item.dish?.name}</span>
                                <span>{formatCurrency(item.subtotal)}</span>
                            </div>
                        ))}
                        <div style={{ borderTop: "1px solid var(--border)", marginTop: "0.5rem", paddingTop: "0.5rem" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
                                <span>Total</span>
                                <span>{formatCurrency(total)}</span>
                            </div>
                        </div>
                    </div>

                    <p style={totalStyle}>Total a pagar: {formatCurrency(total)}</p>

                    <form onSubmit={handleSubmit}>
                        <input
                            type="email"
                            placeholder="Correo electrónico *"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            style={inputStyle}
                            required
                        />
                        {emailError && <p style={errorStyle}>{emailError}</p>}

                        <button
                            type="submit"
                            disabled={submitting}
                            style={submitting ? buttonDisabledStyle : buttonStyle}
                        >
                            {submitting ? 'Procesando...' : 'Confirmar Pago'}
                        </button>
                    </form>

                    {error && <p style={errorStyle}>{error}</p>}
                </div>
            </div>

            {/* Factura Final */}
            {showFactura && paymentData && (
                <FacturaFinal
                    isOpen={showFactura}
                    onClose={() => {
                        setShowFactura(false);
                        router.push('/');
                    }}
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
