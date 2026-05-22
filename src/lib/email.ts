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
