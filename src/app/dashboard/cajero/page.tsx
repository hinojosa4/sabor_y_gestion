// src/app/dashboard/cajero/page.tsx
"use client";
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/useAuth';
import { CAJERO } from '@/lib/roles';
import { Search, DollarSign, Receipt, Clock, CheckCircle, X } from 'lucide-react';
import Link from 'next/link';
import { useTableData } from '@/hooks/useTableData';
import { PreinvoiceModal } from '@/components/caja/PreinvoiceModal';
import { PaymentModal } from '@/components/caja/PaymentModal';
import { formatShortOrderId } from '@/lib/orderDisplay';
import { AppNotice } from '@/components/ui/AppNotice';

interface ActiveOrder {
    _id: string;
    table_id?: string;
    daily_number?: number | null;
    status: string;
    createdAt?: string;
}

type OrderIdentifier = {
    id: string;
    dailyNumber?: number | null;
};

interface CashRegisterStatus {
    status: 'abierto' | 'cerrado';
    shiftName?: string;
    shiftStart?: string;
    shiftEnd?: string;
    message?: string;
}

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

const orderIdBadgeBaseStyle: React.CSSProperties = {
    maxWidth: 138,
    borderRadius: "9999px",
    padding: "0.35rem 0.55rem",
    fontSize: "0.7rem",
    fontWeight: 700,
    lineHeight: 1,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    border: "1px solid transparent",
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
    const [orderIdsByTable, setOrderIdsByTable] = useState<Record<string, OrderIdentifier>>({});
    const [successToast, setSuccessToast] = useState('');
    const [cashRegisterStatus, setCashRegisterStatus] = useState<CashRegisterStatus | null>(null);
    const [cashNotice, setCashNotice] = useState('');

    const { tables, loading, refreshTables } = useTableData(restaurantId);

    const fetchCashRegisterStatus = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch('/api/cash-register/current', {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            const data = await res.json();
            setCashRegisterStatus(data);
        } catch (error) {
            console.error('Error al cargar estado de caja:', error);
            setCashRegisterStatus(null);
        }
    }, []);

     const fetchActiveOrders = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            const headers: Record<string, string> = token
                ? { Authorization: `Bearer ${token}` }
                : {};
 
            const res = await fetch('/api/orders/active', { headers });
            const data = await res.json();
 
            const nextOrderIdsByTable: Record<string, OrderIdentifier> = {};
 
            if (!res.ok || !data?.ok || !Array.isArray(data.data)) {
                console.warn('No se pudieron cargar las ordenes activas:', data);
            } else {
                (data.data as ActiveOrder[]).forEach((order) => {
                    if (!order.table_id || !order._id) return;
                    if (!nextOrderIdsByTable[order.table_id]) {
                        nextOrderIdsByTable[order.table_id] = {
                            id: order._id,
                            dailyNumber: order.daily_number ?? null,
                        };
                    }
                });
            }
 
            const tablesNeedingFallback = tables.filter((table) =>
                table.status !== 'Libre' && !nextOrderIdsByTable[table._id]
            );
 
            const fallbackOrderIds = await Promise.all(
                tablesNeedingFallback.map(async (table) => {
                    try {
                        const preinvoiceRes = await fetch(`/api/orders/preinvoice/${encodeURIComponent(table._id)}`);
                        const preinvoiceData = await preinvoiceRes.json();
                        if (!preinvoiceRes.ok || !preinvoiceData.orderId) return null;
                        return [
                            table._id,
                            {
                                id: preinvoiceData.orderId,
                                dailyNumber: preinvoiceData.dailyNumber ?? null,
                            },
                        ] as const;
                    } catch (error) {
                        console.error(`Error al cargar prefactura de mesa ${table._id}:`, error);
                        return null;
                    }
                })
            );
 
            fallbackOrderIds.forEach((entry) => {
                if (!entry) return;
                const [tableId, orderIdentifier] = entry;
                nextOrderIdsByTable[tableId] = orderIdentifier;
            });
 
            setOrderIdsByTable(nextOrderIdsByTable);
        } catch (error) {
            console.warn('No se pudieron cargar las ordenes activas:', error);
            setOrderIdsByTable({});
        }
    }, [tables]);

    const normalizeSearch = (value: string) =>
        value
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim();

    const normalizedSearch = normalizeSearch(searchQuery);
    const tableNumberSearch = normalizedSearch.replace(/^mesa\s+/, "");
    const isExplicitTableSearch = /^mesa\s+\d+$/.test(normalizedSearch);
    const isNumericSearch = /^\d+$/.test(normalizedSearch);

    const filteredTables = tables.filter(table => {
        if (!normalizedSearch) return true;

        const tableNumber = table.number.toString();
        const tableLabel = `mesa ${tableNumber}`;
        const location = normalizeSearch(table.location);
        const status = normalizeSearch(table.status);

        if (isExplicitTableSearch) {
            return tableNumber === tableNumberSearch;
        }

        if (isNumericSearch) {
            return tableNumber === normalizedSearch;
        }

        return tableLabel.includes(normalizedSearch) ||
            location.includes(normalizedSearch) ||
            status.includes(normalizedSearch);
    });

    const billingTables = filteredTables.filter(t => t.status === 'Cuenta solicitada');
    const occupiedTables = filteredTables.filter(t =>
        t.status !== 'Cuenta solicitada' && t.status !== 'Libre'
    );
    const freeTables = filteredTables.filter(t => t.status === 'Libre');

    const handleTableClick = (tableId: string, tableNumber: number, status: string) => {
        if (cashRegisterStatus?.status === 'cerrado') {
            setCashNotice(
                cashRegisterStatus.message ||
                `La caja${cashRegisterStatus.shiftName ? ` de ${cashRegisterStatus.shiftName}` : ''} está cerrada. No se pueden registrar pagos.`
            );
            return;
        }

        if (status === 'Cuenta solicitada') {
            setSelectedTable({ id: tableId, number: tableNumber });
            setIsPreinvoiceOpen(true);
        }
    };
    const refreshTablesRef = useRef(refreshTables);
    const fetchActiveOrdersRef = useRef(fetchActiveOrders);
    const fetchCashRegisterStatusRef = useRef(fetchCashRegisterStatus);
    useEffect(() => {
    refreshTablesRef.current = refreshTables;
    }, [refreshTables]);

    useEffect(() => {
        fetchActiveOrdersRef.current = fetchActiveOrders;
    }, [fetchActiveOrders]);

    useEffect(() => {
        fetchCashRegisterStatusRef.current = fetchCashRegisterStatus;
    }, [fetchCashRegisterStatus]);

    useEffect(() => {
        fetchActiveOrders();
    }, [fetchActiveOrders]);

    useEffect(() => {
        fetchCashRegisterStatus();
    }, [fetchCashRegisterStatus]);

    useEffect(() => {
        if (!successToast) return;

        const timeoutId = window.setTimeout(() => setSuccessToast(''), 4200);
        return () => window.clearTimeout(timeoutId);
    }, [successToast]);

    useEffect(() => {
        if (!cashNotice) return;

        const timeoutId = window.setTimeout(() => setCashNotice(''), 5200);
        return () => window.clearTimeout(timeoutId);
    }, [cashNotice]);

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
        if (mounted) {
            refreshTablesRef.current();
            fetchActiveOrdersRef.current();
        }
        });

        // Mesa actualizada (pagado, cuenta solicitada)
        channel.bind("table:updated", () => {
        if (mounted) {
            refreshTablesRef.current();
            fetchActiveOrdersRef.current();
            fetchCashRegisterStatusRef.current();
        }
        });

        // Mesero pide cuenta
        channel.bind("table:bill_requested", () => {
        if (mounted) {
            refreshTablesRef.current();
            fetchActiveOrdersRef.current();
        }
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
    const formatShiftTime = (value?: string) =>
        value
            ? new Date(value).toLocaleTimeString('es-BO', {
                hour: '2-digit',
                minute: '2-digit',
            })
            : null;
    const shiftStartTime = formatShiftTime(cashRegisterStatus?.shiftStart);
    const shiftEndTime = formatShiftTime(cashRegisterStatus?.shiftEnd);
    const responsiveGrid: React.CSSProperties = {
        ...gridStyle,
        gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(300px, 1fr))",
    };

    const renderOrderIdentifier = (
        order: OrderIdentifier | undefined,
        variant: 'billing' | 'occupied' | 'free',
        fallback: React.ReactNode
    ) => {
        if (!order?.id) return fallback;

        const variants: Record<typeof variant, React.CSSProperties> = {
            billing: {
                backgroundColor: "#ffedd5",
                borderColor: "#fed7aa",
                color: "#c2410c",
            },
            occupied: {
                backgroundColor: "#eff6ff",
                borderColor: "#bfdbfe",
                color: "#1d4ed8",
            },
            free: {
                backgroundColor: "#dcfce7",
                borderColor: "#bbf7d0",
                color: "#15803d",
            },
        };

        return (
            <span
                style={{ ...orderIdBadgeBaseStyle, ...variants[variant] }}
                title={`/api/orders/${order.id}`}
                aria-label={`Orden ${formatShortOrderId(order.id, order.dailyNumber)}`}
            >
                {formatShortOrderId(order.id, order.dailyNumber)}
            </span>
        );
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
                        {cashRegisterStatus?.shiftName && (
                            <p style={{
                                margin: "0.2rem 0 0",
                                fontSize: "0.72rem",
                                color: cashRegisterStatus.status === 'abierto' ? "#16a34a" : "#dc2626",
                                fontWeight: 700,
                            }}>
                                {cashRegisterStatus.shiftName}
                                {shiftStartTime && shiftEndTime ? ` · ${shiftStartTime} - ${shiftEndTime}` : ''}
                                {cashRegisterStatus.status === 'cerrado' ? ' · Cerrado' : ' · Activo'}
                            </p>
                        )}
                    </div>
                </div>

                <div style={{ display: "flex", gap: "0.75rem" }}>
                    {cashRegisterStatus?.status === 'cerrado' ? (
                        <button
                            type="button"
                            onClick={() => setCashNotice(
                                cashRegisterStatus.message ||
                                `La caja${cashRegisterStatus.shiftName ? ` de ${cashRegisterStatus.shiftName}` : ''} ya está cerrada. No se pueden registrar pagos.`
                            )}
                            style={{
                                backgroundColor: "var(--muted)",
                                color: "var(--muted-foreground)",
                                border: `1px solid var(--border)`,
                                borderRadius: "var(--radius-md)",
                                padding: isMobile ? "10px 16px" : "11px 22px",
                                cursor: "not-allowed",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                fontFamily: "inherit",
                            }}
                        >
                            <Receipt size={16} />
                            Caja Cerrada
                        </button>
                    ) : (
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
                    )}

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
                {cashNotice && (
                    <div style={{
                        position: "fixed",
                        top: 18,
                        right: 18,
                        zIndex: 80,
                        width: "min(380px, calc(100vw - 32px))",
                    }}>
                        <AppNotice
                            type="warning"
                            title="Caja cerrada"
                            message={cashNotice}
                            onClose={() => setCashNotice('')}
                        />
                    </div>
                )}

                {successToast && (
                    <div
                        role="status"
                        aria-live="polite"
                        style={{
                            position: "fixed",
                            top: isMobile ? 86 : 92,
                            right: isMobile ? 12 : 24,
                            left: isMobile ? 12 : "auto",
                            zIndex: 80,
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            maxWidth: isMobile ? "none" : 420,
                            padding: "0.9rem 1rem",
                            backgroundColor: "var(--card)",
                            color: "var(--foreground)",
                            border: "1px solid #fed7aa",
                            borderLeft: "5px solid #ea580c",
                            borderRadius: "var(--radius-lg)",
                            boxShadow: "0 20px 45px rgba(3, 2, 19, 0.16)",
                        }}
                    >
                        <span
                            style={{
                                width: 38,
                                height: 38,
                                flex: "0 0 38px",
                                borderRadius: "9999px",
                                backgroundColor: "var(--primary)",
                                color: "var(--primary-foreground)",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <CheckCircle size={20} />
                        </span>
                        <div style={{ minWidth: 0, flex: 1 }}>
                            <p style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700 }}>
                                Pago registrado
                            </p>
                            <p style={{ margin: "0.15rem 0 0", fontSize: "0.82rem", color: "var(--muted-foreground)" }}>
                                {successToast}
                            </p>
                        </div>
                        <button
                            type="button"
                            aria-label="Cerrar notificación"
                            onClick={() => setSuccessToast('')}
                            style={{
                                width: 32,
                                height: 32,
                                border: "none",
                                borderRadius: "var(--radius-md)",
                                backgroundColor: "#fff7ed",
                                color: "#ea580c",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <X size={17} />
                        </button>
                    </div>
                )}

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
                                        {renderOrderIdentifier(
                                            orderIdsByTable[table._id],
                                            'billing',
                                            <div style={{ ...iconCircleStyle, backgroundColor: "#f97316" }}>
                                                <Receipt size={20} color="white" />
                                            </div>
                                        )}
                                    </div>
                                    <button style={{ ...buttonFullStyle, backgroundColor: "#ea580c", marginTop: "0.75rem" }}>
                                        {cashRegisterStatus?.status === 'cerrado' ? 'Caja cerrada' : 'Ver cuenta'}
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
                                        {renderOrderIdentifier(
                                            orderIdsByTable[table._id],
                                            'occupied',
                                            <div style={{ ...iconCircleStyle, backgroundColor: "var(--muted)" }}>
                                                <Clock size={20} color="var(--muted-foreground)" />
                                            </div>
                                        )}
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
                                        {renderOrderIdentifier(
                                            orderIdsByTable[table._id],
                                            'free',
                                            <div style={{ ...iconCircleStyle, backgroundColor: "#dcfce7" }}>
                                                <div style={{ width: 20, height: 20, borderRadius: "50%", backgroundColor: "#16a34a" }} />
                                            </div>
                                        )}
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
                    fetchActiveOrders();
                }}
                tableId={selectedTable?.id || ''}
                tableNumber={selectedTable?.number || 0}
                onPay={(orderId, total) => {
                    if (cashRegisterStatus?.status === 'cerrado') {
                        setCashNotice(
                            cashRegisterStatus.message ||
                            `La caja${cashRegisterStatus.shiftName ? ` de ${cashRegisterStatus.shiftName}` : ''} está cerrada. No se pueden registrar pagos.`
                        );
                        return;
                    }
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
                    refreshTables();
                    fetchActiveOrders();
                    fetchCashRegisterStatus();
                    setSuccessToast('El cobro se guardo. El comprobante esta listo para imprimir.');
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
