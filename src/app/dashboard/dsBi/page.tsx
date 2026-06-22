"use client";
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/useAuth';
import { ADMIN } from '@/lib/roles';
import { Printer, Calendar, DollarSign, CreditCard, Users, BarChart3, LineChart, TrendingUp, TrendingDown, Bike } from 'lucide-react';
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
    ComposedChart,
    PieChart,
    Pie,
    Cell
} from 'recharts';

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
    padding: "18px 40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
};

const cardStyle: React.CSSProperties = {
    backgroundColor: "var(--card)",
    borderRadius: "var(--radius-lg)",
    border: `1px solid var(--border)`,
    padding: "1.5rem",
    marginBottom: "1.5rem",
};

const statsGridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
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

const selectStyle: React.CSSProperties = {
    padding: "0.5rem",
    borderRadius: "var(--radius-md)",
    border: `1px solid var(--border)`,
    backgroundColor: "var(--input-background)",
    color: "var(--foreground)",
    fontSize: "0.875rem",
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

interface IncomeReport {
    totalSales: number;
    cashTotal: number;
    qrTotal: number;
    dineInSales?: number;
    deliverySales?: number;
    pickUpSales?: number;
    deliveryFeesTotal?: number;
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
    hourlyData?: Array<{ hour: string; amount: number }>;
    topTables: Array<{ id: string; number: number; total: number }>;
    cancellationRate: number;
    totalOrders: number;
    completedPayments: number;
    topCustomers: Array<{ email: string; name: string; total: number }>;
    loyaltyPointsUsed: number;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(amount);
};

const formatDateKey = (dateKey: string) => {
    const [year, month, day] = dateKey.split('-');
    return `${parseInt(day)}/${parseInt(month)}/${year}`;
};

type ChartType = 'bar' | 'line' | 'area' | 'pie';

const getLocalDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export default function ReportesPage() {
    const { user, loading: userLoading } = useAuth(ADMIN);
    const [periodType, setPeriodType] = useState<'day' | 'month' | 'year'>('day');
    const [selectedDay, setSelectedDay] = useState(getLocalDate);
    const [selectedMonth, setSelectedMonth] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
    const [compare, setCompare] = useState<'none' | 'previous_month' | 'previous_year'>('none');
    const [biData, setBiData] = useState<IncomeReport | null>(null);
    const [loading, setLoading] = useState(false);
    const [chartType, setChartType] = useState<ChartType>('bar');
    const [metrics, setMetrics] = useState<MetricsData | null>(null);
    const [metricsLoading, setMetricsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'sales' | 'dishes' | 'waiters' | 'hours' | 'channels'>('sales');
    const [mainSection, setMainSection] = useState<'financial' | 'operations' | 'products'>('financial');

    const handleSectionChange = (section: 'financial' | 'operations' | 'products') => {
        setMainSection(section);
        if (section === 'financial') {
            setActiveTab('sales');
        } else if (section === 'operations') {
            setActiveTab('waiters');
        } else if (section === 'products') {
            setActiveTab('dishes');
        }
    };

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
            console.log('Periodo recibido:', data.period); //log
            setBiData(data);
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
    }, [periodType, selectedDay, selectedMonth, selectedYear, compare]);

    const handlePrint = () => {
        window.print();
    };

    // Preparar datos para el gráfico
    const getChartData = () => {
        if (!biData) return [];

        if (periodType === 'year') {
            return Object.entries(biData.monthlyIncome || {}).map(([month, amount]) => ({
                name: month,
                ingresos: amount,
            }));
        } else if (periodType === 'month') {
            const [year, month] = selectedMonth.split('-');

            const data = Object.entries(biData.dailyIncome || {})
                .filter(([date]) => {
                    const [dateYear, dateMonth] = date.split('-');
                    return dateYear === year && dateMonth === month;
                })
                .map(([date, amount]) => ({
                    name: formatDateKey(date),
                    ingresos: amount,
                }));

            // Ordenar por fecha (convertir a números)
            data.sort((a, b) => {
                const [dayA, monthA, yearA] = a.name.split('/');
                const [dayB, monthB, yearB] = b.name.split('/');
                const dateA = new Date(parseInt(yearA), parseInt(monthA) - 1, parseInt(dayA));
                const dateB = new Date(parseInt(yearB), parseInt(monthB) - 1, parseInt(dayB));
                return dateA.getTime() - dateB.getTime();
            });

            if (biData.compareDailyIncome && Object.keys(biData.compareDailyIncome).length > 0) {
                return data.map(item => ({
                    ...item,
                    comparativo: biData.compareDailyIncome[Object.keys(biData.dailyIncome).find(
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

        const hasComparison = biData?.compareTotal !== undefined && biData.compareTotal > 0;

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

    const renderDishesChart = () => {
        if (!metrics?.topDishes || metrics.topDishes.length === 0) return <p style={{ textAlign: "center", padding: "2rem" }}>No hay datos para mostrar</p>;
        const data = [...metrics.topDishes].sort((a, b) => b.quantity - a.quantity);
        return (
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data} layout="vertical" margin={{ left: 50, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={80} style={{ fontSize: '0.75rem' }} />
                    <Tooltip formatter={(value) => [`${value} uds`, 'Cantidad']} />
                    <Bar dataKey="quantity" name="Unidades" fill="#1976d2" radius={[0, 4, 4, 0]} />
                </BarChart>
            </ResponsiveContainer>
        );
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
                            'Total Vendido'
                        ];
                    }} />
                    <Bar dataKey="total" name="Total Vendido" fill="#8884d8" radius={[0, 4, 4, 0]} />
                </BarChart>
            </ResponsiveContainer>
        );
    };

    const renderHourlyChart = () => {
        if (!metrics?.hourlyData || metrics.hourlyData.length === 0) return <p style={{ textAlign: "center", padding: "2rem" }}>No hay datos para mostrar</p>;
        return (
            <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={metrics.hourlyData}>
                    <defs>
                        <linearGradient id="colorHourly" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#e85d26" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#e85d26" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis tickFormatter={(v) => `Bs${v}`} />
                    <Tooltip formatter={(value) => [formatCurrency(value as number), 'Ventas']} />
                    <Area type="monotone" dataKey="amount" name="Ventas" stroke="#e85d26" fillOpacity={1} fill="url(#colorHourly)" />
                </ComposedChart>
            </ResponsiveContainer>
        );
    };

    const renderChannelsChart = () => {
        if (!biData) return <p style={{ textAlign: "center", padding: "2rem" }}>No hay datos para mostrar</p>;
        const data = [
            { name: 'Salón', value: biData.dineInSales || 0, color: '#030213' },
            { name: 'Delivery', value: biData.deliverySales || 0, color: '#e85d26' },
            { name: 'Para Llevar', value: biData.pickUpSales || 0, color: '#27ae60' },
        ].filter(item => item.value > 0);

        if (data.length === 0) return <p style={{ textAlign: "center", padding: "2rem" }}>No hay ventas registradas por canal</p>;
        return (
            <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip formatter={(value) => [formatCurrency(value as number), 'Monto']} />
                    <Legend verticalAlign="bottom" height={36} />
                </PieChart>
            </ResponsiveContainer>
        );
    };

    useEffect(() => {
        fetchReport();
        fetchMetrics();
    }, [periodType, selectedDay, selectedMonth, selectedYear, compare, fetchReport, fetchMetrics]);

    if (userLoading || !user) return null;

    return (
        <div style={containerStyle}>
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
                    <button onClick={handlePrint} style={buttonStyle}>
                        <Printer size={16} /> Imprimir
                    </button>
                </div>
            </header>

            <main style={{ maxWidth: 1280, margin: "0 auto", padding: "1.5rem" }}>
                {/* Filtros */}
                <div style={cardStyle}>
                    <div style={{ display: "flex", gap: "1rem", alignItems: "flex-end", flexWrap: "wrap" }}>
                        <div>
                            <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.875rem", fontWeight: "bold" }}>Período</label>
                            <select
                                value={periodType}
                                onChange={(e) => setPeriodType(e.target.value as 'day' | 'month' | 'year')}
                                style={selectStyle}
                            >
                                <option value="day">Día</option>
                                <option value="month">Mes</option>
                                <option value="year">Año</option>
                            </select>
                        </div>

                        {periodType === 'day' && (
                            <div>
                                <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.875rem", fontWeight: "bold" }}>Fecha</label>
                                <input
                                    type="date"
                                    value={selectedDay}
                                    onChange={(e) => setSelectedDay(e.target.value)}
                                    style={selectStyle}
                                />
                            </div>
                        )}

                        {periodType === 'month' && (
                            <>
                                <div>
                                    <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.875rem", fontWeight: "bold" }}>Mes</label>
                                    <input
                                        type="month"
                                        value={selectedMonth}
                                        onChange={(e) => setSelectedMonth(e.target.value)}
                                        style={selectStyle}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.875rem", fontWeight: "bold" }}>Comparar con</label>
                                    <select
                                        value={compare}
                                        onChange={(e) => setCompare(e.target.value as 'none' | 'previous_month')}
                                        style={selectStyle}
                                    >
                                        <option value="none">Sin comparación</option>
                                        <option value="previous_month">Mes anterior</option>
                                    </select>
                                </div>
                            </>
                        )}

                        {periodType === 'year' && (
                            <>
                                <div>
                                    <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.875rem", fontWeight: "bold" }}>Año</label>
                                    <input
                                        type="number"
                                        value={selectedYear}
                                        onChange={(e) => setSelectedYear(e.target.value)}
                                        style={selectStyle}
                                        min={2020}
                                        max={new Date().getFullYear()}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.875rem", fontWeight: "bold" }}>Comparar con</label>
                                    <select
                                        value={compare}
                                        onChange={(e) => setCompare(e.target.value as 'none' | 'previous_year')}
                                        style={selectStyle}
                                    >
                                        <option value="none">Sin comparación</option>
                                        <option value="previous_year">Año anterior</option>
                                    </select>
                                </div>
                            </>
                        )}

                        <button onClick={fetchReport} style={buttonStyle}>
                            <Calendar size={16} /> Consultar
                        </button>
                    </div>
                </div>

                {/* Pestañas de Alto Nivel de BI */}
                <div style={{ display: "flex", borderBottom: "2px solid var(--border)", marginBottom: "1.5rem", gap: "1rem", flexWrap: "wrap", paddingBottom: "0.25rem" }} className="print-hide">
                    <button
                        onClick={() => handleSectionChange('financial')}
                        style={{
                            padding: "0.75rem 1.5rem",
                            backgroundColor: mainSection === 'financial' ? "var(--primary)" : "transparent",
                            border: "none",
                            borderRadius: "var(--radius-md)",
                            color: mainSection === 'financial' ? "var(--primary-foreground)" : "var(--foreground)",
                            fontWeight: "bold",
                            cursor: "pointer",
                            fontSize: "0.9rem",
                            transition: "all 0.2s ease",
                            boxShadow: mainSection === 'financial' ? "0 4px 12px rgba(0,0,0,0.1)" : "none",
                        }}
                    >
                        💰 Reporte Financiero
                    </button>
                    <button
                        onClick={() => handleSectionChange('operations')}
                        style={{
                            padding: "0.75rem 1.5rem",
                            backgroundColor: mainSection === 'operations' ? "var(--primary)" : "transparent",
                            border: "none",
                            borderRadius: "var(--radius-md)",
                            color: mainSection === 'operations' ? "var(--primary-foreground)" : "var(--foreground)",
                            fontWeight: "bold",
                            cursor: "pointer",
                            fontSize: "0.9rem",
                            transition: "all 0.2s ease",
                            boxShadow: mainSection === 'operations' ? "0 4px 12px rgba(0,0,0,0.1)" : "none",
                        }}
                    >
                        👥 Personal y Salón
                    </button>
                    <button
                        onClick={() => handleSectionChange('products')}
                        style={{
                            padding: "0.75rem 1.5rem",
                            backgroundColor: mainSection === 'products' ? "var(--primary)" : "transparent",
                            border: "none",
                            borderRadius: "var(--radius-md)",
                            color: mainSection === 'products' ? "var(--primary-foreground)" : "var(--foreground)",
                            fontWeight: "bold",
                            cursor: "pointer",
                            fontSize: "0.9rem",
                            transition: "all 0.2s ease",
                            boxShadow: mainSection === 'products' ? "0 4px 12px rgba(0,0,0,0.1)" : "none",
                        }}
                    >
                        🍽️ Menú y Demanda
                    </button>
                </div>

                {loading && (
                    <div style={{ textAlign: "center", padding: "3rem", color: "var(--muted-foreground)" }}>
                        Cargando...
                    </div>
                )}

                {biData && !loading && (
                    <>
                        {/* ========================================================================= */}
                        {/* 1. SECCIÓN FINANCIERA                                                     */}
                        {/* ========================================================================= */}
                        {mainSection === 'financial' && (
                            <>
                                {/* Stats Cards */}
                                <div style={statsGridStyle}>
                                    <div style={{ ...statCardStyle, borderLeft: "4px solid #27ae60" }} className="stat-card">
                                        <DollarSign size={24} style={{ margin: "0 auto 0.5rem", color: "#27ae60" }} />
                                        <h3 style={{ fontSize: "1.5rem", fontWeight: "bold", margin: 0 }}>{formatCurrency(biData.totalSales)}</h3>
                                        <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", margin: 0 }}>Ventas Totales</p>
                                        {biData.compareTotal !== undefined && biData.compareTotal > 0 && (
                                            <p style={{ fontSize: "0.7rem", marginTop: "0.25rem", color: biData.totalSales >= biData.compareTotal ? "#27ae60" : "#e85d26" }}>
                                                {biData.totalSales >= biData.compareTotal ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                                {Math.abs(((biData.totalSales - biData.compareTotal) / biData.compareTotal) * 100).toFixed(1)}% vs período anterior
                                            </p>
                                        )}
                                    </div>
                                    <div style={{ ...statCardStyle, borderLeft: "4px solid #2e7d32" }} className="stat-card">
                                        <CreditCard size={24} style={{ margin: "0 auto 0.5rem", color: "#2e7d32" }} />
                                        <h3 style={{ fontSize: "1.5rem", fontWeight: "bold", margin: 0 }}>{formatCurrency(biData.cashTotal)}</h3>
                                        <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", margin: 0 }}>Efectivo</p>
                                    </div>
                                    <div style={{ ...statCardStyle, borderLeft: "4px solid #1976d2" }} className="stat-card">
                                        <CreditCard size={24} style={{ margin: "0 auto 0.5rem", color: "#1976d2" }} />
                                        <h3 style={{ fontSize: "1.5rem", fontWeight: "bold", margin: 0 }}>{formatCurrency(biData.qrTotal)}</h3>
                                        <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", margin: 0 }}>QR / Digital</p>
                                    </div>
                                    <div style={{ ...statCardStyle, borderLeft: "4px solid #e85d26" }} className="stat-card">
                                        <Bike size={24} style={{ margin: "0 auto 0.5rem", color: "#e85d26" }} />
                                        <h3 style={{ fontSize: "1.5rem", fontWeight: "bold", margin: 0 }}>{formatCurrency(biData.deliverySales || 0)}</h3>
                                        <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", margin: 0 }}>Ventas Delivery</p>
                                    </div>
                                    <div style={{ ...statCardStyle, borderLeft: "4px solid #9c27b0" }} className="stat-card">
                                        <DollarSign size={24} style={{ margin: "0 auto 0.5rem", color: "#9c27b0" }} />
                                        <h3 style={{ fontSize: "1.5rem", fontWeight: "bold", margin: 0 }}>{formatCurrency(biData.deliveryFeesTotal || 0)}</h3>
                                        <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", margin: 0 }}>Cargos de Envío</p>
                                    </div>
                                </div>

                                {/* Gráficos Financieros */}
                                <div style={{ ...cardStyle, marginBottom: "1.5rem" }}>
                                    <div style={{ display: "flex", borderBottom: "1px solid var(--border)", marginBottom: "1.5rem", gap: "0.5rem", flexWrap: "wrap" }}>
                                        <button 
                                            onClick={() => setActiveTab('sales')} 
                                            style={{
                                                padding: "0.75rem 1rem",
                                                backgroundColor: "transparent",
                                                border: "none",
                                                borderBottom: activeTab === 'sales' ? "2px solid #e85d26" : "none",
                                                color: activeTab === 'sales' ? "#e85d26" : "var(--muted-foreground)",
                                                fontWeight: activeTab === 'sales' ? "bold" : "normal",
                                                cursor: "pointer",
                                                fontSize: "0.875rem",
                                            }}
                                        >
                                            📈 Tendencia de Ventas
                                        </button>
                                        <button 
                                            onClick={() => setActiveTab('channels')} 
                                            style={{
                                                padding: "0.75rem 1rem",
                                                backgroundColor: "transparent",
                                                border: "none",
                                                borderBottom: activeTab === 'channels' ? "2px solid #e85d26" : "none",
                                                color: activeTab === 'channels' ? "#e85d26" : "var(--muted-foreground)",
                                                fontWeight: activeTab === 'channels' ? "bold" : "normal",
                                                cursor: "pointer",
                                                fontSize: "0.875rem",
                                            }}
                                        >
                                            🛵 Canales de Venta
                                        </button>
                                    </div>

                                    <div style={{ minHeight: "320px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                                        {activeTab === 'sales' && (
                                            <>
                                                {periodType === 'day' ? (
                                                    <div style={{ textAlign: "center", padding: "2rem" }}>
                                                        <p style={{ color: "var(--muted-foreground)", fontSize: "0.875rem" }}>
                                                            📊 Vista de día: No hay gráfico de tendencia disponible para un solo día.
                                                        </p>
                                                        <p style={{ color: "var(--muted-foreground)", fontSize: "0.75rem", marginTop: "0.5rem" }}>
                                                            Consulta el reporte de <strong>Menú y Demanda</strong> para ver las horas pico de hoy, o cambia el período a <strong>Mes</strong> o <strong>Año</strong>.
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <>
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
                                                        <div style={{ width: "100%", height: 300 }}>
                                                            {renderChart()}
                                                        </div>
                                                    </>
                                                )}
                                            </>
                                        )}

                                        {activeTab === 'channels' && (
                                            <div style={{ width: "100%", height: 300 }}>
                                                {renderChannelsChart()}
                                            </div>
                                        )}
                                    </div>
                                </div>

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
                                                {Object.entries(periodType === 'year' ? (biData.monthlyIncome || {}) : (biData.dailyIncome || {})).map(([key, amount]) => (
                                                    <tr key={key}>
                                                        <td style={{ padding: "0.5rem 0.75rem", borderBottom: `1px solid var(--border)` }}>
                                                            {periodType === 'year' ? key : (periodType === 'day' ? formatDateKey(selectedDay) : formatDateKey(key))}
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
                            </>
                        )}

                        {/* ========================================================================= */}
                        {/* 2. SECCIÓN DE PERSONAL Y SALÓN                                           */}
                        {/* ========================================================================= */}
                        {mainSection === 'operations' && (
                            <>
                                {/* Stats Cards */}
                                <div style={statsGridStyle}>
                                    <div style={{ ...statCardStyle, borderLeft: "4px solid #607d8b" }} className="stat-card">
                                        <Users size={24} style={{ margin: "0 auto 0.5rem", color: "#607d8b" }} />
                                        <h3 style={{ fontSize: "1.5rem", fontWeight: "bold", margin: 0 }}>{biData.tablesServed}</h3>
                                        <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", margin: 0 }}>Mesas Atendidas</p>
                                    </div>
                                    <div style={{ ...statCardStyle, borderLeft: "4px solid #2e7d32" }} className="stat-card">
                                        <Users size={24} style={{ margin: "0 auto 0.5rem", color: "#2e7d32" }} />
                                        <h3 style={{ fontSize: "1.5rem", fontWeight: "bold", margin: 0 }}>{metricsLoading ? "..." : (metrics?.completedPayments || 0)}</h3>
                                        <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", margin: 0 }}>Pedidos Completados</p>
                                    </div>
                                    <div style={{ ...statCardStyle, borderLeft: "4px solid #1976d2" }} className="stat-card">
                                        <Users size={24} style={{ margin: "0 auto 0.5rem", color: "#1976d2" }} />
                                        <h3 style={{ fontSize: "1.5rem", fontWeight: "bold", margin: 0 }}>{metricsLoading ? "..." : (metrics?.totalOrders || 0)}</h3>
                                        <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", margin: 0 }}>Total Órdenes Creadas</p>
                                    </div>
                                </div>

                                {/* Gráfico de Meseros */}
                                <div style={cardStyle}>
                                    <h3 style={{ fontSize: "1.125rem", fontWeight: "bold", marginBottom: "1.5rem", borderLeft: "4px solid #8884d8", paddingLeft: "0.5rem" }}>
                                        🥇 Rendimiento por Mesero (Total Facturado y Pedidos)
                                    </h3>
                                    <div style={{ width: "100%", height: 300 }}>
                                        {renderWaitersChart()}
                                    </div>
                                </div>

                                {/* Listas de Desglose de Operaciones (Grid 2x2) */}
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1.5rem", marginBottom: "1.5rem" }}>
                                    {/* Top Meseros */}
                                    <div style={cardStyle}>
                                        <h3 style={{ fontSize: "1rem", fontWeight: "bold", marginBottom: "1rem", borderLeft: "3px solid #e85d26", paddingLeft: "0.5rem" }}>
                                            🥇 Top Meseros
                                        </h3>
                                        {metricsLoading ? (
                                            <p style={{ textAlign: "center", padding: "2rem", color: "var(--muted-foreground)" }}>Cargando...</p>
                                        ) : (
                                            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                                                {metrics?.topWaiters?.map((waiter, idx) => (
                                                    <li key={waiter.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0", borderBottom: "1px solid var(--border)" }}>
                                                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                                            <span style={{ fontWeight: "bold", color: "#e85d26", width: "30px" }}>#{idx + 1}</span>
                                                            <span style={{ fontSize: "0.875rem" }}>{waiter.name}</span>
                                                        </div>
                                                        <span style={{ fontWeight: "bold", fontSize: "0.875rem" }}>
                                                            {formatCurrency(waiter.total)} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--muted-foreground)' }}>({waiter.count || 0} ped.)</span>
                                                        </span>
                                                    </li>
                                                ))}
                                                {(!metrics?.topWaiters || metrics.topWaiters.length === 0) && (
                                                    <p style={{ textAlign: "center", padding: "1rem", color: "var(--muted-foreground)" }}>No hay datos</p>
                                                )}
                                            </ul>
                                        )}
                                    </div>

                                    {/* Top Mesas */}
                                    <div style={cardStyle}>
                                        <h3 style={{ fontSize: "1rem", fontWeight: "bold", marginBottom: "1rem", borderLeft: "3px solid #e85d26", paddingLeft: "0.5rem" }}>
                                            🪑 Top Mesas
                                        </h3>
                                        {metricsLoading ? (
                                            <p style={{ textAlign: "center", padding: "2rem", color: "var(--muted-foreground)" }}>Cargando...</p>
                                        ) : (
                                            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                                                {metrics?.topTables?.map((table, idx) => (
                                                    <li key={table.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0", borderBottom: "1px solid var(--border)" }}>
                                                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                                            <span style={{ fontWeight: "bold", color: "#e85d26", width: "30px" }}>#{idx + 1}</span>
                                                            <span style={{ fontSize: "0.875rem" }}>Mesa {table.number || 'N/A'}</span>
                                                        </div>
                                                        <span style={{ fontWeight: "bold", fontSize: "0.875rem" }}>{formatCurrency(table.total)}</span>
                                                    </li>
                                                ))}
                                                {(!metrics?.topTables || metrics.topTables.length === 0) && (
                                                    <p style={{ textAlign: "center", padding: "1rem", color: "var(--muted-foreground)" }}>No hay datos</p>
                                                )}
                                            </ul>
                                        )}
                                    </div>

                                    {/* Clientes Destacados */}
                                    <div style={cardStyle}>
                                        <h3 style={{ fontSize: "1rem", fontWeight: "bold", marginBottom: "1rem", borderLeft: "3px solid #e85d26", paddingLeft: "0.5rem" }}>
                                            👥 Clientes Destacados
                                        </h3>
                                        {metricsLoading ? (
                                            <p style={{ textAlign: "center", padding: "2rem", color: "var(--muted-foreground)" }}>Cargando...</p>
                                        ) : (
                                            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                                                {metrics?.topCustomers?.map((customer, idx) => (
                                                    <li key={customer.email} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0", borderBottom: "1px solid var(--border)" }}>
                                                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                                            <span style={{ fontWeight: "bold", color: "#e85d26", width: "30px" }}>#{idx + 1}</span>
                                                            <span style={{ fontSize: "0.875rem" }}>{customer.name}</span>
                                                        </div>
                                                        <span style={{ fontWeight: "bold", fontSize: "0.875rem" }}>{formatCurrency(customer.total)}</span>
                                                    </li>
                                                ))}
                                                {(!metrics?.topCustomers || metrics.topCustomers.length === 0) && (
                                                    <p style={{ textAlign: "center", padding: "1rem", color: "var(--muted-foreground)" }}>No hay datos</p>
                                                )}
                                            </ul>
                                        )}
                                    </div>

                                    {/* Eficiencia Operativa */}
                                    <div style={cardStyle}>
                                        <h3 style={{ fontSize: "1rem", fontWeight: "bold", marginBottom: "1rem", borderLeft: "3px solid #e85d26", paddingLeft: "0.5rem" }}>
                                            ⚡ Eficiencia Operativa
                                        </h3>
                                        {metricsLoading ? (
                                            <p style={{ textAlign: "center", padding: "2rem", color: "var(--muted-foreground)" }}>Cargando...</p>
                                        ) : (
                                            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                                                <li style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0", borderBottom: "1px solid var(--border)" }}>
                                                    <span style={{ fontSize: "0.875rem" }}>✅ Pedidos completados</span>
                                                    <span style={{ fontWeight: "bold", fontSize: "0.875rem" }}>{metrics?.completedPayments || 0}</span>
                                                </li>
                                                <li style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0", borderBottom: "1px solid var(--border)" }}>
                                                    <span style={{ fontSize: "0.875rem" }}>📋 Total órdenes creadas</span>
                                                    <span style={{ fontWeight: "bold", fontSize: "0.875rem" }}>{metrics?.totalOrders || 0}</span>
                                                </li>
                                                <li style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0" }}>
                                                    <span style={{ fontSize: "0.875rem" }}>💰 Pedidos pagados</span>
                                                    <span style={{ fontWeight: "bold", fontSize: "0.875rem" }}>{biData?.ordersCount || 0}</span>
                                                </li>
                                            </ul>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}

                        {/* ========================================================================= */}
                        {/* 3. SECCIÓN DE MENÚ Y DEMANDA                                              */}
                        {/* ========================================================================= */}
                        {mainSection === 'products' && (
                            <>
                                {/* Stats Cards */}
                                <div style={statsGridStyle}>
                                    <div style={{ ...statCardStyle, borderLeft: "4px solid #e85d26" }} className="stat-card">
                                        <Calendar size={24} style={{ margin: "0 auto 0.5rem", color: "#e85d26" }} />
                                        <h3 style={{ fontSize: "1rem", fontWeight: "bold", margin: 0 }}>
                                            {metricsLoading ? "Cargando..." : (metrics?.bestDay ? `${new Date(metrics.bestDay.date).toLocaleDateString('es-BO')}` : 'Sin datos')}
                                        </h3>
                                        <h4 style={{ fontSize: "1.1rem", margin: "0.25rem 0 0", color: "#e85d26" }}>
                                            {metricsLoading ? "" : (metrics?.bestDay ? formatCurrency(metrics.bestDay.amount) : '')}
                                        </h4>
                                        <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", margin: 0 }}>Día con más ventas</p>
                                    </div>
                                    <div style={{ ...statCardStyle, borderLeft: "4px solid #1976d2" }} className="stat-card">
                                        <Calendar size={24} style={{ margin: "0 auto 0.5rem", color: "#1976d2" }} />
                                        <h3 style={{ fontSize: "1.2rem", fontWeight: "bold", margin: "0.25rem 0" }}>
                                            {metricsLoading ? "..." : (metrics?.peakHour ? metrics.peakHour.hour : 'Sin datos')}
                                        </h3>
                                        <h4 style={{ fontSize: "1rem", margin: 0, color: "var(--muted-foreground)" }}>
                                            {metricsLoading ? "" : (metrics?.peakHour ? formatCurrency(metrics.peakHour.amount) : '')}
                                        </h4>
                                        <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", margin: 0 }}>Hora pico</p>
                                    </div>
                                </div>

                                {/* Gráficos de Menú y Demanda */}
                                <div style={{ ...cardStyle, marginBottom: "1.5rem" }}>
                                    <div style={{ display: "flex", borderBottom: "1px solid var(--border)", marginBottom: "1.5rem", gap: "0.5rem", flexWrap: "wrap" }}>
                                        <button 
                                            onClick={() => setActiveTab('dishes')} 
                                            style={{
                                                padding: "0.75rem 1rem",
                                                backgroundColor: "transparent",
                                                border: "none",
                                                borderBottom: activeTab === 'dishes' ? "2px solid #e85d26" : "none",
                                                color: activeTab === 'dishes' ? "#e85d26" : "var(--muted-foreground)",
                                                fontWeight: activeTab === 'dishes' ? "bold" : "normal",
                                                cursor: "pointer",
                                                fontSize: "0.875rem",
                                            }}
                                        >
                                            🍽️ Platos más Vendidos
                                        </button>
                                        <button 
                                            onClick={() => setActiveTab('hours')} 
                                            style={{
                                                padding: "0.75rem 1rem",
                                                backgroundColor: "transparent",
                                                border: "none",
                                                borderBottom: activeTab === 'hours' ? "2px solid #e85d26" : "none",
                                                color: activeTab === 'hours' ? "#e85d26" : "var(--muted-foreground)",
                                                fontWeight: activeTab === 'hours' ? "bold" : "normal",
                                                cursor: "pointer",
                                                fontSize: "0.875rem",
                                            }}
                                        >
                                            ⏰ Flujo de Horas Pico
                                        </button>
                                    </div>

                                    <div style={{ minHeight: "320px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                                        {activeTab === 'dishes' && (
                                            <div style={{ width: "100%", height: 300 }}>
                                                {renderDishesChart()}
                                            </div>
                                        )}

                                        {activeTab === 'hours' && (
                                            <div style={{ width: "100%", height: 300 }}>
                                                {renderHourlyChart()}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Listas de Desglose de Menú */}
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1.5rem", marginBottom: "1.5rem" }}>
                                    {/* Top Platos */}
                                    <div style={cardStyle}>
                                        <h3 style={{ fontSize: "1rem", fontWeight: "bold", marginBottom: "1rem", borderLeft: "3px solid #e85d26", paddingLeft: "0.5rem" }}>
                                            🍽️ Top Platos
                                        </h3>
                                        {metricsLoading ? (
                                            <p style={{ textAlign: "center", padding: "2rem", color: "var(--muted-foreground)" }}>Cargando...</p>
                                        ) : (
                                            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                                                {metrics?.topDishes?.map((dish, idx) => (
                                                    <li key={dish.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0", borderBottom: "1px solid var(--border)" }}>
                                                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                                            <span style={{ fontWeight: "bold", color: "#e85d26", width: "30px" }}>#{idx + 1}</span>
                                                            <span style={{ fontSize: "0.875rem" }}>{dish.name}</span>
                                                        </div>
                                                        <span style={{ fontWeight: "bold", fontSize: "0.875rem" }}>{dish.quantity} uds</span>
                                                    </li>
                                                ))}
                                                {(!metrics?.topDishes || metrics.topDishes.length === 0) && (
                                                    <p style={{ textAlign: "center", padding: "1rem", color: "var(--muted-foreground)" }}>No hay datos</p>
                                                )}
                                            </ul>
                                        )}
                                    </div>

                                    {/* Análisis por Tiempo */}
                                    <div style={cardStyle}>
                                        <h3 style={{ fontSize: "1rem", fontWeight: "bold", marginBottom: "1rem", borderLeft: "3px solid #e85d26", paddingLeft: "0.5rem" }}>
                                            📅 Análisis por Tiempo
                                        </h3>
                                        {metricsLoading ? (
                                            <p style={{ textAlign: "center", padding: "2rem", color: "var(--muted-foreground)" }}>Cargando...</p>
                                        ) : (
                                            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                                                <li style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0", borderBottom: "1px solid var(--border)" }}>
                                                    <span style={{ fontSize: "0.875rem" }}>📆 Día con más ventas</span>
                                                    <span style={{ fontWeight: "bold", fontSize: "0.875rem" }}>
                                                        {metrics?.bestDay ? `${new Date(metrics.bestDay.date).toLocaleDateString('es-BO')} - ${formatCurrency(metrics.bestDay.amount)}` : 'Sin datos'}
                                                    </span>
                                                </li>
                                                <li style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0" }}>
                                                    <span style={{ fontSize: "0.875rem" }}>⏰ Hora pico</span>
                                                    <span style={{ fontWeight: "bold", fontSize: "0.875rem" }}>
                                                        {metrics?.peakHour ? `${metrics.peakHour.hour} (${formatCurrency(metrics.peakHour.amount)})` : 'Sin datos'}
                                                    </span>
                                                </li>
                                            </ul>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Summary Footer */}
                        <div style={{ ...cardStyle, textAlign: "center" }}>
                            <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)" }}>
                                Período: {periodType === 'month'
                                    ? `${formatDateKey(`${selectedMonth}-01`)} - ${formatDateKey(`${selectedMonth}-${new Date(parseInt(selectedMonth.split('-')[0]), parseInt(selectedMonth.split('-')[1]), 0).getDate()}`)}`
                                    : periodType === 'year'
                                        ? `${formatDateKey(`${selectedYear}-01-01`)} - ${formatDateKey(`${selectedYear}-12-31`)}`
                                        : `${formatDateKey(selectedDay)} - ${formatDateKey(selectedDay)}`}
                            </p>
                            <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)" }}>
                                Pedidos pagados: {biData.ordersCount}
                            </p>
                        </div>
                    </>
                )}
            </main>

            <style jsx global>{`
        @media print {
          header, .print-hide {
            display: none !important;
          }
          * {
            background-color: white !important;
            color: black !important;
          }
        }
        .stat-card {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .stat-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.06);
        }
      `}</style>
        </div>
    );
}