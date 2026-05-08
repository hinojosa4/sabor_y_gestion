"use client";
import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, DollarSign, CreditCard, Receipt, Printer } from 'lucide-react';
import Link from 'next/link';

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

// Estilos usando variables CSS del globals.css
const containerStyle: React.CSSProperties = {
    minHeight: "100vh",
    backgroundColor: "var(--background)",
    fontFamily: "inherit",
};

const headerStyle: React.CSSProperties = {
    backgroundColor: "var(--card)",
    borderBottom: `2px solid var(--primary)`,
    position: "sticky",
    top: 0,
    zIndex: 10,
};

const backButtonStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "var(--secondary)",
    border: `1px solid var(--border)`,
    borderRadius: "var(--radius-md)",
    width: 38,
    height: 38,
    cursor: "pointer",
    color: "var(--foreground)",
    textDecoration: "none",
    fontSize: 16,
};

const titleStyle: React.CSSProperties = {
    margin: 0,
    fontSize: "1.125rem",
    fontWeight: "var(--font-weight-medium)",
    color: "var(--foreground)",
};

const subtitleStyle: React.CSSProperties = {
    margin: "0.25rem 0 0",
    fontSize: "0.75rem",
    color: "var(--muted-foreground)",
};

const mainStyle: React.CSSProperties = {
    maxWidth: 896,
    margin: "0 auto",
    padding: "1.5rem 1rem",
};

const cardStyle: React.CSSProperties = {
    backgroundColor: "var(--card)",
    borderRadius: "var(--radius-lg)",
    border: `1px solid var(--border)`,
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
    marginBottom: "1.5rem",
    overflow: "hidden",
};

const cardHeaderStyle: React.CSSProperties = {
    padding: "1.5rem",
    borderBottom: `1px solid var(--border)`,
};

const cardTitleStyle: React.CSSProperties = {
    margin: 0,
    fontSize: "1.125rem",
    fontWeight: "var(--font-weight-medium)",
    color: "var(--foreground)",
};

const cardSubtitleStyle: React.CSSProperties = {
    margin: "0.25rem 0 0",
    fontSize: "0.75rem",
    color: "var(--muted-foreground)",
};

const gridStatsStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "1rem",
    padding: "1.5rem",
};

const statItemStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
};

const statLabelStyle: React.CSSProperties = {
    margin: 0,
    fontSize: "0.75rem",
    color: "var(--muted-foreground)",
};

const statValueStyle: React.CSSProperties = {
    margin: 0,
    fontSize: "1.25rem",
    fontWeight: "var(--font-weight-medium)",
    color: "var(--foreground)",
};

const statValueGreenStyle: React.CSSProperties = {
    ...statValueStyle,
    color: "#27ae60",
};

const gridPaymentsStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "1rem",
    padding: "1.5rem",
};

const paymentCardStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "1rem",
    borderRadius: "var(--radius-lg)",
};

const paymentLeftStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
};

const iconCircleStyle: React.CSSProperties = {
    borderRadius: "9999px",
    padding: "0.5rem",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
};

const paymentLabelStyle: React.CSSProperties = {
    margin: 0,
    fontSize: "0.75rem",
    color: "var(--muted-foreground)",
};

const paymentAmountStyle: React.CSSProperties = {
    margin: 0,
    fontSize: "1.125rem",
    fontWeight: "var(--font-weight-medium)",
};

const actionsStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "flex-end",
    gap: "0.75rem",
    marginTop: "0.5rem",
};

const printButtonStyle: React.CSSProperties = {
    backgroundColor: "transparent",
    border: `1px solid var(--border)`,
    borderRadius: "var(--radius-md)",
    padding: "0.5rem 1rem",
    fontSize: "0.875rem",
    fontWeight: "var(--font-weight-medium)",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "0.5rem",
    color: "var(--foreground)",
    fontFamily: "inherit",
};

const closeButtonStyle: React.CSSProperties = {
    backgroundColor: "var(--destructive)",
    border: "none",
    borderRadius: "var(--radius-md)",
    padding: "0.5rem 1rem",
    fontSize: "0.875rem",
    fontWeight: "var(--font-weight-medium)",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "0.5rem",
    color: "white",
    fontFamily: "inherit",
};

const closedContainerStyle: React.CSSProperties = {
    backgroundColor: "var(--card)",
    borderRadius: "var(--radius-lg)",
    border: `1px solid var(--border)`,
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
    padding: "3rem",
    textAlign: "center",
};

const closedTitleStyle: React.CSSProperties = {
    margin: "1rem 0 0.5rem",
    fontSize: "1.25rem",
    fontWeight: "var(--font-weight-medium)",
    color: "var(--foreground)",
};

const closedTextStyle: React.CSSProperties = {
    margin: "0 0 1rem",
    fontSize: "0.875rem",
    color: "var(--muted-foreground)",
};

const backButtonLargeStyle: React.CSSProperties = {
    backgroundColor: "var(--primary)",
    color: "var(--primary-foreground)",
    border: "none",
    borderRadius: "var(--radius-md)",
    padding: "0.5rem 1rem",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "0.5rem",
    fontFamily: "inherit",
    textDecoration: "none",
};

