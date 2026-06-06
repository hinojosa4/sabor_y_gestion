// src/lib/email.ts
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

interface OrderItem {
    dish: { name: string; price: number };
    quantity: number;
    subtotal: number;
}

interface SendPaymentEmailParams {
    to: string;
    orderId: string;
    amount: number;
    method: 'cash' | 'qr';
    items: OrderItem[];
    subtotal: number;
    iva: number;
    total: number;
    change?: number;
}

export async function sendPaymentEmail({
    to,
    orderId,
    method,
    items,
    total,
    change
}: SendPaymentEmailParams) {
    const itemsHtml = items.map(item => `
        <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.quantity}x ${item.dish?.name}</td>
            <td style="padding: 8px; text-align: right; border-bottom: 1px solid #ddd;">${formatCurrency(item.subtotal)}</td>
        </tr>
    `).join('');

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">¡Gracias por su compra!</h2>
            <p><strong>Orden N°:</strong> ${orderId}</p>
            <p><strong>Fecha:</strong> ${new Date().toLocaleString('es-BO')}</p>
            <p><strong>Método de pago:</strong> ${method === 'cash' ? 'Efectivo' : 'QR'}</p>
            ${change !== undefined ? `<p><strong>Vuelto:</strong> ${formatCurrency(change)}</p>` : ''}
            
            <h3>Detalle de la orden</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background-color: #f5f5f5;">
                        <th style="padding: 8px; text-align: left;">Producto</th>
                        <th style="padding: 8px; text-align: right;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
                <tfoot>
                    <tr>
                        <td style="padding: 8px; text-align: left;"><strong>Total</strong></td>
                        <td style="padding: 8px; text-align: right;"><strong>${formatCurrency(total)}</strong></td>
                    </tr>
                </tfoot>
            </table>
            
            <p style="margin-top: 20px;">¡Gracias por su visita! Los esperamos nuevamente.</p>
        </div>
    `;

    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to,
        subject: `Factura - Orden ${orderId}`,
        html,
    });
}

const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-BO', {
        style: 'currency',
        currency: 'BOB'
    }).format(amount);
};
interface SendReservationEmailParams {
  to: string;
  contact_name: string;
  status: "confirmed" | "cancelled";
  date: string;        // ISO string
  party_size: number;
  occasion?: string;
  table_number?: number;
  table_location?: string;
  notes?: string;      // nota interna visible al cliente (opcional)
}
 
export async function sendReservationEmail({
  to,
  contact_name,
  status,
  date,
  party_size,
  occasion,
  table_number,
  table_location,
  notes,
}: SendReservationEmailParams) {
  const isConfirmed = status === "confirmed";
 
  const formattedDate = new Date(date).toLocaleDateString("es-BO", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const formattedTime = new Date(date).toLocaleTimeString("es-BO", {
    hour: "2-digit", minute: "2-digit",
  });
 
  const accentColor = isConfirmed ? "#27ae60" : "#e85d26";
  const statusLabel = isConfirmed ? "✅ Confirmada" : "❌ Cancelada";
  const headline    = isConfirmed
    ? `¡Tu reserva está confirmada, ${contact_name}!`
    : `Tu reserva ha sido cancelada, ${contact_name}`;
  const subtext = isConfirmed
    ? "Te esperamos en el restaurante en la fecha y hora indicadas."
    : "Lamentamos los inconvenientes. Puedes hacer una nueva reserva cuando quieras.";
 
  const tableRow = isConfirmed && table_number
    ? `<tr>
        <td style="padding:8px 0;color:#555;font-size:14px;">Mesa asignada</td>
        <td style="padding:8px 0;font-weight:700;font-size:14px;text-align:right;">
          Mesa ${table_number}${table_location ? ` · ${table_location}` : ""}
        </td>
       </tr>`
    : "";
 
  const notesRow = notes
    ? `<tr>
        <td colspan="2" style="padding:8px 0;font-size:13px;color:#888;font-style:italic;">
          📝 Nota del restaurante: ${notes}
        </td>
       </tr>`
    : "";
 
  const html = `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#f8f7f4;padding:24px;">
    <div style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
 
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#1a1a1a 0%,#2d2d2d 50%,#3a2010 100%);padding:32px 36px;text-align:center;">
        <div style="font-size:40px;margin-bottom:8px;">🍽️</div>
        <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">Sabor &amp; Gestión</h1>
        <p style="margin:6px 0 0;color:rgba(255,255,255,0.6);font-size:13px;">Gestión de Reservas</p>
      </div>
 
      <!-- Status badge -->
      <div style="text-align:center;padding:24px 36px 0;">
        <span style="display:inline-block;background:${accentColor}20;color:${accentColor};border:1.5px solid ${accentColor}60;border-radius:999px;padding:6px 20px;font-size:14px;font-weight:700;">
          ${statusLabel}
        </span>
      </div>
 
      <!-- Body -->
      <div style="padding:20px 36px 32px;">
        <h2 style="margin:16px 0 6px;font-size:18px;color:#1a1a1a;">${headline}</h2>
        <p style="margin:0 0 24px;font-size:14px;color:#666;">${subtext}</p>
 
        <!-- Detalle reserva -->
        <div style="background:#f8f7f4;border-radius:12px;padding:20px;">
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:8px 0;color:#555;font-size:14px;">Fecha</td>
              <td style="padding:8px 0;font-weight:700;font-size:14px;text-align:right;text-transform:capitalize;">${formattedDate}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#555;font-size:14px;">Hora</td>
              <td style="padding:8px 0;font-weight:700;font-size:14px;text-align:right;">${formattedTime}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#555;font-size:14px;">Personas</td>
              <td style="padding:8px 0;font-weight:700;font-size:14px;text-align:right;">${party_size} persona${party_size !== 1 ? "s" : ""}</td>
            </tr>
            ${occasion ? `<tr>
              <td style="padding:8px 0;color:#555;font-size:14px;">Ocasión</td>
              <td style="padding:8px 0;font-weight:700;font-size:14px;text-align:right;">🎉 ${occasion}</td>
            </tr>` : ""}
            ${tableRow}
            ${notesRow}
          </table>
        </div>
 
        ${isConfirmed ? `
        <div style="margin-top:20px;padding:14px 18px;background:#e8f8ef;border-radius:10px;border:1px solid #86efac;">
          <p style="margin:0;font-size:13px;color:#166534;">
            📞 <strong>¿Necesitas cambiar algo?</strong> Contáctanos directamente al restaurante con anticipación.
          </p>
        </div>` : `
        <div style="margin-top:20px;padding:14px 18px;background:#fff7ed;border-radius:10px;border:1px solid #fed7aa;">
          <p style="margin:0;font-size:13px;color:#c2410c;">
            📅 <strong>¿Quieres reagendar?</strong> Puedes hacer una nueva reserva desde la app cuando quieras.
          </p>
        </div>`}
 
        <p style="margin:24px 0 0;font-size:12px;color:#bbb;text-align:center;">
          Este correo es una notificación automática · Sabor &amp; Gestión
        </p>
      </div>
    </div>
  </div>`;
 
  await transporter.sendMail({
    from: `"Sabor & Gestión" <${process.env.EMAIL_USER}>`,
    to,
    subject: isConfirmed
      ? `✅ Reserva confirmada · ${formattedDate} ${formattedTime}`
      : `❌ Tu reserva del ${formattedDate} fue cancelada`,
    html,
  });
}