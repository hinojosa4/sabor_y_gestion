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
        const startDateParam = searchParams.get('startDate');
        const endDateParam = searchParams.get('endDate');

        let startDate: Date;
        let endDate: Date;
        let compareStartDate: Date | null = null;
        let compareEndDate: Date | null = null;

        // Ajustar fechas a la zona horaria de Bolivia (UTC-4)
        if (startDateParam && endDateParam) {
            const [sYear, sMonth, sDay] = startDateParam.split('-').map(Number);
            startDate = new Date(Date.UTC(sYear, sMonth - 1, sDay, 4, 0, 0, 0));

            const [eYear, eMonth, eDay] = endDateParam.split('-').map(Number);
            const endStart = new Date(Date.UTC(eYear, eMonth - 1, eDay, 4, 0, 0, 0));
            endDate = new Date(endStart.getTime() + 24 * 60 * 60 * 1000 - 1);

            if (compare === 'previous_period') {
                const durationMs = endDate.getTime() - startDate.getTime() + 1;
                compareStartDate = new Date(startDate.getTime() - durationMs);
                compareEndDate = new Date(endDate.getTime() - durationMs);
            }
        } else if (type === 'day' && value) {
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

        // Obtener órdenes del período (con status paid y delivered)
        const orders = await Order.find({
            status: { $in: ['paid', 'delivered'] },
            createdAt: { $gte: startDate, $lte: endDate }
        }).lean();

        // Obtener pagos solo para desglose de métodos de pago
        const payments = await Payment.find({
            status: 'completed',
            timestamp: { $gte: startDate, $lte: endDate }
        }).lean();

        // Pagos del período comparativo (para comparación)
        let comparePayments: Array<{ amount: number; timestamp: Date }> = [];
        if (compareStartDate && compareEndDate) {
            comparePayments = await Payment.find({
                status: 'completed',
                timestamp: { $gte: compareStartDate, $lte: compareEndDate }
            }).lean();
        }

        // Buscar las órdenes específicas de los pagos completados para categorizarlas consistentemente (para canal de venta)
        const paymentOrderIds = payments.map(p => p.order_id);
        const ordersForPayments = await Order.find({ _id: { $in: paymentOrderIds } }).lean();
        const orderMap = new Map(ordersForPayments.map(o => [o._id.toString(), o]));

        // Cálculo de ingresos desde orders (no desde payments)
        let totalSales = 0;
        orders.forEach(o => {
            totalSales += o.total_amount || 0;
        });

        // Desglose por método de pago (desde payments)
        const cashTotal = payments.filter(p => p.method === 'cash').reduce((s, p) => s + p.amount, 0);
        const qrTotal = payments.filter(p => p.method === 'qr').reduce((s, p) => s + p.amount, 0);

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
                } else if (order.service_type === 'dine_in' || order.service_type === 'dinein') {
                    dineInSales += p.amount;
                } else if (order.service_type === 'pick_up') {
                    pickUpSales += p.amount;
                }
            }
        });

        // Comparación (usando payments)
        let compareTotal = 0;
        if (comparePayments.length) {
            compareTotal = comparePayments.reduce((s, p) => s + p.amount, 0);
        }

        const tablesServed = new Set(orders.filter(o => o.table_id).map(o => o.table_id.toString())).size;

        const getBoliviaDateKey = (date: Date) => {
            return new Date(date.getTime() - 4 * 60 * 60 * 1000).toISOString().slice(0, 10);
        };

        // Ingresos agrupados por día (desde orders, con corrección de zona horaria)
        const dailyIncome: Record<string, number> = {};
        orders.forEach(o => {
            const dateKey = getBoliviaDateKey(o.createdAt);
            dailyIncome[dateKey] = (dailyIncome[dateKey] || 0) + (o.total_amount || 0);
        });

        // Ingresos comparativos por día (desde payments, para comparación, con corrección de zona horaria)
        const compareDailyIncome: Record<string, number> = {};
        comparePayments.forEach(p => {
            const dateKey = getBoliviaDateKey(p.timestamp);
            compareDailyIncome[dateKey] = (compareDailyIncome[dateKey] || 0) + p.amount;
        });

        // Ingresos por mes (desde orders, con corrección de zona horaria)
        const monthlyIncome: Record<string, number> = {};
        orders.forEach(o => {
            const dateKey = getBoliviaDateKey(o.createdAt);
            const monthKey = dateKey.slice(0, 7);
            monthlyIncome[monthKey] = (monthlyIncome[monthKey] || 0) + (o.total_amount || 0);
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
                startDate: getBoliviaDateKey(startDate),
                endDate: getBoliviaDateKey(endDate),
                compareStartDate: compareStartDate ? getBoliviaDateKey(compareStartDate) : null,
                compareEndDate: compareEndDate ? getBoliviaDateKey(compareEndDate) : null
            }
        });
    } catch (error) {
        console.error('Error en reporte de ingresos:', error);
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}