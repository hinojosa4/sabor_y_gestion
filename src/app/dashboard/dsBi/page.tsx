// src/app/dashboard/dsBi/page.tsx
"use client";
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/useAuth';
import { ADMIN } from '@/lib/roles';
import { Printer, Calendar, DollarSign, CreditCard, Users, BarChart3, LineChart, TrendingUp, TrendingDown } from 'lucide-react';
import Link from 'next/link';
import {
    BarChart,
    Bar,
    LineChart as ReLineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Area,
    ComposedChart
} from 'recharts';

interface IncomeReport {
    totalSales: number;
    cashTotal: number;
    qrTotal: number;
    ordersCount: number;
    tablesServed: number;
    dailyIncome: Record<string, number>;
    compareTotal?: number;
    compareDailyIncome: Record<string, number>;
    monthlyIncome: Record<string, number>;
    period: {
        startDate: string;
        endDate: string;
        compareStartDate: string | null;
        compareEndDate: string | null;
    };
}

interface MetricsData {
    topWaiters: Array<{ id: string; name: string; total: number; count?: number }>;
    topDishes: Array<{ id: string; name: string; quantity: number; total: number }>;
    bestDay: { date: string; amount: number } | null;
    peakHour: { hour: string; amount: number } | null;
    topTables: Array<{ id: string; number: number; total: number }>;
    cancellationRate: number;
    totalOrders: number;
    completedPayments: number;
    topCustomers: Array<{ email: string; name: string; total: number }>;
    loyaltyPointsUsed: number;
    dineInRevenue?: number;
    deliveryRevenue?: number;
    dineInOrders?: number;
    deliveryOrders?: number;
    avgDineIn?: number;
    avgDelivery?: number;
    dineInOrdersCount?: number;
    deliveryOrdersCount?: number;
    dineInCompleted?: number;
    deliveryCompleted?: number;
    dineInCancelled?: number;
    deliveryCancelled?: number;
    dineInInProgress?: number;
    deliveryInProgress?: number;
    inProgressOrders?: number;
    cancelledOrdersCount?: number;
    avgCompletionTime?: number;
    topWaiter?: { name: string; count: number; total: number } | null;
    tablesServedToday?: number;
    totalCustomers?: number;
    newCustomers?: number;
    recurringCustomers?: number;
    customerAvgSpent?: Array<{ email: string; avg: number; total: number; orders: number }>;
    mostLoyal?: { email: string; name?: string; count: number; total: number } | null;
    loyaltyData?: Array<{ email: string; points: number; tier: { name: string; color: string }; orders: number; total: number }>;
    customerLastVisit?: Record<string, string>;
    customerOrders?: Record<string, number>;
    customerTotalSpent?: Record<string, number>;
    mesaDetalle?: Array<{
        tableId: string;
        number: number;
        location: string;
        totalPedidos: number;
        totalIngresos: number;
        promedio: number;
        pedidos: Array<{
            orderId: string;
            fecha: string;
            total: number;
            status: string;
            items: Array<{
                name: string;
                quantity: number;
                price: number;
                subtotal: number;
            }>;
        }>;
    }>;
    topHours?: Array<{
        hour: string;
        count: number;
        total: number;
        orders: Array<{
            orderId: string;
            total: number;
            status: string;
            service_type: string;
        }>;
    }>;
    topCancellationDays?: Array<{
        date: string;
        count: number;
    }>;
    serviceByHourArray?: Array<{
        hour: string;
        dine_in: number;
        delivery: number;
        total: number;
    }>;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(amount);
};

const formatDateKey = (dateKey: string) => {
    const [year, month, day] = dateKey.split('-');
    return `${parseInt(day)}/${parseInt(month)}/${year}`;
};

type ChartType = 'bar' | 'line' | 'area';

const getLocalDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export default function DashboardBIPage() {
    const { user, loading: userLoading } = useAuth(ADMIN);
    const [activeTab, setActiveTab] = useState('resumen');
    const [periodType, setPeriodType] = useState<'day' | 'month' | 'year'>('day');
    const [selectedDay, setSelectedDay] = useState(getLocalDate);
    const [selectedMonth, setSelectedMonth] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
    const [compare] = useState<'none' | 'previous_month' | 'previous_year'>('none');
    const [report, setReport] = useState<IncomeReport | null>(null);
    const [metrics, setMetrics] = useState<MetricsData | null>(null);
    const [loading, setLoading] = useState(false);
    const [metricsLoading, setMetricsLoading] = useState(false);
    const [chartType, setChartType] = useState<ChartType>('bar');
    const dineInRevenue = metrics?.dineInRevenue || 0;
    const deliveryRevenue = metrics?.deliveryRevenue || 0;
    const dineInOrders = metrics?.dineInOrders || 0;
    const deliveryOrders = metrics?.deliveryOrders || 0;
    const avgDineIn = metrics?.avgDineIn || 0;
    const avgDelivery = metrics?.avgDelivery || 0;
    const [expandedMesa, setExpandedMesa] = useState<string | null>(null);

    const toggleMesa = (tableId: string) => {
        setExpandedMesa(expandedMesa === tableId ? null : tableId);
    };

    // ========== FETCH FUNCTIONS ==========
    const fetchReport = useCallback(async () => {
        setLoading(true);
        let params = '';
        if (periodType === 'day') params = `type=day&value=${selectedDay}`;
        if (periodType === 'month') {
            params = `type=month&value=${selectedMonth}`;
            if (compare === 'previous_month') params += '&compare=previous_month';
        }
        if (periodType === 'year') {
            params = `type=year&value=${selectedYear}`;
            if (compare === 'previous_year') params += '&compare=previous_year';
        }

        try {
            const res = await fetch(`/api/dsBi/income?${params}`);
            const data = await res.json();
            setReport(data);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    }, [periodType, selectedDay, selectedMonth, selectedYear, compare]);

    const fetchMetrics = useCallback(async () => {
        setMetricsLoading(true);
        let params = '';
        if (periodType === 'day') params = `type=day&value=${selectedDay}`;
        if (periodType === 'month') params = `type=month&value=${selectedMonth}`;
        if (periodType === 'year') params = `type=year&value=${selectedYear}`;

        try {
            const res = await fetch(`/api/dsBi/metrics?${params}`);
            const data = await res.json();
            setMetrics(data);
        } catch (error) {
            console.error('Error cargando métricas:', error);
        } finally {
            setMetricsLoading(false);
        }
    }, [periodType, selectedDay, selectedMonth, selectedYear]);

    useEffect(() => {
        fetchReport();
        fetchMetrics();
    }, [fetchReport, fetchMetrics]);

    // ========== RENDER CHART ==========
    const getChartData = () => {
        if (!report) return [];

        if (periodType === 'year') {
            return Object.entries(report.monthlyIncome || {}).map(([month, amount]) => ({
                name: month,
                ingresos: amount,
            }));
        } else if (periodType === 'month') {
            const [year, month] = selectedMonth.split('-');
            const data = Object.entries(report.dailyIncome || {})
                .filter(([date]) => {
                    const [dateYear, dateMonth] = date.split('-');
                    return dateYear === year && dateMonth === month;
                })
                .map(([date, amount]) => ({
                    name: formatDateKey(date),
                    ingresos: amount,
                }));

            data.sort((a, b) => {
                const [dayA, monthA, yearA] = a.name.split('/');
                const [dayB, monthB, yearB] = b.name.split('/');
                const dateA = new Date(parseInt(yearA), parseInt(monthA) - 1, parseInt(dayA));
                const dateB = new Date(parseInt(yearB), parseInt(monthB) - 1, parseInt(dayB));
                return dateA.getTime() - dateB.getTime();
            });

            if (report.compareDailyIncome && Object.keys(report.compareDailyIncome).length > 0) {
                return data.map(item => ({
                    ...item,
                    comparativo: report.compareDailyIncome[Object.keys(report.dailyIncome).find(
                        d => formatDateKey(d) === item.name
                    ) || ''] || 0
                }));
            }
            return data;
        }
        return [];
    };

    const renderChart = () => {
        const data = getChartData();
        if (data.length === 0) return <p>No hay datos para mostrar</p>;

        const hasComparison = report?.compareTotal !== undefined && report.compareTotal > 0;

        switch (chartType) {
            case 'bar':
                return (
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis tickFormatter={(v) => `Bs${v}`} />
                            <Tooltip formatter={(v) => formatCurrency(v as number)} />
                            <Legend />
                            <Bar dataKey="ingresos" name="Ingresos" fill="#e85d26" radius={[4, 4, 0, 0]} />
                            {hasComparison && (
                                <Bar dataKey="comparativo" name="Período anterior" fill="#8884d8" radius={[4, 4, 0, 0]} />
                            )}
                        </BarChart>
                    </ResponsiveContainer>
                );
            case 'line':
                return (
                    <ResponsiveContainer width="100%" height={300}>
                        <ReLineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis tickFormatter={(v) => `Bs${v}`} />
                            <Tooltip formatter={(v) => formatCurrency(v as number)} />
                            <Legend />
                            <Line type="monotone" dataKey="ingresos" name="Ingresos" stroke="#e85d26" strokeWidth={2} dot={{ r: 4 }} />
                            {hasComparison && (
                                <Line type="monotone" dataKey="comparativo" name="Período anterior" stroke="#8884d8" strokeWidth={2} dot={{ r: 4 }} />
                            )}
                        </ReLineChart>
                    </ResponsiveContainer>
                );
            case 'area':
                return (
                    <ResponsiveContainer width="100%" height={300}>
                        <ComposedChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis tickFormatter={(v) => `Bs${v}`} />
                            <Tooltip formatter={(v) => formatCurrency(v as number)} />
                            <Legend />
                            <Area type="monotone" dataKey="ingresos" name="Ingresos" fill="#e85d26" stroke="#e85d26" fillOpacity={0.3} />
                            {hasComparison && (
                                <Area type="monotone" dataKey="comparativo" name="Período anterior" fill="#8884d8" stroke="#8884d8" fillOpacity={0.3} />
                            )}
                        </ComposedChart>
                    </ResponsiveContainer>
                );
            default:
                return null;
        }
    };

    const renderWaitersChart = () => {
        if (!metrics?.topWaiters || metrics.topWaiters.length === 0) return <p style={{ textAlign: "center", padding: "2rem" }}>No hay datos para mostrar</p>;
        const data = [...metrics.topWaiters].sort((a, b) => b.total - a.total);
        return (
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data} layout="vertical" margin={{ left: 50, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tickFormatter={(v) => `Bs${v}`} />
                    <YAxis dataKey="name" type="category" width={80} style={{ fontSize: '0.75rem' }} />
                    <Tooltip formatter={(value, name, entry) => {
                        const count = entry?.payload?.count || 0;
                        return [
                            `${formatCurrency(value as number)} (${count} ${count === 1 ? 'pedido' : 'pedidos'})`,
                            'Total Facturado'
                        ];
                    }} />
                    <Bar dataKey="total" name="Total Facturado" fill="#8884d8" radius={[0, 4, 4, 0]} />
                </BarChart>
            </ResponsiveContainer>
        );
    };

    // ========== ESTILOS ==========
    const cardStyle: React.CSSProperties = {
        backgroundColor: "var(--card)",
        borderRadius: "var(--radius-lg)",
        border: `1px solid var(--border)`,
        padding: "1.5rem",
        marginBottom: "1.5rem",
    };

    const statsGridStyle: React.CSSProperties = {
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "1.5rem",
        marginBottom: "1.5rem",
    };

    const statCardStyle: React.CSSProperties = {
        backgroundColor: "var(--card)",
        borderRadius: "var(--radius-lg)",
        border: `1px solid var(--border)`,
        padding: "1rem",
        textAlign: "center",
    };

    const buttonStyle: React.CSSProperties = {
        backgroundColor: "var(--primary)",
        color: "var(--primary-foreground)",
        border: "none",
        borderRadius: "var(--radius-md)",
        padding: "0.5rem 1rem",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: "0.5rem",
    };

    const chartTypeButtonStyle = (active: boolean): React.CSSProperties => ({
        backgroundColor: active ? "var(--primary)" : "var(--muted)",
        color: active ? "var(--primary-foreground)" : "var(--foreground)",
        border: "none",
        borderRadius: "var(--radius-md)",
        padding: "0.5rem 1rem",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: "0.5rem",
        fontSize: "0.875rem",
    });

    const tabStyle = (active: boolean): React.CSSProperties => ({
        padding: "8px 20px",
        borderRadius: "var(--radius-md)",
        fontSize: "0.875rem",
        fontWeight: 600,
        cursor: "pointer",
        backgroundColor: active ? "var(--primary)" : "transparent",
        color: active ? "var(--primary-foreground)" : "var(--foreground)",
        border: "none",
        fontFamily: "inherit",
        transition: "all 0.2s",
    });

    const tabsContainerStyle: React.CSSProperties = {
        display: "flex",
        gap: "4px",
        marginBottom: "1.5rem",
        backgroundColor: "var(--muted)",
        padding: "4px",
        borderRadius: "var(--radius-lg)",
        flexWrap: "wrap",
    };

    const selectStyle: React.CSSProperties = {
        padding: "0.5rem",
        borderRadius: "var(--radius-md)",
        border: `1px solid var(--border)`,
        backgroundColor: "var(--input-background)",
        color: "var(--foreground)",
        fontSize: "0.875rem",
    };

    const headerStyle: React.CSSProperties = {
        backgroundColor: "var(--card)",
        borderBottom: `2px solid var(--primary)`,
        position: "sticky",
        top: 0,
        zIndex: 10,
        padding: "18px 40px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
    };

    const filterBarStyle: React.CSSProperties = {
        backgroundColor: "var(--card)",
        borderBottom: `1px solid var(--border)`,
        padding: "12px 40px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "12px",
        position: "sticky",
        top: "72px",
        zIndex: 9,
    };

    const containerStyle: React.CSSProperties = {
        minHeight: "100vh",
        backgroundColor: "var(--background)",
        fontFamily: "inherit",
    };

    const mainStyle: React.CSSProperties = {
        maxWidth: 1280,
        margin: "0 auto",
        padding: "1.5rem",
    };

    if (userLoading || !user) return null;
    const isMobile = typeof window !== "undefined" ? window.innerWidth < 640 : false;

    return (
        <div style={containerStyle}>
            {/* Header */}
            <header style={headerStyle}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: "var(--radius-lg)",
                        backgroundColor: "var(--primary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}>
                        <DollarSign size={22} color="white" />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "bold" }}>Dashboard BI</h1>
                        <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--muted-foreground)" }}>
                            Análisis de ventas, tendencias y rendimiento del negocio
                        </p>
                    </div>
                </div>
                <div style={{ display: "flex", gap: "0.75rem" }}>
                    <Link href="/dashboard" style={{ ...buttonStyle, backgroundColor: "transparent", border: `1px solid var(--border)`, color: "var(--foreground)", textDecoration: "none" }}>
                        Volver
                    </Link>
                    <button onClick={() => window.print()} style={buttonStyle}>
                        <Printer size={16} /> Imprimir
                    </button>
                </div>
            </header>

            {/* Filtros */}
            <div style={filterBarStyle}>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                    <select
                        value={periodType}
                        onChange={(e) => setPeriodType(e.target.value as 'day' | 'month' | 'year')}
                        style={selectStyle}
                    >
                        <option value="day">Día</option>
                        <option value="month">Mes</option>
                        <option value="year">Año</option>
                    </select>

                    {periodType === 'day' && (
                        <input
                            type="date"
                            value={selectedDay}
                            onChange={(e) => setSelectedDay(e.target.value)}
                            style={selectStyle}
                        />
                    )}

                    {periodType === 'month' && (
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            style={selectStyle}
                        />
                    )}

                    {periodType === 'year' && (
                        <input
                            type="number"
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            style={selectStyle}
                            min={2020}
                            max={new Date().getFullYear()}
                        />
                    )}

                    <button onClick={() => { fetchReport(); fetchMetrics(); }} style={buttonStyle}>
                        <Calendar size={16} /> Consultar
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ maxWidth: 1280, margin: "0 auto", padding: "1.5rem 1.5rem 0 1.5rem" }}>
                <div style={tabsContainerStyle}>
                    {['resumen', 'ganancias', 'meseros', 'platos', 'horarios', 'mesas', 'clientes', 'eficiencia'].map((tab) => {
                        const labels: Record<string, string> = {
                            resumen: '📊 Resumen',
                            ganancias: '💰 Ganancias',
                            meseros: '🥇 Meseros',
                            platos: '🍽️ Platos',
                            horarios: '📅 Horarios',
                            mesas: '🪑 Mesas',
                            clientes: '👥 Clientes',
                            eficiencia: '⚡ Eficiencia'
                        };
                        return (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                style={tabStyle(activeTab === tab)}
                            >
                                {isMobile ? labels[tab].split(' ')[0] : labels[tab]}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Contenido */}
            <main style={mainStyle}>
                {loading || metricsLoading ? (
                    <div style={{ textAlign: "center", padding: "3rem", color: "var(--muted-foreground)" }}>
                        Cargando...
                    </div>
                ) : (
                    <>
                        {/* ====== TAB: RESUMEN ====== */}
                        {activeTab === 'resumen' && (
                            <>
                                {/* Stats Cards */}
                                <div style={statsGridStyle}>
                                    <div style={statCardStyle}>
                                        <DollarSign size={24} style={{ margin: "0 auto 0.5rem", color: "var(--primary)" }} />
                                        <h3 style={{ fontSize: "1.5rem", fontWeight: "bold", margin: 0 }}>{formatCurrency(report?.totalSales || 0)}</h3>
                                        <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", margin: 0 }}>Ventas Totales</p>
                                        {report?.compareTotal !== undefined && report.compareTotal > 0 && (
                                            <p style={{ fontSize: "0.7rem", marginTop: "0.25rem", color: (report.totalSales || 0) >= report.compareTotal ? "#27ae60" : "#e85d26" }}>
                                                {(report.totalSales || 0) >= report.compareTotal ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                                {Math.abs(((report.totalSales - report.compareTotal) / report.compareTotal) * 100).toFixed(1)}% vs período anterior
                                            </p>
                                        )}
                                    </div>
                                    <div style={statCardStyle}>
                                        <CreditCard size={24} style={{ margin: "0 auto 0.5rem", color: "#27ae60" }} />
                                        <h3 style={{ fontSize: "1.5rem", fontWeight: "bold", margin: 0 }}>{formatCurrency(report?.cashTotal || 0)}</h3>
                                        <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", margin: 0 }}>Efectivo</p>
                                    </div>
                                    <div style={statCardStyle}>
                                        <CreditCard size={24} style={{ margin: "0 auto 0.5rem", color: "#1976d2" }} />
                                        <h3 style={{ fontSize: "1.5rem", fontWeight: "bold", margin: 0 }}>{formatCurrency(report?.qrTotal || 0)}</h3>
                                        <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", margin: 0 }}>QR / Digital</p>
                                    </div>
                                    <div style={statCardStyle}>
                                        <Users size={24} style={{ margin: "0 auto 0.5rem", color: "var(--primary)" }} />
                                        <h3 style={{ fontSize: "1.5rem", fontWeight: "bold", margin: 0 }}>{report?.tablesServed || 0}</h3>
                                        <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", margin: 0 }}>Mesas Atendidas</p>
                                    </div>
                                </div>

                                {/* Gráfico */}
                                {periodType === 'day' ? (
                                    <div style={{ ...cardStyle, textAlign: "center", padding: "3rem" }}>
                                        <p style={{ margin: "1rem 0", color: "var(--muted-foreground)", fontSize: "1rem" }}>
                                            📊 Vista de día: No hay gráfico disponible para un solo día.
                                        </p>
                                        <p style={{ margin: "1rem 0", color: "var(--muted-foreground)", fontSize: "0.875rem" }}>
                                            Selecciona un <strong>mes</strong> o <strong>año</strong> para ver tendencias y gráficos.
                                        </p>
                                    </div>
                                ) : (
                                    <div style={cardStyle}>
                                        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginBottom: "1rem" }}>
                                            <button onClick={() => setChartType('bar')} style={chartTypeButtonStyle(chartType === 'bar')}>
                                                <BarChart3 size={16} /> Barras
                                            </button>
                                            <button onClick={() => setChartType('line')} style={chartTypeButtonStyle(chartType === 'line')}>
                                                <LineChart size={16} /> Líneas
                                            </button>
                                            <button onClick={() => setChartType('area')} style={chartTypeButtonStyle(chartType === 'area')}>
                                                <BarChart3 size={16} /> Área
                                            </button>
                                        </div>
                                        <div style={{ width: "100%", height: 320 }}>
                                            {renderChart()}
                                        </div>
                                    </div>
                                )}

                                {/* Tabla de ingresos */}
                                <div style={cardStyle}>
                                    <h2 style={{ fontSize: "1.125rem", fontWeight: "bold", marginBottom: "1rem" }}>
                                        {periodType === 'year' ? 'Ingresos por Mes' : 'Ingresos por Día'}
                                    </h2>
                                    <div style={{ overflowX: "auto" }}>
                                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                            <thead>
                                                <tr>
                                                    <th style={{ textAlign: "left", padding: "0.75rem", borderBottom: `1px solid var(--border)`, fontWeight: "bold" }}>
                                                        {periodType === 'year' ? 'Mes' : 'Fecha'}
                                                    </th>
                                                    <th style={{ textAlign: "right", padding: "0.75rem", borderBottom: `1px solid var(--border)`, fontWeight: "bold" }}>Total</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {Object.entries(periodType === 'year' ? (report?.monthlyIncome || {}) : (report?.dailyIncome || {})).map(([key, amount]) => (
                                                    <tr key={key}>
                                                        <td style={{ padding: "0.5rem 0.75rem", borderBottom: `1px solid var(--border)` }}>
                                                            {periodType === 'year' ? key : formatDateKey(key)}
                                                        </td>
                                                        <td style={{ textAlign: "right", padding: "0.5rem 0.75rem", borderBottom: `1px solid var(--border)` }}>
                                                            {formatCurrency(amount as number)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div style={{ ...cardStyle, textAlign: "center" }}>
                                    <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)" }}>
                                        Período: {periodType === 'day'
                                            ? `${formatDateKey(selectedDay)} - ${formatDateKey(selectedDay)}`
                                            : periodType === 'month'
                                                ? `${formatDateKey(`${selectedMonth}-01`)} - ${formatDateKey(`${selectedMonth}-${new Date(parseInt(selectedMonth.split('-')[0]), parseInt(selectedMonth.split('-')[1]), 0).getDate()}`)}`
                                                : `${formatDateKey(`${selectedYear}-01-01`)} - ${formatDateKey(`${selectedYear}-12-31`)}`}
                                    </p>
                                    <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)" }}>
                                        Pedidos pagados: {report?.ordersCount || 0}
                                    </p>
                                </div>
                            </>
                        )}

                        {/* ====== TAB: GANANCIAS ====== */}
                        {activeTab === 'ganancias' && report && (
                            <div>
                                <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "1.5rem" }}>💰 Análisis de Ganancias</h2>

                                {/* ====== 1. RESTAURANTE | DELIVERY ====== */}
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1.5rem" }}>

                                    {/* Restaurante */}
                                    <div style={statCardStyle}>
                                        <div style={{ textAlign: "center", marginBottom: "0.5rem" }}>
                                            <span style={{ fontSize: "2rem" }}>🍽️</span>
                                            <h3 style={{ fontSize: "1rem", fontWeight: "bold", margin: "0.25rem 0", color: "#27ae60" }}>Restaurante</h3>
                                        </div>
                                        <div style={{ borderTop: `1px solid var(--border)`, paddingTop: "0.75rem" }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                                                <span style={{ fontSize: "0.875rem", color: "var(--muted-foreground)" }}>Ingresos</span>
                                                <span style={{ fontSize: "1.125rem", fontWeight: "bold" }}>{formatCurrency(dineInRevenue || 0)}</span>
                                            </div>
                                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                                                <span style={{ fontSize: "0.875rem", color: "var(--muted-foreground)" }}>Pedidos</span>
                                                <span style={{ fontSize: "1.125rem", fontWeight: "bold" }}>{dineInOrders || 0}</span>
                                            </div>
                                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                                <span style={{ fontSize: "0.875rem", color: "var(--muted-foreground)" }}>Promedio</span>
                                                <span style={{ fontSize: "1.125rem", fontWeight: "bold" }}>{dineInOrders > 0 ? formatCurrency(avgDineIn || 0) : 'Bs 0,00'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Delivery */}
                                    <div style={statCardStyle}>
                                        <div style={{ textAlign: "center", marginBottom: "0.5rem" }}>
                                            <span style={{ fontSize: "2rem" }}>📦</span>
                                            <h3 style={{ fontSize: "1rem", fontWeight: "bold", margin: "0.25rem 0", color: "#2563eb" }}>Delivery</h3>
                                        </div>
                                        <div style={{ borderTop: `1px solid var(--border)`, paddingTop: "0.75rem" }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                                                <span style={{ fontSize: "0.875rem", color: "var(--muted-foreground)" }}>Ingresos</span>
                                                <span style={{ fontSize: "1.125rem", fontWeight: "bold" }}>{formatCurrency(deliveryRevenue || 0)}</span>
                                            </div>
                                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                                                <span style={{ fontSize: "0.875rem", color: "var(--muted-foreground)" }}>Pedidos</span>
                                                <span style={{ fontSize: "1.125rem", fontWeight: "bold" }}>{deliveryOrders || 0}</span>
                                            </div>
                                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                                <span style={{ fontSize: "0.875rem", color: "var(--muted-foreground)" }}>Promedio</span>
                                                <span style={{ fontSize: "1.125rem", fontWeight: "bold" }}>{deliveryOrders > 0 ? formatCurrency(avgDelivery || 0) : 'Bs 0,00'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* ====== 2. TOTALES GENERALES (centrado) ====== */}
                                <div style={{
                                    ...statCardStyle,
                                    backgroundColor: "var(--muted)",
                                    borderColor: "var(--primary)",
                                    borderWidth: "2px",
                                    marginTop: "1.5rem"
                                }}>
                                    <div style={{ textAlign: "center" }}>
                                        <span style={{ fontSize: "2rem" }}>📊</span>
                                        <h3 style={{ fontSize: "1.125rem", fontWeight: "bold", margin: "0.25rem 0", color: "var(--primary)" }}>Totales Generales</h3>
                                        <div style={{ display: "flex", justifyContent: "center", gap: "3rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
                                            <div>
                                                <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", margin: 0 }}>Ingresos</p>
                                                <p style={{ fontSize: "1.5rem", fontWeight: "bold", color: "var(--primary)", margin: 0 }}>
                                                    {formatCurrency((dineInRevenue || 0) + (deliveryRevenue || 0))}
                                                </p>
                                            </div>
                                            <div>
                                                <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", margin: 0 }}>Pedidos</p>
                                                <p style={{ fontSize: "1.5rem", fontWeight: "bold", color: "var(--primary)", margin: 0 }}>
                                                    {(dineInOrders || 0) + (deliveryOrders || 0)}
                                                </p>
                                            </div>
                                            <div>
                                                <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", margin: 0 }}>Promedio</p>
                                                <p style={{ fontSize: "1.5rem", fontWeight: "bold", color: "var(--primary)", margin: 0 }}>
                                                    {((dineInOrders || 0) + (deliveryOrders || 0)) > 0
                                                        ? formatCurrency(((dineInRevenue || 0) + (deliveryRevenue || 0)) / ((dineInOrders || 0) + (deliveryOrders || 0)))
                                                        : 'Bs 0,00'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* ====== 3. MÉTODO DE PAGO ====== */}
                                <div style={cardStyle}>
                                    <h3 style={{ fontSize: "1rem", fontWeight: "bold", marginBottom: "1rem" }}>
                                        💳 Método de Pago
                                    </h3>
                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1.5rem" }}>

                                        {/* Efectivo */}
                                        <div style={{ ...statCardStyle, borderColor: "#27ae60", borderWidth: "1px" }}>
                                            <div style={{ textAlign: "center", marginBottom: "0.5rem" }}>
                                                <span style={{ fontSize: "2rem" }}>💵</span>
                                                <h3 style={{ fontSize: "1rem", fontWeight: "bold", margin: "0.25rem 0", color: "#27ae60" }}>Efectivo</h3>
                                            </div>
                                            <div style={{ borderTop: `1px solid var(--border)`, paddingTop: "0.75rem" }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                                                    <span style={{ fontSize: "0.875rem", color: "var(--muted-foreground)" }}>Monto</span>
                                                    <span style={{ fontSize: "1.125rem", fontWeight: "bold" }}>{formatCurrency(report.cashTotal || 0)}</span>
                                                </div>
                                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                                    <span style={{ fontSize: "0.875rem", color: "var(--muted-foreground)" }}>% del total</span>
                                                    <span style={{ fontSize: "1.125rem", fontWeight: "bold" }}>
                                                        {report.totalSales > 0 ? `${((report.cashTotal / report.totalSales) * 100).toFixed(1)}%` : '0%'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* QR */}
                                        <div style={{ ...statCardStyle, borderColor: "#1976d2", borderWidth: "1px" }}>
                                            <div style={{ textAlign: "center", marginBottom: "0.5rem" }}>
                                                <span style={{ fontSize: "2rem" }}>📱</span>
                                                <h3 style={{ fontSize: "1rem", fontWeight: "bold", margin: "0.25rem 0", color: "#1976d2" }}>QR / Digital</h3>
                                            </div>
                                            <div style={{ borderTop: `1px solid var(--border)`, paddingTop: "0.75rem" }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                                                    <span style={{ fontSize: "0.875rem", color: "var(--muted-foreground)" }}>Monto</span>
                                                    <span style={{ fontSize: "1.125rem", fontWeight: "bold" }}>{formatCurrency(report.qrTotal || 0)}</span>
                                                </div>
                                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                                    <span style={{ fontSize: "0.875rem", color: "var(--muted-foreground)" }}>% del total</span>
                                                    <span style={{ fontSize: "1.125rem", fontWeight: "bold" }}>
                                                        {report.totalSales > 0 ? `${((report.qrTotal / report.totalSales) * 100).toFixed(1)}%` : '0%'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Método más usado */}
                                    <div style={{
                                        marginTop: "1rem",
                                        padding: "0.75rem",
                                        backgroundColor: "var(--muted)",
                                        borderRadius: "var(--radius-md)",
                                        textAlign: "center"
                                    }}>
                                        <span style={{ fontSize: "0.875rem", color: "var(--muted-foreground)" }}>
                                            Método que más genera:
                                            <strong style={{
                                                marginLeft: "0.5rem",
                                                color: report.cashTotal >= report.qrTotal ? "#27ae60" : "#1976d2"
                                            }}>
                                                {report.cashTotal >= report.qrTotal ? '💵 Efectivo' : '📱 QR'}
                                                ({report.totalSales > 0
                                                    ? `${(Math.max(report.cashTotal, report.qrTotal) / report.totalSales * 100).toFixed(1)}%`
                                                    : '0%'})
                                            </strong>
                                        </span>
                                    </div>
                                </div>

                                {/* ====== 4. FOOTER ====== */}
                                <div style={{ ...cardStyle, textAlign: "center", backgroundColor: "var(--muted)" }}>
                                    <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", margin: 0 }}>
                                        ℹ️ Datos basados en pagos completados del período seleccionado. · {(dineInOrders || 0) + (deliveryOrders || 0)} pedidos en total
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* ====== TAB: MESEROS ====== */}
                        {activeTab === 'meseros' && (
                            <div>
                                <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "1.5rem" }}>🥇 Ranking de Meseros</h2>
                                
                                {/* Gráfico de barras del ranking */}
                                <div style={cardStyle}>
                                    <h3 style={{ fontSize: "1rem", fontWeight: "bold", marginBottom: "1.5rem" }}>
                                        📊 Ventas Totales por Mesero
                                    </h3>
                                    <div style={{ width: "100%", height: 320 }}>
                                        {renderWaitersChart()}
                                    </div>
                                </div>

                                {/* Tabla/Lista detallada */}
                                <div style={cardStyle}>
                                    <h3 style={{ fontSize: "1rem", fontWeight: "bold", marginBottom: "1rem" }}>
                                        📋 Desglose de Ventas y Pedidos
                                    </h3>
                                    {metricsLoading ? (
                                        <p>Cargando...</p>
                                    ) : (
                                        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                                            {metrics?.topWaiters?.map((waiter, idx) => (
                                                <li key={waiter.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 0", borderBottom: "1px solid var(--border)" }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                                                        <span style={{ fontWeight: "bold", color: "#e85d26", width: "30px" }}>#{idx + 1}</span>
                                                        <span>{waiter.name}</span>
                                                    </div>
                                                    <span style={{ fontWeight: "bold" }}>
                                                        {formatCurrency(waiter.total)} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--muted-foreground)' }}>({waiter.count || 0} ped.)</span>
                                                    </span>
                                                </li>
                                            ))}
                                            {(!metrics?.topWaiters || metrics.topWaiters.length === 0) && (
                                                <p style={{ textAlign: "center", padding: "1rem", color: "var(--muted-foreground)" }}>No hay datos de meseros en este período</p>
                                            )}
                                        </ul>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ====== TAB: PLATOS ====== */}
                        {activeTab === 'platos' && (
                            <div>
                                <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "1.5rem" }}>🍽️ Top Platos</h2>
                                <div style={cardStyle}>
                                    {metricsLoading ? (
                                        <p>Cargando...</p>
                                    ) : (
                                        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                                            {metrics?.topDishes?.map((dish, idx) => (
                                                <li key={dish.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 0", borderBottom: "1px solid var(--border)" }}>
                                                    <span>#{idx + 1} {dish.name}</span>
                                                    <span style={{ fontWeight: "bold" }}>{dish.quantity} uds</span>
                                                </li>
                                            ))}
                                            {(!metrics?.topDishes || metrics.topDishes.length === 0) && (
                                                <p style={{ textAlign: "center", padding: "1rem", color: "var(--muted-foreground)" }}>No hay datos</p>
                                            )}
                                        </ul>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ====== TAB: HORARIOS ====== */}
                        {activeTab === 'horarios' && metrics && (
                            <div>
                                <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "1.5rem" }}>📅 Horarios</h2>

                                {/* Resumen de Horarios */}
                                <div style={statsGridStyle}>
                                    <div style={statCardStyle}>
                                        <h3 style={{ fontSize: "1.5rem", fontWeight: "bold", margin: 0, color: "var(--foreground)" }}>
                                            {metrics.totalOrders || 0}
                                        </h3>
                                        <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", margin: 0 }}>Total Pedidos</p>
                                    </div>
                                    <div style={statCardStyle}>
                                        <h3 style={{ fontSize: "1.5rem", fontWeight: "bold", margin: 0, color: "#27ae60" }}>
                                            {metrics.bestDay ? new Date(metrics.bestDay.date).toLocaleDateString('es-BO') : 'N/A'}
                                        </h3>
                                        <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", margin: 0 }}>Día con más ventas</p>
                                    </div>
                                    <div style={statCardStyle}>
                                        <h3 style={{ fontSize: "1.5rem", fontWeight: "bold", margin: 0, color: "#2563eb" }}>
                                            {metrics.peakHour ? metrics.peakHour.hour : 'N/A'}
                                        </h3>
                                        <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", margin: 0 }}>Hora pico</p>
                                    </div>
                                    <div style={statCardStyle}>
                                        <h3 style={{ fontSize: "1.5rem", fontWeight: "bold", margin: 0, color: "#e85d26" }}>
                                            {metrics.cancellationRate !== undefined ? `${metrics.cancellationRate.toFixed(1)}%` : '0%'}
                                        </h3>
                                        <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", margin: 0 }}>Cancelaciones</p>
                                    </div>
                                </div>

                                {/* Top 3 horas pico */}
                                <div style={cardStyle}>
                                    <h3 style={{ fontSize: "1rem", fontWeight: "bold", marginBottom: "1rem" }}>
                                        ⏰ Top 3 Horas Pico
                                    </h3>
                                    {metrics.topHours && metrics.topHours.length > 0 ? (
                                        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                                            {metrics.topHours.map((hour, idx) => (
                                                <div key={hour.hour} style={{
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    alignItems: "center",
                                                    padding: "0.75rem 1rem",
                                                    backgroundColor: idx === 0 ? "var(--muted)" : "transparent",
                                                    borderRadius: "var(--radius-md)",
                                                    borderLeft: idx === 0 ? `3px solid var(--primary)` : `3px solid transparent`
                                                }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                                                        <span style={{
                                                            fontWeight: "bold",
                                                            fontSize: "1.25rem",
                                                            color: idx === 0 ? "var(--primary)" : "var(--foreground)"
                                                        }}>
                                                            #{idx + 1}
                                                        </span>
                                                        <div>
                                                            <span style={{ fontWeight: "bold", fontSize: "1rem" }}>
                                                                {hour.hour}
                                                            </span>
                                                            <span style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", marginLeft: "0.5rem" }}>
                                                                {hour.count} pedidos
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <span style={{ fontWeight: "bold", fontSize: "1rem" }}>
                                                        {formatCurrency(hour.total)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)", margin: 0 }}>
                                            No hay datos de horas pico
                                        </p>
                                    )}
                                </div>

                                {/* Días con más cancelaciones */}
                                <div style={cardStyle}>
                                    <h3 style={{ fontSize: "1rem", fontWeight: "bold", marginBottom: "1rem" }}>
                                        📅 Días con más cancelaciones
                                    </h3>
                                    {metrics.topCancellationDays && metrics.topCancellationDays.length > 0 ? (
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
                                            {metrics.topCancellationDays.map((day) => (
                                                <div key={day.date} style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "0.5rem",
                                                    padding: "0.5rem 1rem",
                                                    backgroundColor: "#fee2e2",
                                                    borderRadius: "var(--radius-md)",
                                                    border: "1px solid #fecaca"
                                                }}>
                                                    <span style={{ fontSize: "0.875rem", fontWeight: "bold", color: "#991b1b" }}>
                                                        {new Date(day.date).toLocaleDateString('es-BO')}
                                                    </span>
                                                    <span style={{
                                                        fontSize: "0.75rem",
                                                        backgroundColor: "#991b1b",
                                                        color: "white",
                                                        padding: "2px 8px",
                                                        borderRadius: "9999px"
                                                    }}>
                                                        {day.count} {day.count === 1 ? 'cancelación' : 'cancelaciones'}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)", margin: 0 }}>
                                            No hay cancelaciones en este período
                                        </p>
                                    )}
                                </div>

                                {/* Comparativa: delivery vs restaurante por horario */}
                                <div style={cardStyle}>
                                    <h3 style={{ fontSize: "1rem", fontWeight: "bold", marginBottom: "1rem" }}>
                                        📊 Delivery vs Restaurante por Horario
                                    </h3>
                                    {metrics.serviceByHourArray && metrics.serviceByHourArray.length > 0 ? (
                                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                            {metrics.serviceByHourArray.map((item) => {
                                                const total = item.dine_in + item.delivery;
                                                const dineInPercent = total > 0 ? (item.dine_in / total) * 100 : 0;
                                                const deliveryPercent = total > 0 ? (item.delivery / total) * 100 : 0;

                                                return (
                                                    <div key={item.hour}>
                                                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem" }}>
                                                            <span style={{ fontWeight: "bold" }}>{item.hour}</span>
                                                            <span>{item.dine_in} 🍽️ / {item.delivery} 📦</span>
                                                        </div>
                                                        <div style={{ display: "flex", height: "12px", borderRadius: "6px", overflow: "hidden", marginTop: "0.25rem" }}>
                                                            <div style={{
                                                                width: `${dineInPercent}%`,
                                                                backgroundColor: "#27ae60",
                                                                transition: "width 0.5s ease"
                                                            }} />
                                                            <div style={{
                                                                width: `${deliveryPercent}%`,
                                                                backgroundColor: "#2563eb",
                                                                transition: "width 0.5s ease"
                                                            }} />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)", margin: 0 }}>
                                            No hay datos de horarios
                                        </p>
                                    )}
                                </div>

                                {/* Métricas existentes (resumen) */}
                                <div style={{ ...cardStyle, textAlign: "center", backgroundColor: "var(--muted)" }}>
                                    <div style={{ display: "flex", justifyContent: "center", gap: "2rem", flexWrap: "wrap" }}>
                                        <div>
                                            <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", margin: 0 }}>📆 Día con más ventas</p>
                                            <p style={{ fontSize: "1rem", fontWeight: "bold", margin: 0 }}>
                                                {metrics.bestDay ? `${new Date(metrics.bestDay.date).toLocaleDateString('es-BO')} - ${formatCurrency(metrics.bestDay.amount)}` : 'Sin datos'}
                                            </p>
                                        </div>
                                        <div>
                                            <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", margin: 0 }}>⏰ Hora pico</p>
                                            <p style={{ fontSize: "1rem", fontWeight: "bold", margin: 0 }}>
                                                {metrics.peakHour ? `${metrics.peakHour.hour} (${formatCurrency(metrics.peakHour.amount)})` : 'Sin datos'}
                                            </p>
                                        </div>
                                        <div>
                                            <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", margin: 0 }}>📊 Cancelaciones</p>
                                            <p style={{ fontSize: "1rem", fontWeight: "bold", margin: 0, color: "#e85d26" }}>
                                                {metrics.cancellationRate !== undefined ? `${metrics.cancellationRate.toFixed(1)}%` : '0%'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ====== TAB: MESAS ====== */}
                        {activeTab === 'mesas' && metrics && (
                            <div>
                                <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "1.5rem" }}>🪑 Mesas</h2>

                                {/* Resumen de Mesas */}
                                <div style={statsGridStyle}>
                                    <div style={statCardStyle}>
                                        <h3 style={{ fontSize: "1.5rem", fontWeight: "bold", margin: 0, color: "var(--foreground)" }}>
                                            {metrics.mesaDetalle?.length || 0}
                                        </h3>
                                        <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", margin: 0 }}>Mesas con actividad</p>
                                    </div>
                                    <div style={statCardStyle}>
                                        <h3 style={{ fontSize: "1.5rem", fontWeight: "bold", margin: 0, color: "#27ae60" }}>
                                            {metrics.mesaDetalle?.reduce((sum, m) => sum + m.totalPedidos, 0) || 0}
                                        </h3>
                                        <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", margin: 0 }}>Total Pedidos</p>
                                    </div>
                                    <div style={statCardStyle}>
                                        <h3 style={{ fontSize: "1.5rem", fontWeight: "bold", margin: 0, color: "#2563eb" }}>
                                            {formatCurrency(Math.round((metrics.mesaDetalle?.reduce((sum, m) => sum + m.totalIngresos, 0) || 0) * 100) / 100)}
                                        </h3>
                                        <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", margin: 0 }}>Total Ingresos</p>
                                    </div>
                                    <div style={statCardStyle}>
                                        <h3 style={{ fontSize: "1.5rem", fontWeight: "bold", margin: 0, color: "var(--primary)" }}>
                                            {metrics.tablesServedToday || 0}
                                        </h3>
                                        <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", margin: 0 }}>Mesas Atendidas</p>
                                    </div>
                                </div>

                                {/* Lista de Mesas con detalle */}
                                {metrics.mesaDetalle && metrics.mesaDetalle.length > 0 ? (
                                    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                                        {metrics.mesaDetalle.map((mesa, idx) => (
                                            <div key={mesa.tableId} style={{ ...cardStyle, borderColor: idx === 0 ? "var(--primary)" : "var(--border)" }}>
                                                {/* Cabecera de la mesa - clickeable */}
                                                <div
                                                    onClick={() => toggleMesa(mesa.tableId)}
                                                    style={{
                                                        display: "flex",
                                                        justifyContent: "space-between",
                                                        alignItems: "center",
                                                        padding: "0.5rem",
                                                        borderRadius: "var(--radius-md)",
                                                        flexWrap: "wrap",
                                                        gap: "0.5rem",
                                                        cursor: "pointer",
                                                        transition: "background 0.2s",
                                                        backgroundColor: expandedMesa === mesa.tableId ? "var(--muted)" : "transparent"
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        if (expandedMesa !== mesa.tableId) {
                                                            e.currentTarget.style.backgroundColor = "var(--muted)";
                                                        }
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        if (expandedMesa !== mesa.tableId) {
                                                            e.currentTarget.style.backgroundColor = "transparent";
                                                        }
                                                    }}
                                                >
                                                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                                                        {/* Badge de ranking */}
                                                        <span style={{
                                                            backgroundColor: idx === 0 ? "var(--primary)" : "var(--muted)",
                                                            color: idx === 0 ? "var(--primary-foreground)" : "var(--foreground)",
                                                            padding: "2px 10px",
                                                            borderRadius: "9999px",
                                                            fontSize: "0.75rem",
                                                            fontWeight: "bold",
                                                            minWidth: "32px",
                                                            textAlign: "center"
                                                        }}>
                                                            #{idx + 1}
                                                        </span>
                                                        <span style={{
                                                            fontSize: "1.5rem",
                                                            fontWeight: "bold",
                                                            color: idx === 0 ? "var(--primary)" : "var(--foreground)"
                                                        }}>
                                                            🪑 Mesa {mesa.number}
                                                        </span>
                                                        {idx === 0 && <span style={{
                                                            backgroundColor: "var(--primary)",
                                                            color: "var(--primary-foreground)",
                                                            padding: "2px 10px",
                                                            borderRadius: "9999px",
                                                            fontSize: "0.75rem",
                                                            fontWeight: "bold"
                                                        }}>🏆 Top</span>}
                                                        <span style={{
                                                            fontSize: "0.75rem",
                                                            color: "var(--muted-foreground)",
                                                            transition: "transform 0.3s",
                                                            transform: expandedMesa === mesa.tableId ? "rotate(180deg)" : "rotate(0deg)"
                                                        }}>
                                                            ▼
                                                        </span>
                                                    </div>
                                                    <div style={{ display: "flex", gap: "2rem", fontSize: "0.875rem", flexWrap: "wrap" }}>
                                                        <span><strong>{mesa.totalPedidos}</strong> pedidos</span>
                                                        <span><strong>{formatCurrency(Math.round(mesa.totalIngresos * 100) / 100)}</strong> ingresos</span>
                                                        <span><strong>{formatCurrency(Math.round(mesa.promedio * 100) / 100)}</strong> promedio</span>
                                                    </div>
                                                </div>

                                                {/* Detalle de pedidos - solo visible si está expandido */}
                                                {expandedMesa === mesa.tableId && (
                                                    <div style={{ marginTop: "0.75rem" }}>
                                                        {mesa.pedidos.map((pedido, pIdx) => (
                                                            <div key={pedido.orderId} style={{
                                                                padding: "0.75rem 0",
                                                                borderBottom: pIdx < mesa.pedidos.length - 1 ? `1px solid var(--border)` : "none"
                                                            }}>
                                                                <div style={{
                                                                    display: "flex",
                                                                    justifyContent: "space-between",
                                                                    alignItems: "center",
                                                                    marginBottom: "0.5rem",
                                                                    flexWrap: "wrap",
                                                                    gap: "0.5rem"
                                                                }}>
                                                                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                                                                        <span style={{ fontWeight: "bold", fontSize: "0.875rem" }}>
                                                                            Pedido #{pIdx + 1}
                                                                        </span>
                                                                        <span style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>
                                                                            {new Date(pedido.fecha).toLocaleString('es-BO')}
                                                                        </span>
                                                                        <span style={{
                                                                            backgroundColor: pedido.status === 'paid' || pedido.status === 'delivered'
                                                                                ? '#dcfce7'
                                                                                : '#fef9c3',
                                                                            color: pedido.status === 'paid' || pedido.status === 'delivered'
                                                                                ? '#166534'
                                                                                : '#854d0e',
                                                                            padding: "2px 8px",
                                                                            borderRadius: "9999px",
                                                                            fontSize: "0.65rem",
                                                                            fontWeight: "bold"
                                                                        }}>
                                                                            {pedido.status === 'paid' ? '✅ Pagado' :
                                                                                pedido.status === 'delivered' ? '📦 Entregado' :
                                                                                    pedido.status}
                                                                        </span>
                                                                    </div>
                                                                    <span style={{ fontWeight: "bold", fontSize: "0.875rem" }}>
                                                                        {formatCurrency(pedido.total)}
                                                                    </span>
                                                                </div>

                                                                {/* Items del pedido */}
                                                                {pedido.items.length > 0 && (
                                                                    <div style={{
                                                                        marginLeft: "1rem",
                                                                        paddingLeft: "0.75rem",
                                                                        borderLeft: "2px solid var(--border)"
                                                                    }}>
                                                                        {pedido.items.map((item, iIdx) => (
                                                                            <div key={iIdx} style={{
                                                                                display: "flex",
                                                                                justifyContent: "space-between",
                                                                                alignItems: "center",
                                                                                fontSize: "0.75rem",
                                                                                color: "var(--muted-foreground)",
                                                                                padding: "0.125rem 0"
                                                                            }}>
                                                                                <span>
                                                                                    {item.quantity}x {item.name}
                                                                                </span>
                                                                                <span>{formatCurrency(item.subtotal)}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ ...cardStyle, textAlign: "center", padding: "3rem" }}>
                                        <p style={{ fontSize: "1rem", color: "var(--muted-foreground)" }}>
                                            No hay datos de mesas en este período
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ====== TAB: CLIENTES ====== */}
                        {activeTab === 'clientes' && metrics && (
                            <div>
                                <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "1.5rem" }}>👥 Clientes</h2>

                                {/* Resumen de Clientes */}
                                <div style={statsGridStyle}>
                                    <div style={statCardStyle}>
                                        <h3 style={{ fontSize: "1.5rem", fontWeight: "bold", margin: 0, color: "var(--foreground)" }}>
                                            {metrics.totalCustomers || 0}
                                        </h3>
                                        <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", margin: 0 }}>Total Clientes</p>
                                    </div>
                                    <div style={statCardStyle}>
                                        <h3 style={{ fontSize: "1.5rem", fontWeight: "bold", margin: 0, color: "#27ae60" }}>
                                            {metrics.newCustomers || 0}
                                        </h3>
                                        <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", margin: 0 }}>Nuevos Clientes</p>
                                    </div>
                                    <div style={statCardStyle}>
                                        <h3 style={{ fontSize: "1.5rem", fontWeight: "bold", margin: 0, color: "#2563eb" }}>
                                            {metrics.recurringCustomers || 0}
                                        </h3>
                                        <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", margin: 0 }}>Clientes Recurrentes</p>
                                    </div>
                                    <div style={statCardStyle}>
                                        <h3 style={{ fontSize: "1.5rem", fontWeight: "bold", margin: 0, color: "var(--primary)" }}>
                                            {metrics.mostLoyal ? metrics.mostLoyal.count : 0}
                                        </h3>
                                        <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", margin: 0 }}>Máx. Pedidos (1 cliente)</p>
                                    </div>
                                </div>

                                {/* Top Clientes y Clientes con mayor ticket */}
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1.5rem" }}>

                                    {/* Top Clientes por gasto */}
                                    <div style={cardStyle}>
                                        <h3 style={{ fontSize: "1rem", fontWeight: "bold", marginBottom: "1rem" }}>
                                            🏆 Top Clientes (por gasto)
                                        </h3>
                                        {metrics.topCustomers && metrics.topCustomers.length > 0 ? (
                                            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                                                {metrics.topCustomers.map((customer, idx) => {
                                                    const orders = metrics.customerOrders?.[customer.email] || 0;
                                                    return (
                                                        <li key={customer.email} style={{
                                                            display: "flex",
                                                            justifyContent: "space-between",
                                                            alignItems: "center",
                                                            padding: "0.75rem 0",
                                                            borderBottom: idx < metrics.topCustomers.length - 1 ? `1px solid var(--border)` : "none"
                                                        }}>
                                                            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                                                                <span style={{ fontWeight: "bold", color: "#e85d26", width: "30px" }}>#{idx + 1}</span>
                                                                <div>
                                                                    <span style={{ fontWeight: "bold" }}>{customer.name}</span>
                                                                    <span style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", marginLeft: "0.5rem" }}>
                                                                        {orders} {orders === 1 ? 'pedido' : 'pedidos'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <span style={{ fontWeight: "bold" }}>{formatCurrency(customer.total)}</span>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        ) : (
                                            <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)", margin: 0 }}>
                                                No hay datos de clientes
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Cliente más fiel */}
                                {metrics.mostLoyal && (
                                    <div style={{ ...cardStyle, backgroundColor: "var(--muted)", borderColor: "#f59e0b", borderWidth: "2px" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                            <div>
                                                <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", margin: 0 }}>🏅 Cliente más fiel</p>
                                                <p style={{ fontSize: "1.25rem", fontWeight: "bold", margin: 0 }}>
                                                    {metrics.mostLoyal.name || metrics.mostLoyal.email.split('@')[0]}
                                                </p>
                                                <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)", margin: 0 }}>
                                                    {metrics.mostLoyal.count} pedidos · {formatCurrency(metrics.mostLoyal.total)}
                                                </p>
                                            </div>
                                            <span style={{ fontSize: "3rem" }}>🏆</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ====== TAB: EFICIENCIA ====== */}
                        {activeTab === 'eficiencia' && metrics && (
                            <div>
                                <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "1.5rem" }}>⚡ Eficiencia Operativa</h2>

                                {/* Dos columnas: Restaurante | Delivery */}
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1.5rem" }}>

                                    {/* Restaurante */}
                                    <div style={statCardStyle}>
                                        <div style={{ textAlign: "center", marginBottom: "0.5rem" }}>
                                            <span style={{ fontSize: "2rem" }}>🍽️</span>
                                            <h3 style={{ fontSize: "1rem", fontWeight: "bold", margin: "0.25rem 0", color: "#27ae60" }}>Restaurante</h3>
                                        </div>
                                        <div style={{ borderTop: `1px solid var(--border)`, paddingTop: "0.75rem" }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                                                <span style={{ fontSize: "0.875rem", color: "var(--muted-foreground)" }}>Órdenes creadas</span>
                                                <span style={{ fontWeight: "bold" }}>{metrics.dineInOrdersCount || 0}</span>
                                            </div>
                                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                                                <span style={{ fontSize: "0.875rem", color: "var(--muted-foreground)" }}>Completados</span>
                                                <span style={{ fontWeight: "bold", color: "#27ae60" }}>{metrics.dineInCompleted || 0}</span>
                                            </div>
                                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                                                <span style={{ fontSize: "0.875rem", color: "var(--muted-foreground)" }}>En proceso</span>
                                                <span style={{ fontWeight: "bold", color: "#f59e0b" }}>{metrics.dineInInProgress || 0}</span>
                                            </div>
                                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                                <span style={{ fontSize: "0.875rem", color: "var(--muted-foreground)" }}>Cancelados</span>
                                                <span style={{ fontWeight: "bold", color: "#e85d26" }}>{metrics.dineInCancelled || 0}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Delivery */}
                                    <div style={statCardStyle}>
                                        <div style={{ textAlign: "center", marginBottom: "0.5rem" }}>
                                            <span style={{ fontSize: "2rem" }}>📦</span>
                                            <h3 style={{ fontSize: "1rem", fontWeight: "bold", margin: "0.25rem 0", color: "#2563eb" }}>Delivery</h3>
                                        </div>
                                        <div style={{ borderTop: `1px solid var(--border)`, paddingTop: "0.75rem" }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                                                <span style={{ fontSize: "0.875rem", color: "var(--muted-foreground)" }}>Órdenes creadas</span>
                                                <span style={{ fontWeight: "bold" }}>{metrics.deliveryOrdersCount || 0}</span>
                                            </div>
                                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                                                <span style={{ fontSize: "0.875rem", color: "var(--muted-foreground)" }}>Completados</span>
                                                <span style={{ fontWeight: "bold", color: "#2563eb" }}>{metrics.deliveryCompleted || 0}</span>
                                            </div>
                                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                                                <span style={{ fontSize: "0.875rem", color: "var(--muted-foreground)" }}>En camino</span>
                                                <span style={{ fontWeight: "bold", color: "#f59e0b" }}>{metrics.deliveryInProgress || 0}</span>
                                            </div>
                                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                                <span style={{ fontSize: "0.875rem", color: "var(--muted-foreground)" }}>Cancelados</span>
                                                <span style={{ fontWeight: "bold", color: "#e85d26" }}>{metrics.deliveryCancelled || 0}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Rendimiento Operativo */}
                                <div style={cardStyle}>
                                    <h3 style={{ fontSize: "1rem", fontWeight: "bold", marginBottom: "1rem" }}>
                                        📈 Rendimiento Operativo
                                    </h3>
                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
                                        <div style={{ textAlign: "center" }}>
                                            <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", margin: 0 }}>Tasa de conversión</p>
                                            <p style={{ fontSize: "1.25rem", fontWeight: "bold", color: "var(--primary)" }}>
                                                {((metrics.dineInCompleted || 0) + (metrics.deliveryCompleted || 0)) > 0
                                                    ? `${Math.round(((metrics.dineInCompleted || 0) + (metrics.deliveryCompleted || 0)) / ((metrics.dineInOrdersCount || 0) + (metrics.deliveryOrdersCount || 0)) * 100)}%`
                                                    : '0%'}
                                            </p>
                                        </div>
                                        <div style={{ textAlign: "center" }}>
                                            <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", margin: 0 }}>Tiempo promedio de atención</p>
                                            <p style={{ fontSize: "1.25rem", fontWeight: "bold", color: "var(--primary)" }}>
                                                {metrics.avgCompletionTime ? `${Math.round(metrics.avgCompletionTime)} min` : 'N/A'}
                                            </p>
                                        </div>
                                        <div style={{ textAlign: "center" }}>
                                            <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", margin: 0 }}>Pedidos cancelados</p>
                                            <p style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#e85d26" }}>
                                                {metrics.cancelledOrdersCount || 0}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Programa de Lealtad */}
                                <div style={cardStyle}>
                                    <h3 style={{ fontSize: "1rem", fontWeight: "bold", marginBottom: "1rem" }}>
                                        🎁 Programa de Lealtad
                                    </h3>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <div>
                                            <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)", margin: 0 }}>Puntos usados hoy</p>
                                            <p style={{ fontSize: "1.25rem", fontWeight: "bold" }}>{metrics.loyaltyPointsUsed || 0} pts</p>
                                        </div>
                                        <div>
                                            <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)", margin: 0 }}>Clientes con puntos</p>
                                            <p style={{ fontSize: "1.25rem", fontWeight: "bold" }}>
                                                {metrics.topCustomers?.length || 0}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}