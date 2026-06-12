import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Payment from '@/models/Payment';
import Order from '@/models/Order';
import OrderItem from '@/models/OrderItem';
import User from '@/models/User';
import Table from '@/models/Table';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type'); // 'day', 'month', 'year'
        const value = searchParams.get('value');

        let startDate: Date;
        let endDate: Date;

        // Fechas en UTC (misma lógica que income)
        if (type === 'day' && value) {
            const [year, month, day] = value.split('-');
            startDate = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day), 0, 0, 0));
            endDate = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day), 23, 59, 59, 999));
        } else if (type === 'month' && value) {
            const [year, month] = value.split('-');
            startDate = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, 1, 0, 0, 0));
            endDate = new Date(Date.UTC(parseInt(year), parseInt(month), 0, 23, 59, 59, 999));
        } else if (type === 'year' && value) {
            const year = parseInt(value);
            startDate = new Date(Date.UTC(year, 0, 1, 0, 0, 0));
            endDate = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
        } else {
            const today = new Date();
            startDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0));
            endDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999));
        }

        // Obtener pagos del período (una sola consulta)
        const payments = await Payment.find({
            status: 'completed',
            timestamp: { $gte: startDate, $lte: endDate }
        }).lean();

        // Obtener órdenes pagadas del período (una sola consulta)
        const orders = await Order.find({
            status: 'paid',
            updatedAt: { $gte: startDate, $lte: endDate }
        }).lean();

        // 1. Top Meseros (usando agregación)
        const topWaitersAgg = await Order.aggregate([
            { $match: { status: 'paid', updatedAt: { $gte: startDate, $lte: endDate }, waiter_id: { $exists: true, $ne: null } } },
            { $lookup: { from: 'payments', localField: '_id', foreignField: 'order_id', as: 'payment' } },
            { $unwind: '$payment' },
            { $match: { 'payment.status': 'completed' } },
            { $group: { _id: '$waiter_id', total: { $sum: '$payment.amount' } } },
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'waiter' } },
            { $unwind: { path: '$waiter', preserveNullAndEmptyArrays: true } },
            { $project: { name: '$waiter.name', total: 1 } },
            { $sort: { total: -1 } },
            { $limit: 5 }
        ]);

        const topWaiters = topWaitersAgg.map(w => ({ id: w._id, name: w.name || 'Desconocido', total: w.total }));

        // 2. Top Platos (usando agregación con colección dishes)
        if (!mongoose.connection.db) {
            console.error('❌ Conexión a base de datos no disponible');
            return NextResponse.json({ error: 'Error de conexión a la base de datos' }, { status: 500 });
        }
        const dishesCollection = mongoose.connection.db.collection('dishes');

        const topDishesAgg = await OrderItem.aggregate([
            { $lookup: { from: 'orders', localField: 'order_id', foreignField: '_id', as: 'order' } },
            { $unwind: '$order' },
            { $match: { 'order.status': 'paid', 'order.updatedAt': { $gte: startDate, $lte: endDate } } },
            { $group: { _id: '$dish_id', quantity: { $sum: '$quantity' }, total: { $sum: '$subtotal' } } },
            { $sort: { quantity: -1 } },
            { $limit: 5 }
        ]);

        // Obtener nombres de los platos (una sola consulta)
        const dishIds = topDishesAgg.map(d => d._id);
        const dishes = await dishesCollection.find({ _id: { $in: dishIds } }).toArray();
        const dishMap = new Map(dishes.map(d => [d._id.toString(), d.name]));

        const topDishes = topDishesAgg.map(d => ({
            id: d._id,
            name: dishMap.get(d._id.toString()) || 'Desconocido',
            quantity: d.quantity,
            total: d.total
        }));

        // 3. Día con más ventas y hora pico (desde payments)
        const daySales: Record<string, number> = {};
        const hourSales: Record<string, number> = {};

        payments.forEach(p => {
            const date = p.timestamp;
            const dayKey = `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}-${date.getUTCDate()}`;
            const hourKey = `${date.getUTCHours()}:00`;
            daySales[dayKey] = (daySales[dayKey] || 0) + p.amount;
            hourSales[hourKey] = (hourSales[hourKey] || 0) + p.amount;
        });

        const bestDay = Object.entries(daySales).sort((a, b) => b[1] - a[1])[0];
        let peakHour = Object.entries(hourSales).sort((a, b) => b[1] - a[1])[0];
        if (peakHour) {
            const hourUTC = parseInt(peakHour[0].split(':')[0]);
            let hourBolivia = hourUTC - 4;
            if (hourBolivia < 0) hourBolivia += 24;
            peakHour = [`${hourBolivia}:00`, peakHour[1]];
        }

        // 4. Top Mesas (usando agregación con tabla tables)
        const tables = await Table.find({}).lean();
        const tableMap = new Map(tables.map(t => [t._id.toString(), t.number]));

        const tableSalesMap: Record<string, number> = {};
        for (const order of orders) {
            if (order.table_id) {
                const payment = payments.find(p => p.order_id.toString() === order._id.toString());
                if (payment) {
                    const tableId = order.table_id.toString();
                    tableSalesMap[tableId] = (tableSalesMap[tableId] || 0) + payment.amount;
                }
            }
        }

        const topTables = Object.entries(tableSalesMap)
            .map(([id, total]) => ({ id, number: tableMap.get(id) || 0, total }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);

        // 5. Eficiencia operativa
        const completedPayments = payments.length;
        const cancelledOrders = await Order.countDocuments({
            status: 'cancelled',
            updatedAt: { $gte: startDate, $lte: endDate }
        });
        const totalOrders = await Order.countDocuments({
            updatedAt: { $gte: startDate, $lte: endDate }
        });
        const cancellationRate = totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0;

        // 6. Clientes destacados
        const customerSalesMap: Record<string, { name: string; email: string; total: number }> = {};
        for (const payment of payments) {
            if (payment.customer_email) {
                if (!customerSalesMap[payment.customer_email]) {
                    customerSalesMap[payment.customer_email] = {
                        name: payment.customer_email.split('@')[0],
                        email: payment.customer_email,
                        total: 0
                    };
                }
                customerSalesMap[payment.customer_email].total += payment.amount;
            }
        }

        const topCustomers = Object.entries(customerSalesMap)
            .map(([email, data]) => ({ email, name: data.name, total: data.total }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);

        // 7. Puntos de lealtad usados
        const users = await User.find({ loyaltyPoints: { $gt: 0 } }).lean();
        const loyaltyPointsUsed = users.reduce((sum, u) => sum + (u.loyaltyPoints || 0), 0);

        return NextResponse.json({
            topWaiters,
            topDishes,
            bestDay: bestDay ? { date: bestDay[0], amount: bestDay[1] } : null,
            peakHour: peakHour ? { hour: peakHour[0], amount: peakHour[1] } : null,
            topTables,
            cancellationRate,
            totalOrders,
            completedPayments,
            topCustomers,
            loyaltyPointsUsed
        });
    } catch (error) {
        console.error('Error en métricas BI:', error);
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}