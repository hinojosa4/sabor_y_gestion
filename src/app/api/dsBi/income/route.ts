// src/app/api/dsBi/income/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Payment from '@/models/Payment';
import Order from '@/models/Order';

export async function GET(req: NextRequest) {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type'); // 'day', 'month', 'year'
        const value = searchParams.get('value');
        const compare = searchParams.get('compare'); // 'month' o 'year' para comparar

        let startDate: Date;
        let endDate: Date;
        let compareStartDate: Date | null = null;
        let compareEndDate: Date | null = null;

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

            // Comparación con año anterior
            if (compare === 'previous_year') {
                compareStartDate = new Date(Date.UTC(year - 1, 0, 1, 0, 0, 0));
                compareEndDate = new Date(Date.UTC(year - 1, 11, 31, 23, 59, 59, 999));
            }
        } else {
            // Por defecto: hoy (usando fecha local)
            const today = new Date();
            startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            endDate.setHours(23, 59, 59, 999);
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

        // Órdenes pagadas en el período
        const orders = await Order.find({
            status: 'paid',
            updatedAt: { $gte: startDate, $lte: endDate }
        }).lean();

        const cashTotal = payments.filter(p => p.method === 'cash').reduce((s, p) => s + p.amount, 0);
        const qrTotal = payments.filter(p => p.method === 'qr').reduce((s, p) => s + p.amount, 0);
        const totalSales = cashTotal + qrTotal;

        let compareTotal = 0;
        if (comparePayments.length) {
            compareTotal = comparePayments.reduce((s, p) => s + p.amount, 0);
        }

        const tablesServed = new Set(orders.filter(o => o.table_id).map(o => o.table_id.toString())).size;

        // Ingresos agrupados por día
        const dailyIncome: Record<string, number> = {};
        payments.forEach(p => {
            const date = p.timestamp;
            const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            dailyIncome[dateKey] = (dailyIncome[dateKey] || 0) + p.amount;
        });

        // Ingresos comparativos por día
        const compareDailyIncome: Record<string, number> = {};
        comparePayments.forEach(p => {
            const date = p.timestamp;
            const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            compareDailyIncome[dateKey] = (compareDailyIncome[dateKey] || 0) + p.amount;
        });

        // Ingresos por mes (para vista anual)
        const monthlyIncome: Record<string, number> = {};
        payments.forEach(p => {
            const date = p.timestamp;
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthlyIncome[monthKey] = (monthlyIncome[monthKey] || 0) + p.amount;
        });

        return NextResponse.json({
            totalSales,
            cashTotal,
            qrTotal,
            ordersCount: orders.length,
            tablesServed,
            dailyIncome,
            compareTotal,
            compareDailyIncome,
            monthlyIncome,
            period: { startDate, endDate, compareStartDate, compareEndDate }
        });
    } catch (error) {
        console.error('Error en reporte de ingresos:', error);
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}