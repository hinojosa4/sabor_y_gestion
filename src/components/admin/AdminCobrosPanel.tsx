"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, RefreshCw, Search, X } from "lucide-react";
import { getPusherClient } from "@/lib/pusherClient";
import { formatOrderLabel } from "@/lib/orderDisplay";

type PaymentMethod = "cash" | "qr" | null;
type PaymentStatus = "pending" | "completed";
type CustomerType = "registered" | "guest" | "none";

type CobroItem = {
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  status: string;
};

type Cobro = {
  id: string;
  orderId: string;
  amount: number;
  method: PaymentMethod;
  methodLabel: string;
  paymentStatus: PaymentStatus;
  orderStatus: string;
  paidAt: string | null;
  createdAt: string | null;
  dateType: "payment" | "order";
  tableNumber: number | null;
  serviceType: string | null;
  customer: {
    type: CustomerType;
    name: string;
    email: string | null;
    receiptEmail: string | null;
    phone: string | null;
    address: string | null;
  };
  items: CobroItem[];
};

type Summary = {
  total: number;
  cash: number;
  qr: number;
  pending: number;
  count: number;
};

type Pagination = {
  page: number;
  pageSize: number;
  totalRows: number;
  totalPages: number;
};

type Props = {
  isMobile: boolean;
  compactHeader?: boolean;
};

const paymentStatusLabel: Record<string, string> = {
  pending: "Pendiente",
  completed: "Pagado",
};

const orderStatusLabel: Record<string, string> = {
  pending: "Pendiente",
  in_kitchen: "En cocina",
  ready: "Listo",
  delivered: "Entregado",
  paid: "Pagado",
  picked_up: "Recogido",
  in_transit: "En camino",
  sin_orden: "Sin orden",
};

const customerTypeLabel: Record<CustomerType, string> = {
  registered: "Cliente registrado",
  guest: "Cliente invitado",
  none: "Cliente no registrado",
};

const serviceTypeLabel: Record<string, string> = {
  dine_in: "Consumo en mesa",
  delivery: "Delivery",
  pick_up: "Para recoger",
};

function todayInputValue() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-BO", {
    style: "currency",
    currency: "BOB",
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDateTime(value: string | null) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleString("es-BO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRowDate(row: Cobro) {
  const prefix = row.dateType === "payment" ? "Pago" : "Orden";
  return `${prefix}: ${formatDateTime(row.paidAt ?? row.createdAt)}`;
}

function statusColor(status: string) {
  if (status === "completed" || status === "paid" || status === "ready" || status === "delivered") return "#059669";
  if (status === "pending" || status === "in_kitchen") return "#d97706";
  return "#6b7280";
}

