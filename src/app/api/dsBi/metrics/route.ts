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

        // Ajustar fechas a la zona horaria de Bolivia (UTC-4)
        if (type === 'day' && value) {
            const [year, month, day] = value.split('-').map(Number);
            startDate = new Date(Date.UTC(year, month - 1, day, 4, 0, 0, 0));
            endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000 - 1);
        } else if (type === 'month' && value) {
            const [year, month] = value.split('-').map(Number);
            startDate = new Date(Date.UTC(year, month - 1, 1, 4, 0, 0, 0));
            endDate = new Date(Date.UTC(year, month, 1, 3, 59, 59, 999));
        } else if (type === 'year' && value) {
            const year = parseInt(value);
            startDate = new Date(Date.UTC(year, 0, 1, 4, 0, 0, 0));
            endDate = new Date(Date.UTC(year + 1, 0, 1, 3, 59, 59, 999));
        } else {
            const boliviaDateStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/La_Paz' });
            const [year, month, day] = boliviaDateStr.split('-').map(Number);
            startDate = new Date(Date.UTC(year, month - 1, day, 4, 0, 0, 0));
            endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000 - 1);
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
            { $match: { status: 'paid', updatedAt: { $gte: startDate, $lte: endDate }, mesero_id: { $exists: true, $nin: [null, "unknown", "self"] } } },
            {
                $lookup: {
                    from: 'payments',
                    let: { orderIdStr: { $toString: '$_id' } },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$order_id', '$$orderIdStr'] },
                                        { $eq: ['$status', 'completed'] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'payment'
                }
            },
            { $unwind: '$payment' },
            { $group: { _id: '$mesero_id', total: { $sum: '$payment.amount' }, count: { $sum: 1 } } },
            {
                $addFields: {
                    waiterObjectId: {
                        $cond: {
                            if: { $regexMatch: { input: "$_id", regex: "^[0-9a-fA-F]{24}$" } },
                            then: { $toObjectId: "$_id" },
                            else: null
                        }
                    }
                }
            },
            { $lookup: { from: 'users', localField: 'waiterObjectId', foreignField: '_id', as: 'waiter' } },
            { $unwind: { path: '$waiter', preserveNullAndEmptyArrays: true } },
            { $project: { name: '$waiter.name', total: 1, count: 1 } },
            { $sort: { total: -1 } },
            { $limit: 10 }
        ]);

        const topWaiters = topWaitersAgg.map(w => ({ id: w._id, name: w.name || 'Desconocido', total: w.total, count: w.count || 0 }));

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

        const getBoliviaDateKey = (date: Date) => {
            return new Date(date.getTime() - 4 * 60 * 60 * 1000).toISOString().slice(0, 10);
        };

        const getBoliviaHourKey = (date: Date) => {
            const hourBolivia = new Date(date.getTime() - 4 * 60 * 60 * 1000).getUTCHours();
            return `${hourBolivia}:00`;
        };

        // 3. Día con más ventas y hora pico (desde payments en hora de Bolivia)
        const daySales: Record<string, number> = {};
        const hourSales: Record<string, number> = {};

        payments.forEach(p => {
            const dayKey = getBoliviaDateKey(p.timestamp);
            const hourKey = getBoliviaHourKey(p.timestamp);
            daySales[dayKey] = (daySales[dayKey] || 0) + p.amount;
            hourSales[hourKey] = (hourSales[hourKey] || 0) + p.amount;
        });

        const bestDay = Object.entries(daySales).sort((a, b) => b[1] - a[1])[0];
        const peakHour = Object.entries(hourSales).sort((a, b) => b[1] - a[1])[0];

        // Generar flujo de ingresos por hora del día (24 horas en hora de Bolivia)
        const hourlyData = Array.from({ length: 24 }, (_, i) => {
            const hourKey = `${i}:00`;
            return {
                hour: `${String(i).padStart(2, '0')}:00`,
                amount: hourSales[hourKey] || 0
            };
        });

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
            hourlyData,
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