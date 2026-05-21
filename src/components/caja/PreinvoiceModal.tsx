import React, { useState, useEffect, useRef } from 'react';
import { DollarSign, X, Printer } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface PreinvoiceItem {
  dish: {
    name: string;
    price: number;
  };
  quantity: number;
  subtotal?: number;
}

interface PreinvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableId: string;
  tableNumber: number;
  onPay: (orderId: string, total: number) => void;
  onPrint?: () => void;
}

// Estilos en línea (reemplazo de Tailwind)
const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(0,0,0,0.5)",
  zIndex: 50,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "1rem",
};

const modalStyle: React.CSSProperties = {
  backgroundColor: "var(--card)",
  borderRadius: "var(--radius-lg)",
  padding: "1.5rem",
  maxWidth: "28rem",
  width: "100%",
  margin: "0 auto",
  boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
  fontFamily: "inherit",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "1rem",
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "1.25rem",
  fontWeight: "var(--font-weight-medium)",
  color: "var(--foreground)",
};

const closeButtonStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  color: "var(--muted-foreground)",
  padding: "0.25rem",
  borderRadius: "var(--radius-md)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const tableInfoStyle: React.CSSProperties = {
  margin: "0 0 1rem",
  fontSize: "0.875rem",
  color: "var(--muted-foreground)",
};

const loadingContainerStyle: React.CSSProperties = {
  textAlign: "center",
  padding: "2rem",
};

const spinnerStyle: React.CSSProperties = {
  width: "2rem",
  height: "2rem",
  border: "2px solid var(--muted)",
  borderTopColor: "var(--primary)",
  borderRadius: "50%",
  animation: "spin 1s linear infinite",
  margin: "0 auto",
};

const emptyStateStyle: React.CSSProperties = {
  textAlign: "center",
  padding: "2rem",
  color: "var(--muted-foreground)",
};

const itemsContainerStyle: React.CSSProperties = {
  marginBottom: "1rem",
  maxHeight: "24rem",
  overflowY: "auto",
};

const itemRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  borderBottom: `1px solid var(--border)`,
  paddingBottom: "0.5rem",
  marginBottom: "0.5rem",
};

const totalsContainerStyle: React.CSSProperties = {
  borderTop: `1px solid var(--border)`,
  paddingTop: "1rem",
  marginTop: "0.5rem",
};

const grandTotalStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  fontWeight: "var(--font-weight-medium)",
  fontSize: "1.125rem",
};

const actionsStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "0.5rem",
  marginTop: "1.5rem",
};

const buttonOutlineStyle: React.CSSProperties = {
  backgroundColor: "transparent",
  border: `1px solid var(--border)`,
  borderRadius: "var(--radius-md)",
  padding: "0.5rem 1rem",
  fontSize: "0.875rem",
  fontWeight: "var(--font-weight-medium)",
  cursor: "pointer",
  color: "var(--foreground)",
  fontFamily: "inherit",
  display: "inline-flex",
  alignItems: "center",
  gap: "0.5rem",
};

const buttonGreenStyle: React.CSSProperties = {
  backgroundColor: "#27ae60",
  border: "none",
  borderRadius: "var(--radius-md)",
  padding: "0.5rem 1rem",
  fontSize: "0.875rem",
  fontWeight: "var(--font-weight-medium)",
  cursor: "pointer",
  color: "white",
  fontFamily: "inherit",
  display: "inline-flex",
  alignItems: "center",
  gap: "0.5rem",
};