export function AdminCobrosPanel({ isMobile, compactHeader = false }: Props) {
  const today = useMemo(() => todayInputValue(), []);
  const [rows, setRows] = useState<Cobro[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, cash: 0, qr: 0, pending: 0, count: 0 });
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 10, totalRows: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [method, setMethod] = useState("all");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [orderStatus, setOrderStatus] = useState("all");
  const [selected, setSelected] = useState<Cobro | null>(null);
  const [dateError, setDateError] = useState("");

  const dateValidation = useMemo(() => {
    if (from && to && from > to) return "La fecha desde no puede ser mayor que la fecha hasta.";
    if (from && from > today) return "La fecha desde no puede ser futura.";
    if (to && to > today) return "La fecha hasta no puede ser futura.";
    if (from && to) {
      const diffDays = (new Date(`${to}T00:00:00`).getTime() - new Date(`${from}T00:00:00`).getTime()) / 86_400_000;
      if (diffDays > 90) return "El rango máximo permitido es de 90 días.";
    }
    return "";
  }, [from, today, to]);

  const fetchCobros = useCallback(async () => {
    if (dateValidation) {
      setDateError(dateValidation);
      setLoading(false);
      return;
    }

    setDateError("");
    setLoading(true);
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (method !== "all") params.set("method", method);
    if (paymentStatus !== "all") params.set("status", paymentStatus);
    if (orderStatus !== "all") params.set("orderStatus", orderStatus);
    params.set("page", String(pagination.page));
    params.set("pageSize", String(pagination.pageSize));

    try {
      const res = await fetch(`/api/admin/payments?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Error al cargar cobros");
      setRows(json.data ?? []);
      setSummary(json.summary ?? { total: 0, cash: 0, qr: 0, pending: 0, count: 0 });
      setPagination(json.pagination ?? { page: 1, pageSize: 10, totalRows: 0, totalPages: 1 });
    } catch (error) {
      console.error("[AdminCobrosPanel]", error);
      setRows([]);
      setSummary({ total: 0, cash: 0, qr: 0, pending: 0, count: 0 });
      setPagination((current) => ({ ...current, totalRows: 0, totalPages: 1 }));
    } finally {
      setLoading(false);
    }
  }, [dateValidation, from, method, orderStatus, pagination.page, pagination.pageSize, paymentStatus, search, to]);

  useEffect(() => {
    fetchCobros();
  }, [fetchCobros]);

  useEffect(() => {
    setPagination((current) => ({ ...current, page: 1 }));
  }, [from, method, orderStatus, paymentStatus, search, to]);

  useEffect(() => {
    let mounted = true;
    let channel: ReturnType<Awaited<ReturnType<typeof getPusherClient>>["subscribe"]> | null = null;

    const refresh = () => {
      if (mounted) fetchCobros();
    };

    getPusherClient().then((client) => {
      if (!mounted) return;
      channel = client.subscribe("restaurant");
      channel.bind("payment:completed", refresh);
      channel.bind("order:updated", refresh);
      channel.bind("order:status_updated", refresh);
    });

    return () => {
      mounted = false;
      channel?.unbind("payment:completed", refresh);
      channel?.unbind("order:updated", refresh);
      channel?.unbind("order:status_updated", refresh);
    };
  }, [fetchCobros]);

  const clearFilters = () => {
    setSearch("");
    setFrom(today);
    setTo(today);
    setMethod("all");
    setPaymentStatus("all");
    setOrderStatus("all");
    setDateError("");
    setPagination((current) => ({ ...current, page: 1 }));
  };

  const summaryCards = [
    { label: "Cobrado", value: formatCurrency(summary.total), color: "#e85d26", bg: "#fff8f5", border: "#ffd4bc" },
    { label: "Efectivo", value: formatCurrency(summary.cash), color: "#059669", bg: "#f0fdf4", border: "#a7f3d0" },
    { label: "QR", value: formatCurrency(summary.qr), color: "#2563eb", bg: "#f0f6ff", border: "#bfdbfe" },
    { label: "Pendientes", value: String(summary.pending), color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
  ];

  return (
    <section id="admin-cobros" style={{ padding: isMobile ? "18px 16px 0" : "28px 24px 0", scrollMarginTop: 90, maxWidth: 1280, margin: "0 auto" }}>
      <div style={{ display: compactHeader ? "none" : "flex", alignItems: isMobile ? "flex-start" : "center", justifyContent: "space-between", gap: 12, flexDirection: isMobile ? "column" : "row", marginBottom: 14 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: isMobile ? 18 : 22, fontWeight: 700, color: "#1a1a1a" }}>Cobros en tiempo real</h2>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#777" }}>Órdenes pendientes y pagos por efectivo o QR en tiempo real.</p>
        </div>
        <button onClick={fetchCobros} style={{ display: "inline-flex", alignItems: "center", gap: 8, border: "1.5px solid #e0e0e0", background: "#fff", color: "#333", borderRadius: 8, padding: "9px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
          <RefreshCw size={15} />
          Actualizar
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, minmax(0, 1fr))", gap: 10, marginBottom: 12 }}>
        {summaryCards.map((card) => (
          <div key={card.label} style={{ background: card.bg, border: `1.5px solid ${card.border}`, borderRadius: 14, padding: isMobile ? "13px 14px" : "16px 18px", minWidth: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
            <p style={{ margin: 0, fontSize: 11, color: "#888" }}>{card.label}</p>
            <p style={{ margin: "4px 0 0", fontSize: isMobile ? 18 : 22, color: card.color, fontWeight: 800, lineHeight: 1.1, overflowWrap: "anywhere" }}>{card.value}</p>
          </div>
        ))}
      </div>

      <div style={{ background: "#fff", border: "1.5px solid #e8e8e8", borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
        <div style={{ padding: isMobile ? 12 : 16, borderBottom: "1.5px solid #f0f0f0", background: "#fbfbfb", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.4fr repeat(5, minmax(120px, 1fr)) auto", gap: 10 }}>
          <label style={{ position: "relative" }}>
            <Search size={15} style={{ position: "absolute", left: 10, top: 10, color: "#888" }} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar pedido, cliente, mesa o correo" style={{ width: "100%", height: 36, padding: "0 10px 0 32px", border: "1.5px solid #e0e0e0", borderRadius: 8, fontFamily: "inherit", fontSize: 12 }} />
          </label>
          <input type="date" value={from} max={today} onChange={(e) => setFrom(e.target.value)} style={filterInputStyle} title="Fecha desde" />
          <input type="date" value={to} min={from || undefined} max={today} onChange={(e) => setTo(e.target.value)} style={filterInputStyle} title="Fecha hasta" />
          <select value={method} onChange={(e) => setMethod(e.target.value)} style={filterInputStyle}>
            <option value="all">Todos los métodos</option>
            <option value="cash">Efectivo</option>
            <option value="qr">QR</option>
          </select>
          <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} style={filterInputStyle}>
            <option value="all">Todo cobro</option>
            <option value="completed">Pagado</option>
            <option value="pending">Pendiente</option>
          </select>
          <select value={orderStatus} onChange={(e) => setOrderStatus(e.target.value)} style={filterInputStyle}>
            <option value="all">Toda preparación</option>
            <option value="pending">Pendiente</option>
            <option value="in_kitchen">En cocina</option>
            <option value="ready">Listo</option>
            <option value="delivered">Entregado</option>
            <option value="paid">Pagado</option>
          </select>
          <button onClick={clearFilters} style={{ border: "1.5px solid #e0e0e0", background: "#f7f7f7", borderRadius: 8, padding: "0 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", minHeight: 36 }}>
            Limpiar
          </button>
        </div>

        {dateError && (
          <div style={{ padding: "0 16px 12px", color: "#dc2626", fontSize: 12, fontWeight: 700 }}>
            {dateError}
          </div>
        )}

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 920 }}>
            <thead>
              <tr style={{ background: "#fafafa" }}>
                {["Pedido", "Cliente", "Método", "Total", "Cobro", "Preparación", "Fecha", ""].map((head) => (
                  <th key={head} style={{ textAlign: "left", padding: "12px 14px", fontSize: 11, color: "#777", fontWeight: 800, borderBottom: "1px solid #eee", whiteSpace: "nowrap" }}>{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={emptyCellStyle}>Cargando cobros...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={8} style={emptyCellStyle}>No hay cobros para los filtros seleccionados.</td></tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                    <td style={cellStyle}>
                      <span style={{ fontWeight: 800, color: "#1a1a1a" }}>{formatOrderLabel(row.orderId)}</span>
                      {row.tableNumber && <p style={subCellStyle}>Mesa {row.tableNumber}</p>}
                    </td>
                    <td style={cellStyle}>
                      <span style={{ fontWeight: 700, color: "#333" }}>{row.customer.name}</span>
                      <p style={subCellStyle}>{row.customer.email ?? "Sin correo"} · {customerTypeLabel[row.customer.type]}</p>
                    </td>
                    <td style={cellStyle}>{row.methodLabel}</td>
                    <td style={{ ...cellStyle, fontWeight: 800 }}>{formatCurrency(row.amount)}</td>
                    <td style={cellStyle}><StatusBadge label={paymentStatusLabel[row.paymentStatus] ?? row.paymentStatus} color={statusColor(row.paymentStatus)} /></td>
                    <td style={cellStyle}><StatusBadge label={orderStatusLabel[row.orderStatus] ?? row.orderStatus} color={statusColor(row.orderStatus)} /></td>
                    <td style={cellStyle}>{formatRowDate(row)}</td>
                    <td style={cellStyle}>
                      <button onClick={() => setSelected(row)} title="Ver detalle" style={{ width: 34, height: 34, display: "inline-flex", alignItems: "center", justifyContent: "center", border: "1.5px solid #e0e0e0", background: "#fff", borderRadius: 8, cursor: "pointer" }}>
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div style={{ padding: isMobile ? 12 : 14, borderTop: "1.5px solid #f0f0f0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexDirection: isMobile ? "column" : "row" }}>
          <p style={{ margin: 0, fontSize: 12, color: "#777" }}>
            Mostrando {rows.length} de {pagination.totalRows} cobro{pagination.totalRows === 1 ? "" : "s"}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <select value={pagination.pageSize} onChange={(e) => setPagination((current) => ({ ...current, page: 1, pageSize: Number(e.target.value) }))} style={{ ...filterInputStyle, width: 92 }}>
              <option value={10}>10 filas</option>
              <option value={20}>20 filas</option>
              <option value={50}>50 filas</option>
            </select>
            <button disabled={pagination.page <= 1 || loading} onClick={() => setPagination((current) => ({ ...current, page: Math.max(1, current.page - 1) }))} style={paginationButtonStyle}>
              Anterior
            </button>
            <span style={{ fontSize: 12, color: "#555", fontWeight: 700, minWidth: 70, textAlign: "center" }}>
              {pagination.page} / {pagination.totalPages}
            </span>
            <button disabled={pagination.page >= pagination.totalPages || loading} onClick={() => setPagination((current) => ({ ...current, page: Math.min(current.totalPages, current.page + 1) }))} style={paginationButtonStyle}>
              Siguiente
            </button>
          </div>
        </div>
      </div>

      {selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200, display: "flex", justifyContent: "flex-end" }} onClick={() => setSelected(null)}>
          <aside style={{ width: isMobile ? "100%" : 460, height: "100%", background: "#fff", padding: isMobile ? 18 : 24, overflowY: "auto", boxShadow: "-12px 0 32px rgba(0,0,0,0.16)" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, marginBottom: 20 }}>
              <div>
                <p style={{ margin: 0, fontSize: 12, color: "#888", fontWeight: 700 }}>Detalle de cobro</p>
                <h3 style={{ margin: "4px 0 0", fontSize: 22, color: "#1a1a1a" }}>{formatOrderLabel(selected.orderId)}</h3>
              </div>
              <button onClick={() => setSelected(null)} aria-label="Cerrar detalle" title="Cerrar detalle" style={{ width: 40, height: 40, border: "1.5px solid #e0e0e0", background: "#f7f7f7", borderRadius: 10, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#333" }}>
                <X size={17} />
              </button>
            </div>

            <DetailBlock title="Cliente">
              <DetailLine label="Nombre" value={selected.customer.name} />
              <DetailLine label="Tipo" value={customerTypeLabel[selected.customer.type]} />
              <DetailLine label="Correo" value={selected.customer.email ?? "Sin correo"} />
              {selected.customer.receiptEmail && <DetailLine label="Comprobante" value={selected.customer.receiptEmail} />}
              {selected.customer.phone && <DetailLine label="Teléfono" value={selected.customer.phone} />}
              {selected.customer.address && <DetailLine label="Dirección" value={selected.customer.address} />}
            </DetailBlock>

            <DetailBlock title="Pago">
              <DetailLine label="Método" value={selected.methodLabel} />
              <DetailLine label="Monto" value={formatCurrency(selected.amount)} />
              <DetailLine label="Estado cobro" value={paymentStatusLabel[selected.paymentStatus] ?? selected.paymentStatus} />
              <DetailLine label={selected.dateType === "payment" ? "Fecha de pago" : "Fecha de orden"} value={formatDateTime(selected.paidAt ?? selected.createdAt)} />
            </DetailBlock>

            <DetailBlock title="Orden">
              <DetailLine label="Mesa" value={selected.tableNumber ? `Mesa ${selected.tableNumber}` : "Sin mesa"} />
              <DetailLine label="Servicio" value={selected.serviceType ? serviceTypeLabel[selected.serviceType] ?? selected.serviceType : "Sin servicio"} />
              <DetailLine label="Preparación" value={orderStatusLabel[selected.orderStatus] ?? selected.orderStatus} />
            </DetailBlock>

            <div>
              <h4 style={{ margin: "0 0 10px", fontSize: 14, color: "#1a1a1a" }}>Productos</h4>
              <div style={{ border: "1.5px solid #eee", borderRadius: 12, overflow: "hidden" }}>
                {selected.items.length > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "48px 1fr auto", gap: 12, padding: "10px 14px", background: "#fafafa", borderBottom: "1px solid #eee" }}>
                    <span style={productHeadStyle}>Cant.</span>
                    <span style={productHeadStyle}>Producto</span>
                    <span style={{ ...productHeadStyle, textAlign: "right" }}>Subtotal</span>
                  </div>
                )}
                {selected.items.length === 0 ? (
                  <p style={{ margin: 0, padding: 14, fontSize: 13, color: "#888" }}>Sin productos registrados.</p>
                ) : (
                  selected.items.map((item, index) => (
                    <div key={`${item.name}-${index}`} style={{ display: "grid", gridTemplateColumns: "48px 1fr auto", gap: 12, padding: "12px 14px", borderBottom: index === selected.items.length - 1 ? "none" : "1px solid #f0f0f0", alignItems: "center" }}>
                      <strong style={{ fontSize: 13, color: "#1a1a1a" }}>{item.quantity}</strong>
                      <div>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#333" }}>{item.name}</p>
                        <p style={subCellStyle}>{formatCurrency(item.unitPrice)} · {orderStatusLabel[item.status] ?? item.status}</p>
                      </div>
                      <strong style={{ fontSize: 13 }}>{formatCurrency(item.subtotal)}</strong>
                    </div>
                  ))
                )}
                {selected.items.length > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "14px", background: "#fff8f5", borderTop: "1px solid #eee" }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: "#1a1a1a" }}>Total</span>
                    <strong style={{ fontSize: 15, color: "#e85d26" }}>{formatCurrency(selected.amount)}</strong>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}

function StatusBadge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", border: `1px solid ${color}35`, background: `${color}12`, color, padding: "4px 9px", borderRadius: 999, fontSize: 11, fontWeight: 800, whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}

function DetailBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18, paddingBottom: 18, borderBottom: "1.5px solid #f0f0f0" }}>
      <h4 style={{ margin: "0 0 10px", fontSize: 14, color: "#1a1a1a" }}>{title}</h4>
      <div style={{ display: "grid", gap: 8 }}>{children}</div>
    </div>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "flex-start" }}>
      <span style={{ fontSize: 12, color: "#888" }}>{label}</span>
      <strong style={{ fontSize: 12, color: "#333", textAlign: "right", overflowWrap: "anywhere" }}>{value}</strong>
    </div>
  );
}

const productHeadStyle: React.CSSProperties = {
  fontSize: 10,
  color: "#888",
  fontWeight: 800,
  textTransform: "uppercase",
};

const filterInputStyle: React.CSSProperties = {
  width: "100%",
  height: 36,
  padding: "0 10px",
  border: "1.5px solid #e0e0e0",
  borderRadius: 8,
  fontFamily: "inherit",
  fontSize: 12,
  background: "#fff",
};

const cellStyle: React.CSSProperties = {
  padding: "12px 14px",
  fontSize: 12,
  color: "#444",
  verticalAlign: "middle",
  whiteSpace: "nowrap",
};

const subCellStyle: React.CSSProperties = {
  margin: "3px 0 0",
  fontSize: 11,
  color: "#888",
  whiteSpace: "nowrap",
};

const emptyCellStyle: React.CSSProperties = {
  padding: 28,
  textAlign: "center",
  color: "#888",
  fontSize: 13,
};

const paginationButtonStyle: React.CSSProperties = {
  minHeight: 36,
  padding: "0 12px",
  border: "1.5px solid #e0e0e0",
  background: "#fff",
  borderRadius: 8,
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
};
