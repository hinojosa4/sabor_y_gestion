// src/app/api/payments/qr-confirm/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Order from '@/models/Order';
import OrderItem from '@/models/OrderItem';
import Table from '@/models/Table';
import Payment from '@/models/Payment';
import { sendPaymentEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
    try {
        await connectDB();

        const { orderId, email } = await req.json();

        // Validar que llegue el email
        if (!email || !email.includes('@')) {
            return NextResponse.json(
                { error: 'El correo electrónico es obligatorio' },
                { status: 400 }
            );
        }

        // Buscar la orden
        const order = await Order.findById(orderId);
        if (!order) {
            return NextResponse.json(
                { error: 'Orden no encontrada' },
                { status: 404 }
            );
        }

        // Verificar que no esté ya pagada
        if (order.status === 'paid') {
            return NextResponse.json(
                { error: 'Esta orden ya fue pagada' },
                { status: 400 }
            );
        }

        // Obtener los items de la orden para la factura
        const items = await OrderItem.find({ order_id: orderId }).lean();

        // Calcular totales (usar el total de la orden o recalcular)
        const totalAmount = order.total_amount;

        // Registrar el pago
        void Payment.create({
            order_id: orderId,
            amount: totalAmount,
            method: 'qr',
            status: 'completed',
            timestamp: new Date(),
        });

        // Actualizar la orden a pagada
        order.status = 'paid';
        await order.save();

        // Liberar la mesa (si es dine_in)
        if (order.service_type === 'dine_in' && order.table_id) {
            await Table.findByIdAndUpdate(order.table_id, { status: 'Libre' });
        }

        // Obtener detalles de los platos para la factura
        const menuItemIds = items.map(item => item.menu_item_id);
        const menuItems = await fetchMenuItems(menuItemIds);
        const menuMap = new Map(menuItems.map(m => [m._id.toString(), m]));

        let subtotal = 0;
        const formattedItems = items.map(item => {
            const menu = menuMap.get(item.menu_item_id.toString());
            const price = menu ? menu.price : item.unit_price;
            const subt = price * item.quantity;
            subtotal += subt;
            return {
                dish: { name: menu?.name || 'Plato', price },
                quantity: item.quantity,
                subtotal: subt,
            };
        });

        const iva = subtotal * 0.13;
        const total = subtotal + iva;

        // Enviar factura por correo
        await sendPaymentEmail({
            to: email,
            orderId: order._id.toString(),
            amount: totalAmount,
            method: 'qr',
            items: formattedItems,
            subtotal,
            iva,
            total,
        });

        return NextResponse.json({
            success: true,
            message: 'Pago confirmado correctamente',
            orderId: order._id,
            items: formattedItems,
            subtotal,
            iva,
            total
        });

    } catch (error) {
        console.error('[QR Confirm] Error:', error);
        return NextResponse.json(
            { error: 'Error al procesar el pago' },
            { status: 500 }
        );
    }
}

// Función auxiliar para obtener los platos del menú
async function fetchMenuItems(ids: string[]) {
    const mongoose = await import('mongoose');
    const MenuItem = (await import('@/models/MenuItem')).default;
    const objectIds = ids.map(id => new mongoose.Types.ObjectId(id));
    return await MenuItem.find({ _id: { $in: objectIds } }).lean();
}