export function PreinvoiceModal({
  isOpen,
  onClose,
  tableId,
  tableNumber,
  onPay
}: PreinvoiceModalProps) {
  const [items, setItems] = useState<PreinvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [subtotal, setSubtotal] = useState(0);
  const [total, setTotal] = useState(0);
  const printRef = useRef<HTMLDivElement>(null);
  const [orderId, setOrderId] = useState('');

  useEffect(() => {
    if (isOpen && tableId) {
        fetchPreinvoice();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
}, [isOpen, tableId]);

  const fetchPreinvoice = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/preinvoice/${tableId}`);
      const data = await res.json();

      if (data.items) {
        setItems(data.items);
        setSubtotal(data.subtotal || 0);
        setTotal(data.total || 0);
        setOrderId(data.orderId || '');
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-BO', {
      style: 'currency',
      currency: 'BOB'
    }).format(amount);
  };

  const calculatedSubtotal = items.reduce((sum, item) => {
    return sum + (item.dish?.price || 0) * item.quantity;
  }, 0);
  const displaySubtotal = calculatedSubtotal || subtotal;
  const displayTotal = displaySubtotal || total;

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

  if (!isOpen) return null;

  return (
    <>
      {/* Modal normal */}
      <div style={overlayStyle} onClick={onClose}>
        <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
          <div style={headerStyle}>
            <h2 style={titleStyle}>Pre-factura</h2>
            <button onClick={onClose} style={closeButtonStyle}>
              <X size={20} />
            </button>
          </div>

          <p style={tableInfoStyle}>Mesa {tableNumber}</p>

          {loading ? (
            <div style={loadingContainerStyle}>
              <div style={spinnerStyle} />
              <p style={{ marginTop: "0.5rem", color: "var(--muted-foreground)" }}>Cargando...</p>
            </div>
          ) : items.length === 0 ? (
            <div style={emptyStateStyle}>
              No hay pedidos pendientes
            </div>
          ) : (
            <>
              <div style={itemsContainerStyle}>
                {items.map((item, index) => (
                  <div key={index} style={itemRowStyle}>
                    <div>
                      <span style={{ fontWeight: 500 }}>{item.quantity}x</span>
                      <span style={{ marginLeft: "0.5rem" }}>{item.dish?.name || 'Plato'}</span>
                    </div>
                    <span>{formatCurrency((item.dish?.price || 0) * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <div style={totalsContainerStyle}>
                <div style={grandTotalStyle}>
                  <span>Total</span>
                  <span>{formatCurrency(displayTotal)}</span>
                </div>
              </div>


              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: "1.5rem" }}>
                <QRCodeSVG
                  value={`${window.location.origin}/pago-qr/${orderId}`}
                  size={150}
                />
                <p style={{ marginTop: "0.5rem", fontSize: "0.875rem" }}>
                  Escanea el código QR para pagar
                </p>
              </div>

              <div style={actionsStyle}>
                <button onClick={onClose} style={buttonOutlineStyle}>
                  Cerrar
                </button>

                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button onClick={handlePrint} style={buttonOutlineStyle}>
                    <Printer size={16} />
                    Imprimir
                  </button>

                  {onPay && (
                    <button onClick={() => onPay(orderId, displayTotal)} style={buttonGreenStyle}>
                      <DollarSign size={16} />
                      Cobrar
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
        <style dangerouslySetInnerHTML={{
          __html: `
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `
        }} />
      </div>

      {/* Contenido para impresión (oculto) */}
      <div ref={printRef} style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
        <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '1rem' }}>Pre-factura</h2>
          <p style={{ marginBottom: '1rem' }}>Mesa {tableNumber}</p>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #ccc' }}>
                <th style={{ textAlign: 'left', padding: '0.5rem 0' }}>Plato</th>
                <th style={{ textAlign: 'center', padding: '0.5rem 0' }}>Cantidad</th>
                <th style={{ textAlign: 'right', padding: '0.5rem 0' }}>Precio</th>
                <th style={{ textAlign: 'right', padding: '0.5rem 0' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '0.5rem 0' }}>{item.dish?.name || 'Plato'}</td>
                  <td style={{ textAlign: 'center', padding: '0.5rem 0' }}>{item.quantity}</td>
                  <td style={{ textAlign: 'right', padding: '0.5rem 0' }}>{formatCurrency(item.dish?.price || 0)}</td>
                  <td style={{ textAlign: 'right', padding: '0.5rem 0' }}>{formatCurrency((item.dish?.price || 0) * item.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: '1rem', textAlign: 'right' }}>
            <p><strong>Total: {formatCurrency(displayTotal)}</strong></p>
          </div>

          <div style={{ marginTop: "1rem" }}>
            <QRCodeSVG
              value={`${window.location.origin}/pago-qr/${orderId}`}
              size={200}
              style={{ display: "block", margin: "0 auto" }}
            />
            <p style={{ textAlign: "center", fontSize: "0.7rem", marginTop: "0.5rem" }}>
              Escanea para pagar
            </p>
          </div>

          <p style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.8rem', color: '#666' }}>
            Restaurante - Gracias por su visita
          </p>
        </div>
      </div>
    </>
  );
}
