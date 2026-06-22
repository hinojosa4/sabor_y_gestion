import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Payment from '@/models/Payment';
import Order from '@/models/Order';

export async function GET(req: NextRequest) {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type');
        const value = searchParams.get('value');
        const compare = searchParams.get('compare');

        let startDate: Date;
        let endDate: Date;
        let compareStartDate: Date | null = null;
        let compareEndDate: Date | null = null;

        // Ajustar fechas a la zona horaria de Bolivia (UTC-4)
        if (type === 'day' && value) {
            const [year, month, day] = value.split('-').map(Number);
            startDate = new Date(Date.UTC(year, month - 1, day, 4, 0, 0, 0));
            endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000 - 1);
        } else if (type === 'month' && value) {
            const [year, month] = value.split('-').map(Number);
            startDate = new Date(Date.UTC(year, month - 1, 1, 4, 0, 0, 0));
            endDate = new Date(Date.UTC(year, month, 1, 3, 59, 59, 999));

            if (compare === 'previous_month') {
                compareStartDate = new Date(Date.UTC(year, month - 2, 1, 4, 0, 0, 0));
                compareEndDate = new Date(Date.UTC(year, month - 1, 1, 3, 59, 59, 999));
            }
        } else if (type === 'year' && value) {
            const year = parseInt(value);
            startDate = new Date(Date.UTC(year, 0, 1, 4, 0, 0, 0));
            endDate = new Date(Date.UTC(year + 1, 0, 1, 3, 59, 59, 999));

            if (compare === 'previous_year') {
                compareStartDate = new Date(Date.UTC(year - 1, 0, 1, 4, 0, 0, 0));
                compareEndDate = new Date(Date.UTC(year, 0, 1, 3, 59, 59, 999));
            }
        } else {
            const boliviaDateStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/La_Paz' });
            const [year, month, day] = boliviaDateStr.split('-').map(Number);
            startDate = new Date(Date.UTC(year, month - 1, day, 4, 0, 0, 0));
            endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000 - 1);
        }

        // Pagos completados en el período
        const payments = await Payment.find({
            status: 'completed',
            timestamp: { $gte: startDate, $lte: endDate }
        }).lean();

        // Pagos del período comparativo
        let comparePayments: Array<{ amount: number; timestamp: Date }> = [];
        if (compareStartDate && compareEndDate) {
            comparePayments = await Payment.find({
                status: 'completed',
                timestamp: { $gte: compareStartDate, $lte: compareEndDate }
            }).lean();
        }

        // Órdenes pagadas en el período (para conteo de mesas y total de órdenes)
        const orders = await Order.find({
            status: 'paid',
            updatedAt: { $gte: startDate, $lte: endDate }
        }).lean();

        // Buscar las órdenes específicas de los pagos completados para categorizarlas consistentemente
        const paymentOrderIds = payments.map(p => p.order_id);
        const ordersForPayments = await Order.find({ _id: { $in: paymentOrderIds } }).lean();
        const orderMap = new Map(ordersForPayments.map(o => [o._id.toString(), o]));

        const cashTotal = payments.filter(p => p.method === 'cash').reduce((s, p) => s + p.amount, 0);
        const qrTotal = payments.filter(p => p.method === 'qr').reduce((s, p) => s + p.amount, 0);
        const totalSales = cashTotal + qrTotal;

        // Desglose de ingresos por canal de venta
        let dineInSales = 0;
        let deliverySales = 0;
        let pickUpSales = 0;
        let deliveryFeesTotal = 0;

        payments.forEach(p => {
            const order = orderMap.get(p.order_id);
            if (order) {
                if (order.service_type === 'delivery') {
                    deliverySales += p.amount;
                    deliveryFeesTotal += (order.delivery_fee || 0);
                } else if (order.service_type === 'dine_in') {
                    dineInSales += p.amount;
                } else if (order.service_type === 'pick_up') {
                    pickUpSales += p.amount;
                }
            }
        });

        let compareTotal = 0;
        if (comparePayments.length) {
            compareTotal = comparePayments.reduce((s, p) => s + p.amount, 0);
        }

        const tablesServed = new Set(orders.filter(o => o.table_id).map(o => o.table_id.toString())).size;

        const getBoliviaDateKey = (date: Date) => {
            return new Date(date.getTime() - 4 * 60 * 60 * 1000).toISOString().slice(0, 10);
        };

        // Ingresos agrupados por día (Bolivia UTC-4)
        const dailyIncome: Record<string, number> = {};
        payments.forEach(p => {
            const dateKey = getBoliviaDateKey(p.timestamp);
            dailyIncome[dateKey] = (dailyIncome[dateKey] || 0) + p.amount;
        });

        // Ingresos comparativos por día
        const compareDailyIncome: Record<string, number> = {};
        comparePayments.forEach(p => {
            const dateKey = getBoliviaDateKey(p.timestamp);
            compareDailyIncome[dateKey] = (compareDailyIncome[dateKey] || 0) + p.amount;
        });

        // Ingresos por mes (para vista anual)
        const monthlyIncome: Record<string, number> = {};
        payments.forEach(p => {
            const dateKey = getBoliviaDateKey(p.timestamp);
            const monthKey = dateKey.slice(0, 7);
            monthlyIncome[monthKey] = (monthlyIncome[monthKey] || 0) + p.amount;
        });

        return NextResponse.json({
            totalSales,
            cashTotal,
            qrTotal,
            dineInSales,
            deliverySales,
            pickUpSales,
            deliveryFeesTotal,
            ordersCount: orders.length,
            tablesServed,
            dailyIncome,
            compareTotal,
            compareDailyIncome,
            monthlyIncome,
            period: {
                startDate: type === 'day' ? value : startDate.toISOString().split('T')[0],
                endDate: type === 'day' ? value : endDate.toISOString().split('T')[0],
                compareStartDate: compareStartDate ? (type === 'day' ? value : compareStartDate.toISOString().split('T')[0]) : null,
                compareEndDate: compareEndDate ? (type === 'day' ? value : compareEndDate.toISOString().split('T')[0]) : null
            }
        });
    } catch (error) {
        console.error('Error en reporte de ingresos:', error);
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}