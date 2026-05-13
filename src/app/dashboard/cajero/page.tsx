// src/app/dashboard/cajero/page.tsx
"use client";
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/useAuth';
import { CAJERO } from '@/lib/roles';
import { Search, DollarSign, Receipt, Clock } from 'lucide-react';
import Link from 'next/link';
import { useTableData } from '@/hooks/useTableData';
import { PreinvoiceModal } from '@/components/caja/PreinvoiceModal';
import { PaymentModal } from '@/components/caja/PaymentModal';

const containerStyle: React.CSSProperties = {
    minHeight: "100vh",
    backgroundColor: "var(--background)",
    fontFamily: "inherit",
};

const mainStyle: React.CSSProperties = {
    maxWidth: 1280,
    margin: "0 auto",
    padding: "0.75rem 0.75rem",
};

const searchContainerStyle: React.CSSProperties = {
    marginBottom: "1.5rem",
    position: "relative",
};

const searchIconStyle: React.CSSProperties = {
    position: "absolute",
    left: "0.75rem",
    top: "50%",
    transform: "translateY(-50%)",
    color: "var(--muted-foreground)",
};

const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.5rem 0.75rem 0.5rem 2.5rem",
    borderRadius: "var(--radius-lg)",
    border: `1px solid var(--border)`,
    backgroundColor: "var(--input-background)",
    fontSize: "0.875rem",
    outline: "none",
    fontFamily: "inherit",
    color: "var(--foreground)",
};

const sectionStyle: React.CSSProperties = {
    marginBottom: "2rem",
};

const sectionHeaderStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    marginBottom: "1rem",
};

const sectionTitleStyle: React.CSSProperties = {
    margin: 0,
    fontSize: "1.125rem",
    fontWeight: "var(--font-weight-medium)",
    color: "var(--foreground)",
};

const badgeStyle: React.CSSProperties = {
    backgroundColor: "var(--muted)",
    color: "var(--muted-foreground)",
    fontSize: "0.75rem",
    padding: "0.125rem 0.5rem",
    borderRadius: "9999px",
};

const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "1rem",
};

// Card estilos
const billingCardStyle: React.CSSProperties = {
    cursor: "pointer",
    borderRadius: "var(--radius-lg)",
    border: "2px solid #f97316",
    backgroundColor: "#fff7ed",
    padding: "1rem",
    transition: "box-shadow 0.2s",
};

const occupiedCardStyle: React.CSSProperties = {
    borderRadius: "var(--radius-lg)",
    border: `1px solid var(--border)`,
    backgroundColor: "var(--card)",
    padding: "1rem",
    opacity: 0.7,
};

const freeCardStyle: React.CSSProperties = {
    borderRadius: "var(--radius-lg)",
    border: "1px solid #dcfce7",
    backgroundColor: "#f0fdf4",
    padding: "1rem",
    opacity: 0.6,
};

const cardHeaderStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
};

const tableNumberStyle: React.CSSProperties = {
    margin: 0,
    fontSize: "1.25rem",
    fontWeight: "bold",
};

const locationStyle: React.CSSProperties = {
    margin: 0,
    fontSize: "0.875rem",
    color: "var(--muted-foreground)",
};

const statusTextStyle: React.CSSProperties = {
    margin: "0.25rem 0 0",
    fontSize: "0.75rem",
    fontWeight: 500,
};

const iconCircleStyle: React.CSSProperties = {
    borderRadius: "9999px",
    padding: "0.75rem",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
};

const buttonFullStyle: React.CSSProperties = {
    width: "100%",
    marginTop: "0.75rem",
    backgroundColor: "var(--primary)",
    border: "none",
    borderRadius: "var(--radius-md)",
    padding: "0.5rem",
    fontSize: "0.875rem",
    fontWeight: "var(--font-weight-medium)",
    cursor: "pointer",
    color: "var(--primary-foreground)",
    fontFamily: "inherit",
};

const buttonOutlineFullStyle: React.CSSProperties = {
    ...buttonFullStyle,
    backgroundColor: "transparent",
    border: `1px solid var(--border)`,
    color: "var(--foreground)",
    cursor: "not-allowed",
};

const emptyStateStyle: React.CSSProperties = {
    textAlign: "center",
    padding: "3rem",
    color: "var(--muted-foreground)",
};

const loadingContainerStyle: React.CSSProperties = {
    minHeight: "100vh",
    backgroundColor: "var(--background)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
};

const spinnerStyle: React.CSSProperties = {
    border: "2px solid var(--muted)",
    borderTopColor: "var(--primary)",
    borderRadius: "50%",
    width: 48,
    height: 48,
    animation: "spin 1s linear infinite",
};

