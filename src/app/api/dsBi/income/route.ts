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

        // Misma lógica que metrics (UTC puro)
        if (type === 'day' && value) {
            const [year, month, day] = value.split('-');
            startDate = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day), 0, 0, 0));
            endDate = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day), 23, 59, 59, 999));
        } else if (type === 'month' && value) {
            const [year, month] = value.split('-');
            startDate = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, 1, 0, 0, 0));
            endDate = new Date(Date.UTC(parseInt(year), parseInt(month), 0, 23, 59, 59, 999));

            if (compare === 'previous_month') {
                compareStartDate = new Date(Date.UTC(parseInt(year), parseInt(month) - 2, 1, 0, 0, 0));
                compareEndDate = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, 0, 23, 59, 59, 999));
            }
        } else if (type === 'year' && value) {
            const year = parseInt(value);
            startDate = new Date(Date.UTC(year, 0, 1, 0, 0, 0));
            endDate = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

            if (compare === 'previous_year') {
                compareStartDate = new Date(Date.UTC(year - 1, 0, 1, 0, 0, 0));
                compareEndDate = new Date(Date.UTC(year - 1, 11, 31, 23, 59, 59, 999));
            }
        } else {
            const today = new Date();
            startDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0));
            endDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999));
        }

        // 🔥 MODIFICADO: Incluir órdenes 'paid' y 'delivered'
        const orders = await Order.find({
            status: { $in: ['paid', 'delivered'] },
            createdAt: { $gte: startDate, $lte: endDate }
        }).lean();

        // 🔥 NUEVO: Obtener pagos solo para desglose de métodos de pago
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

        // 🔥 NUEVO: Cálculo de ingresos desde orders (no desde payments)
        let totalSales = 0;
        orders.forEach(o => {
            totalSales += o.total_amount || 0;
        });

        // Desglose por método de pago (desde payments)
        const cashTotal = payments.filter(p => p.method === 'cash').reduce((s, p) => s + p.amount, 0);
        const qrTotal = payments.filter(p => p.method === 'qr').reduce((s, p) => s + p.amount, 0);

        // Comparación (usando payments)
        let compareTotal = 0;
        if (comparePayments.length) {
            compareTotal = comparePayments.reduce((s, p) => s + p.amount, 0);
        }

        const tablesServed = new Set(orders.filter(o => o.table_id).map(o => o.table_id.toString())).size;

        // 🔥 NUEVO: Ingresos agrupados por día (desde orders)
        const dailyIncome: Record<string, number> = {};
        orders.forEach(o => {
            const date = o.createdAt;
            const dateKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
            dailyIncome[dateKey] = (dailyIncome[dateKey] || 0) + (o.total_amount || 0);
        });

        // Ingresos comparativos por día (desde payments, para comparación)
        const compareDailyIncome: Record<string, number> = {};
        comparePayments.forEach(p => {
            const date = p.timestamp;
            const dateKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
            compareDailyIncome[dateKey] = (compareDailyIncome[dateKey] || 0) + p.amount;
        });

        // Ingresos por mes (desde orders)
        const monthlyIncome: Record<string, number> = {};
        orders.forEach(o => {
            const date = o.createdAt;
            const monthKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
            monthlyIncome[monthKey] = (monthlyIncome[monthKey] || 0) + (o.total_amount || 0);
        });

        return NextResponse.json({
            // 🔥 totalSales ahora viene de orders
            totalSales,
            cashTotal,
            qrTotal,
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