export default function CierreCajaPage() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<CashRegisterData | null>(null);
    const [closing, setClosing] = useState(false);

    const fetchCierreData = async () => {
        try {
            const res = await fetch('/api/cash-register/current');
            const result = await res.json();
            setData(result);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    // ── Pusher: escucha eventos de mesas y órdenes ────────────────────────────
    const fetchCierreDataRef = useRef(fetchCierreData);
    useEffect(() => {
        fetchCierreDataRef.current = fetchCierreData;
    });

    useEffect(() => {
        fetchCierreDataRef.current();

        let pusherInstance: InstanceType<typeof import("pusher-js")["default"]> | null = null;
        let mounted = true;

        const setup = async () => {
            const { default: Pusher } = await import("pusher-js");
            if (!mounted) return;

            pusherInstance = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
                cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
            });

            const channel = pusherInstance.subscribe("restaurant");

            channel.bind("order:new", () => {
                if (mounted) fetchCierreDataRef.current();
            });

            channel.bind("table:updated", () => {
                if (mounted) fetchCierreDataRef.current();
            });

            channel.bind("table:bill_requested", () => {
                if (mounted) fetchCierreDataRef.current();
            });
        };

        setup();

        return () => {
            mounted = false;
            pusherInstance?.unsubscribe("restaurant");
            pusherInstance?.disconnect();
        };
    }, []); // solo al montar

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
                fetchCierreDataRef.current();
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

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-BO', {
            style: 'currency',
            currency: 'BOB'
        }).format(amount);
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleString('es-BO');
    };

    if (loading) {
        return (
            <div style={containerStyle}>
                <div style={{ textAlign: "center", padding: "3rem", color: "var(--muted-foreground)" }}>
                    Cargando...
                </div>
            </div>
        );
    }

    const isMobile = typeof window !== "undefined" ? window.innerWidth < 640 : false;

    return (
        <div style={containerStyle}>
            {/* Header */}
            <header
                id="cash-closure-header"
                style={{
                    ...headerStyle,
                    padding: isMobile ? "14px 16px" : "18px 40px",
                    display: "flex",
                    alignItems: "center",
                    gap: isMobile ? 10 : 14,
                }}
            >
                <Link href="/dashboard/cajero" style={backButtonStyle}>
                    <ArrowLeft size={20} />
                </Link>
                <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: "var(--radius-lg)",
                    backgroundColor: "var(--primary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: isMobile ? 18 : 22,
                }}>
                    <Receipt size={isMobile ? 18 : 22} color="white" />
                </div>
                <div>
                    <h1 style={titleStyle}>Cierre de Caja</h1>
                    <p style={subtitleStyle}>Reporte de ventas del turno</p>
                </div>
            </header>

            <main style={mainStyle}>
                {data && data.status === 'abierto' ? (
                    <>
                        {/* Resumen del Turno */}
                        <div style={cardStyle}>
                            <div style={cardHeaderStyle}>
                                <h2 style={cardTitleStyle}>Resumen del Turno</h2>
                                <p style={cardSubtitleStyle}>
                                    Apertura: {formatDate(data.openingDate)}
                                </p>
                            </div>
                            <div style={gridStatsStyle}>
                                <div style={statItemStyle}>
                                    <p style={statLabelStyle}>Apertura</p>
                                    <p style={statValueStyle}>{formatCurrency(data.openingBalance)}</p>
                                </div>
                                <div style={statItemStyle}>
                                    <p style={statLabelStyle}>Ventas Totales</p>
                                    <p style={statValueGreenStyle}>{formatCurrency(data.salesTotal)}</p>
                                </div>
                                <div style={statItemStyle}>
                                    <p style={statLabelStyle}>Mesas Atendidas</p>
                                    <p style={statValueStyle}>{data.tablesServed}</p>
                                </div>
                                <div style={statItemStyle}>
                                    <p style={statLabelStyle}>Pedidos Totales</p>
                                    <p style={statValueStyle}>{data.ordersCount}</p>
                                </div>
                            </div>
                        </div>

                        {/* Desglose por Método de Pago */}
                        <div style={cardStyle}>
                            <div style={cardHeaderStyle}>
                                <h2 style={cardTitleStyle}>Desglose por Método de Pago</h2>
                            </div>
                            <div style={gridPaymentsStyle}>
                                <div style={{ ...paymentCardStyle, backgroundColor: "#e8f5e9" }}>
                                    <div style={paymentLeftStyle}>
                                        <div style={{ ...iconCircleStyle, backgroundColor: "#27ae60" }}>
                                            <DollarSign size={20} color="white" />
                                        </div>
                                        <div>
                                            <p style={paymentLabelStyle}>Efectivo</p>
                                            <p style={{ ...paymentAmountStyle, color: "#27ae60" }}>{formatCurrency(data.cashTotal)}</p>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ ...paymentCardStyle, backgroundColor: "#e3f2fd" }}>
                                    <div style={paymentLeftStyle}>
                                        <div style={{ ...iconCircleStyle, backgroundColor: "#1976d2" }}>
                                            <CreditCard size={20} color="white" />
                                        </div>
                                        <div>
                                            <p style={paymentLabelStyle}>QR/Digital</p>
                                            <p style={{ ...paymentAmountStyle, color: "#1976d2" }}>{formatCurrency(data.qrTotal)}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Acciones */}
                        <div className="print-actions" style={actionsStyle}>
                            <button style={printButtonStyle} onClick={() => window.print()}>
                                <Printer size={16} />
                                Imprimir
                            </button>
                            <button style={closeButtonStyle} onClick={handleCierre} disabled={closing}>
                                {closing ? 'Cerrando...' : 'Cerrar Caja'}
                            </button>
                        </div>
                    </>
                ) : (
                    <div style={closedContainerStyle}>
                        <Receipt size={64} style={{ color: "var(--muted-foreground)", margin: "0 auto 1rem" }} />
                        <h2 style={closedTitleStyle}>Caja Cerrada</h2>
                        <p style={closedTextStyle}>El cierre de caja fue realizado</p>
                        <Link href="/dashboard/cajero" style={backButtonLargeStyle}>
                            Volver al Panel
                        </Link>
                    </div>
                )}
            </main>
        </div>
    );
}