export default function CajeroDashboard() {
    const { user, loading: userLoading, logout } = useAuth(CAJERO);
    const restaurantId = "69e170e941daf8c2b2f76677";
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTable, setSelectedTable] = useState<{ id: string; number: number } | null>(null);
    const [isPreinvoiceOpen, setIsPreinvoiceOpen] = useState(false);

    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [currentOrderId, setCurrentOrderId] = useState('');
    const [currentTotal, setCurrentTotal] = useState(0);
    const [currentTableId, setCurrentTableId] = useState('');

    const { tables, loading, refreshTables } = useTableData(restaurantId);

    const filteredTables = tables.filter(table =>
        table.number.toString().includes(searchQuery) ||
        table.location.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const billingTables = filteredTables.filter(t => t.status === 'Cuenta solicitada');
    const occupiedTables = filteredTables.filter(t =>
        t.status !== 'Cuenta solicitada' && t.status !== 'Libre'
    );
    const freeTables = filteredTables.filter(t => t.status === 'Libre');

    const handleTableClick = (tableId: string, tableNumber: number, status: string) => {
        if (status === 'Cuenta solicitada') {
            setSelectedTable({ id: tableId, number: tableNumber });
            setIsPreinvoiceOpen(true);
        }
    };
    const refreshTablesRef = useRef(refreshTables);
    useEffect(() => {
    refreshTablesRef.current = refreshTables;
    }, [refreshTables]);

    useEffect(() => {
    let pusherInstance: InstanceType<typeof import("pusher-js")["default"]> | null = null;
    let mounted = true;

    const setup = async () => {
        const { default: Pusher } = await import("pusher-js");
        if (!mounted) return;

        pusherInstance = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        });

        const channel = pusherInstance.subscribe("restaurant");

        // Nueva orden creada → puede cambiar estado de mesa
        channel.bind("order:new", () => {
        if (mounted) refreshTablesRef.current();
        });

        // Mesa actualizada (pagado, cuenta solicitada)
        channel.bind("table:updated", () => {
        if (mounted) refreshTablesRef.current();
        });

        // Mesero pide cuenta
        channel.bind("table:bill_requested", () => {
        if (mounted) refreshTablesRef.current();
        });
    };

    setup();

    return () => {
        mounted = false;
        pusherInstance?.unsubscribe("restaurant");
        pusherInstance?.disconnect();
    };
    }, []); // solo al montar
    
    if (userLoading || loading) {
        return (
            <div style={loadingContainerStyle}>
                <div style={spinnerStyle}></div>
            </div>
        );
    }

    if (!user) return null;

    if (loading) {
        return (
            <div style={loadingContainerStyle}>
                <div style={spinnerStyle}></div>
            </div>
        );
    }

    const isMobile = typeof window !== "undefined" ? window.innerWidth < 640 : false;
    const responsiveGrid: React.CSSProperties = {
        ...gridStyle,
        gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(300px, 1fr))",
    };

    return (
        <div style={containerStyle}>
            <header style={{
                backgroundColor: "var(--card)",
                borderBottom: `2px solid var(--primary)`,
                position: "sticky",
                top: 0,
                zIndex: 10,
                padding: isMobile ? "14px 16px" : "18px 40px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 10 : 14, minWidth: 0 }}>
                    {/* Icono */}
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
                        <h1 style={{ margin: 0 }}>Panel de Cajero</h1>
                        <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--muted-foreground)" }}>Gestiona pagos y facturación</p>
                    </div>
                </div>

                <div style={{ display: "flex", gap: "0.75rem" }}>
                    <Link href="/dashboard/cajero/cierre-caja" style={{
                        backgroundColor: "var(--primary)",
                        color: "var(--primary-foreground)",
                        border: "none",
                        borderRadius: "var(--radius-md)",
                        padding: isMobile ? "10px 16px" : "11px 22px",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        fontFamily: "inherit",
                        textDecoration: "none",
                    }}>
                        <Receipt size={16} />
                        Cierre de Caja
                    </Link>

                    {/* Botón Salir */}
                    <button
                        onClick={() => logout()}
                        style={{
                            backgroundColor: "transparent",
                            border: `1px solid var(--border)`,
                            borderRadius: "var(--radius-md)",
                            padding: isMobile ? "10px 16px" : "11px 22px",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            fontFamily: "inherit",
                            color: "var(--foreground)",
                        }}
                    >
                        Salir
                    </button>
                </div>
            </header>

            <main style={mainStyle}>
                <div style={searchContainerStyle}>
                    <Search size={16} style={searchIconStyle} />
                    <input
                        type="text"
                        placeholder="Buscar mesa por número o ubicación..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={inputStyle}
                    />
                </div>

                {/* Cuentas por Cobrar */}
                {billingTables.length > 0 && (
                    <div style={sectionStyle}>
                        <div style={sectionHeaderStyle}>
                            <DollarSign size={20} color="#ea580c" />
                            <h2 style={sectionTitleStyle}>Cuentas por Cobrar</h2>
                            <span style={{ ...badgeStyle, backgroundColor: "#fff7ed", color: "#ea580c" }}>
                                {billingTables.length}
                            </span>
                        </div>
                        <div style={responsiveGrid}>
                            {billingTables.map((table) => (
                                <div
                                    key={table._id}
                                    onClick={() => handleTableClick(table._id, table.number, table.status)}
                                    style={billingCardStyle}
                                >
                                    <div style={cardHeaderStyle}>
                                        <div>
                                            <h3 style={{ ...tableNumberStyle, color: "#ea580c" }}>Mesa {table.number}</h3>
                                            <p style={locationStyle}>{table.location}</p>
                                            <p style={{ ...statusTextStyle, color: "#ea580c" }}>Solicita cuenta</p>
                                        </div>
                                        <div style={{ ...iconCircleStyle, backgroundColor: "#f97316" }}>
                                            <Receipt size={20} color="white" />
                                        </div>
                                    </div>
                                    <button style={{ ...buttonFullStyle, backgroundColor: "#ea580c", marginTop: "0.75rem" }}>
                                        Ver cuenta
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Mesas Ocupadas */}
                {occupiedTables.length > 0 && (
                    <div style={sectionStyle}>
                        <div style={sectionHeaderStyle}>
                            <Clock size={20} color="#2563eb" />
                            <h2 style={sectionTitleStyle}>Mesas en Servicio</h2>
                            <span style={{ ...badgeStyle, backgroundColor: "#eff6ff", color: "#2563eb" }}>
                                {occupiedTables.length}
                            </span>
                        </div>
                        <div style={responsiveGrid}>
                            {occupiedTables.map((table) => (
                                <div key={table._id} style={occupiedCardStyle}>
                                    <div style={cardHeaderStyle}>
                                        <div>
                                            <h3 style={{ ...tableNumberStyle, color: "var(--foreground)" }}>Mesa {table.number}</h3>
                                            <p style={locationStyle}>{table.location}</p>
                                            <p style={{ ...statusTextStyle, color: "#2563eb" }}>
                                                {table.status === 'Ocupada' ? 'En servicio' : 'Reservada'}
                                            </p>
                                        </div>
                                        <div style={{ ...iconCircleStyle, backgroundColor: "var(--muted)" }}>
                                            <Clock size={20} color="var(--muted-foreground)" />
                                        </div>
                                    </div>
                                    <button style={buttonOutlineFullStyle} disabled>
                                        Esperando solicitud
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Mesas Libres */}
                {freeTables.length > 0 && (
                    <div style={sectionStyle}>
                        <div style={sectionHeaderStyle}>
                            <h2 style={sectionTitleStyle}>Mesas Libres</h2>
                            <span style={{ ...badgeStyle, backgroundColor: "#dcfce7", color: "#16a34a" }}>
                                {freeTables.length}
                            </span>
                        </div>
                        <div style={responsiveGrid}>
                            {freeTables.map((table) => (
                                <div key={table._id} style={freeCardStyle}>
                                    <div style={cardHeaderStyle}>
                                        <div>
                                            <h3 style={{ ...tableNumberStyle, color: "#16a34a" }}>Mesa {table.number}</h3>
                                            <p style={locationStyle}>{table.location}</p>
                                        </div>
                                        <div style={{ ...iconCircleStyle, backgroundColor: "#dcfce7" }}>
                                            <div style={{ width: 20, height: 20, borderRadius: "50%", backgroundColor: "#16a34a" }} />
                                        </div>
                                    </div>
                                    <button style={buttonOutlineFullStyle} disabled>
                                        Disponible
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {filteredTables.length === 0 && (
                    <div style={emptyStateStyle}>
                        <p>No se encontraron mesas</p>
                    </div>
                )}
            </main>

            <PreinvoiceModal
                isOpen={isPreinvoiceOpen}
                onClose={() => {
                    setIsPreinvoiceOpen(false);
                    setSelectedTable(null);
                    refreshTables();
                }}
                tableId={selectedTable?.id || ''}
                tableNumber={selectedTable?.number || 0}
                onPay={(orderId, total) => {
                    setIsPreinvoiceOpen(false);
                    setCurrentOrderId(orderId);
                    setCurrentTotal(total);
                    setCurrentTableId(selectedTable?.id || '');
                    setIsPaymentModalOpen(true);
                }}
                onPrint={() => {
                    window.print();
                }}
            />

            <PaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => {
                    setIsPaymentModalOpen(false);
                    setCurrentOrderId('');
                    setCurrentTableId('');
                    setSelectedTable(null);
                }}
                orderId={currentOrderId}
                tableId={currentTableId}
                tableNumber={selectedTable?.number || 0}  // 👈 agregar esta línea
                totalAmount={currentTotal}
                onSuccess={() => {
                    setIsPaymentModalOpen(false);
                    refreshTables();
                    alert('Pago registrado exitosamente');
                }}
            />

            <style jsx>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}