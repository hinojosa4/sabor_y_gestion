import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Payment from '@/models/Payment';
import Order from '@/models/Order';
import OrderItem from '@/models/OrderItem';
import User from '@/models/User';
import Table from '@/models/Table';
import mongoose from 'mongoose';

interface OrderItemType {
    _id: string;
    dish_id: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    status: string;
    notes?: string;
}

interface DishType {
    _id: string;
    name: string;
    price: number;
}

interface OrderSummary {
    orderId: string;
    total: number;
    status: string;
    service_type: string;
}

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

        // Incluir órdenes 'paid' y 'delivered'
        const orders = await Order.find({
            status: { $in: ['paid', 'delivered'] },
            createdAt: { $gte: startDate, $lte: endDate }
        }).lean();

        // Mapa de pagos por order_id
        const paymentMap = new Map();
        payments.forEach(p => {
            paymentMap.set(p.order_id.toString(), p.amount);
        });

        // Clasificar órdenes
        const dineInOrdersList = orders.filter(o => o.service_type === 'dine_in' || o.service_type === 'dinein');
        const deliveryOrdersList = orders.filter(o => o.service_type === 'delivery');

        // Calcular ingresos por tipo
        let dineInRevenue = 0;
        let deliveryRevenue = 0;

        orders.forEach(o => {
            const amount = o.total_amount || 0;
            if (o.service_type === 'dine_in' || o.service_type === 'dinein') {
                dineInRevenue += amount;
            } else if (o.service_type === 'delivery') {
                deliveryRevenue += amount;
            }
        });

        // ========== 1. Top Meseros ==========
        const topWaitersAgg = await Order.aggregate([
            {
                $match: {
                    status: { $in: ['paid', 'delivered'] },
                    updatedAt: { $gte: startDate, $lte: endDate },
                    mesero_id: { $exists: true, $nin: [null, "unknown", "self"] }
                }
            },
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

        // ========== 2. Top Platos ==========
        if (!mongoose.connection.db) {
            console.error('❌ Conexión a base de datos no disponible');
            return NextResponse.json({ error: 'Error de conexión a la base de datos' }, { status: 500 });
        }
        const dishesCollection = mongoose.connection.db.collection('dishes');

        const topDishesAgg = await OrderItem.aggregate([
            { $lookup: { from: 'orders', localField: 'order_id', foreignField: '_id', as: 'order' } },
            { $unwind: '$order' },
            { $match: { 'order.status': { $in: ['paid', 'delivered'] }, 'order.createdAt': { $gte: startDate, $lte: endDate } } },
            { $group: { _id: '$dish_id', quantity: { $sum: '$quantity' }, total: { $sum: '$subtotal' } } },
            { $sort: { quantity: -1 } },
            { $limit: 5 }
        ]);

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

        // ========== 3. Día con más ventas y hora pico ==========
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

        // ========== 4. Top Mesas ==========
        const tables = await Table.find({}).lean();
        const tableNumberMap = new Map(tables.map(t => [t._id.toString(), t.number]));

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
            .map(([id, total]) => ({ id, number: tableNumberMap.get(id) || 0, total }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);

        // ========== 5. Eficiencia operativa ==========
        const completedPayments = payments.length;
        const cancelledOrders = await Order.countDocuments({
            status: 'cancelled',
            createdAt: { $gte: startDate, $lte: endDate }
        });
        const totalOrders = await Order.countDocuments({
            createdAt: { $gte: startDate, $lte: endDate }
        });
        const cancellationRate = totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0;

        // ========== 6. Clientes destacados ==========
        const customerSalesMap: Record<string, { name: string; email: string; total: number }> = {};
        for (const payment of payments) {
            if (payment.customer_email) {
                const emailLower = payment.customer_email.toLowerCase();
                if (!customerSalesMap[emailLower]) {
                    customerSalesMap[emailLower] = {
                        name: payment.customer_email.split('@')[0],
                        email: payment.customer_email,
                        total: 0
                    };
                }
                customerSalesMap[emailLower].total += payment.amount;
            }
        }

        // Obtener nombres reales de la BD para los clientes
        const customerEmails = Object.keys(customerSalesMap);
        const dbUsers = await User.find({ email: { $in: customerEmails } }, { name: 1, email: 1 }).lean();
        const userMap = new Map(dbUsers.map(u => [u.email.toLowerCase(), u.name]));

        const topCustomers = Object.entries(customerSalesMap)
            .map(([email, data]) => ({
                email: data.email,
                name: userMap.get(email) || data.name,
                total: data.total
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);

        // ========== 7. Puntos de lealtad usados ==========
        const users = await User.find({ loyaltyPoints: { $gt: 0 } }).lean();
        const loyaltyPointsUsed = users.reduce((sum, u) => sum + (u.loyaltyPoints || 0), 0);

        // ========== 8. DATOS PARA EFICIENCIA OPERATIVA ==========
        const dineInCompleted = dineInOrdersList.filter(o => o.status === 'paid' || o.status === 'delivered').length;
        const deliveryCompleted = deliveryOrdersList.filter(o => o.status === 'paid' || o.status === 'delivered').length;
        const dineInCancelled = dineInOrdersList.filter(o => o.status === 'cancelled').length;
        const deliveryCancelled = deliveryOrdersList.filter(o => o.status === 'cancelled').length;
        const dineInInProgress = dineInOrdersList.filter(o => !['paid', 'delivered', 'cancelled'].includes(o.status)).length;
        const deliveryInProgress = deliveryOrdersList.filter(o => !['paid', 'delivered', 'cancelled'].includes(o.status)).length;

        const inProgressOrders = await Order.countDocuments({
            status: { $in: ['pending', 'in_kitchen', 'ready', 'in_transit'] },
            createdAt: { $gte: startDate, $lte: endDate }
        });

        const completedOrders = orders.filter(o => o.status === 'paid' || o.status === 'delivered');
        let avgCompletionTime = 0;
        if (completedOrders.length > 0) {
            let totalTime = 0;
            let count = 0;
            for (const order of completedOrders) {
                const payment = payments.find(p => p.order_id.toString() === order._id.toString());
                if (payment) {
                    const created = new Date(order.createdAt);
                    const paid = new Date(payment.timestamp);
                    const diffMinutes = (paid.getTime() - created.getTime()) / (1000 * 60);
                    totalTime += diffMinutes;
                    count++;
                }
            }
            avgCompletionTime = count > 0 ? totalTime / count : 0;
        }

        const topWaiterByOrders = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate, $lte: endDate },
                    mesero_id: { $exists: true, $nin: [null, "unknown", "self"] }
                }
            },
            { $group: { _id: '$mesero_id', count: { $sum: 1 }, total: { $sum: '$total_amount' } } },
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
            { $project: { name: '$waiter.name', count: 1, total: 1 } },
            { $sort: { count: -1 } },
            { $limit: 1 }
        ]);

        const topWaiter = topWaiterByOrders.length > 0 ? topWaiterByOrders[0] : null;
        const tablesServedToday = new Set(orders.filter(o => o.table_id).map(o => o.table_id.toString())).size;

        // ========== 9. DATOS PARA CLIENTES ==========
        // Total de clientes únicos (con pagos en el período)
        const uniqueCustomers = new Set();
        payments.forEach(p => {
            if (p.customer_email) {
                uniqueCustomers.add(p.customer_email);
            }
        });

        // Clientes recurrentes y nuevas visitas
        const customerOrders: Record<string, number> = {};
        const customerLastVisit: Record<string, Date> = {};
        const customerTotalSpent: Record<string, number> = {};

        orders.forEach(o => {
            const payment = payments.find(p => p.order_id.toString() === o._id.toString());
            if (payment && payment.customer_email) {
                const email = payment.customer_email;
                customerOrders[email] = (customerOrders[email] || 0) + 1;
                customerTotalSpent[email] = (customerTotalSpent[email] || 0) + payment.amount;
                if (!customerLastVisit[email] || new Date(o.createdAt) > new Date(customerLastVisit[email])) {
                    customerLastVisit[email] = new Date(o.createdAt);
                }
            }
        });

        // Clientes recurrentes (>1 pedido)
        const recurringCustomers = Object.keys(customerOrders).filter(email => customerOrders[email] > 1);

        // Nuevos clientes (solo 1 pedido en el período)
        const newCustomers = Object.keys(customerOrders).filter(email => customerOrders[email] === 1);

        // Clientes con mayor ticket promedio
        const customerAvgSpent = Object.keys(customerTotalSpent).map(email => ({
            email,
            avg: customerTotalSpent[email] / customerOrders[email],
            total: customerTotalSpent[email],
            orders: customerOrders[email]
        })).sort((a, b) => b.avg - a.avg).slice(0, 5);

        // Cliente más fiel (más pedidos)
        const mostLoyalRaw = Object.entries(customerOrders)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 1)[0] || null;

        let mostLoyal = null;
        if (mostLoyalRaw) {
            const email = mostLoyalRaw[0];
            const count = mostLoyalRaw[1];
            const emailLower = email.toLowerCase();
            mostLoyal = {
                email,
                name: userMap.get(emailLower) || email.split('@')[0],
                count,
                total: customerTotalSpent[email] || 0
            };
        }

        // Puntos de lealtad por cliente (desde users)
        const customerLoyalty = await User.find({
            email: { $in: Object.keys(customerOrders) }
        }, { email: 1, loyaltyPoints: 1 }).lean();

        const loyaltyMap = new Map();
        customerLoyalty.forEach(u => {
            loyaltyMap.set(u.email, u.loyaltyPoints || 0);
        });

        const getLoyaltyTier = (points: number) => {
            if (points >= 200) return { name: 'VIP', color: '#8e44ad' };
            if (points >= 100) return { name: 'Oro', color: '#f59e0b' };
            if (points >= 50) return { name: 'Plata', color: '#94a3b8' };
            return { name: 'Base', color: '#64748b' };
        };

        const loyaltyData = Object.keys(customerOrders).map(email => ({
            email,
            points: loyaltyMap.get(email) || 0,
            tier: getLoyaltyTier(loyaltyMap.get(email) || 0),
            orders: customerOrders[email],
            total: customerTotalSpent[email] || 0
        }));

        // ========== FIN DATOS PARA CLIENTES ==========

        // ========== 10. DATOS PARA MESAS CON DETALLE ==========
        // Agrupar órdenes por mesa
        const ordersByTable: Record<string, {
            number: number;
            location: string;
            orders: Array<{
                orderId: string;
                createdAt: Date;
                total: number;
                status: string;
                items: Array<{
                    name: string;
                    quantity: number;
                    price: number;
                    subtotal: number;
                }>;
            }>;
        }> = {};

        // Obtener todas las órdenes con items
        const ordersWithItems = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate, $lte: endDate },
                    table_id: { $exists: true, $ne: null }
                }
            },
            {
                $lookup: {
                    from: 'order_item',
                    localField: '_id',
                    foreignField: 'order_id',
                    as: 'items'
                }
            },
            {
                $lookup: {
                    from: 'dishes',
                    localField: 'items.dish_id',
                    foreignField: '_id',
                    as: 'dishDetails'
                }
            }
        ]);

        // Obtener información de las mesas
        const tablesInfo = await Table.find({}).lean();
        const tableInfoMap = new Map(tablesInfo.map(t => [t._id.toString(), { number: t.number, location: t.location }]));

        // Procesar órdenes por mesa
        for (const order of ordersWithItems) {
            if (!order.table_id) continue;
            const tableId = order.table_id.toString();
            const tableInfo = tableInfoMap.get(tableId) || { number: 0, location: 'Desconocida' };

            if (!ordersByTable[tableId]) {
                ordersByTable[tableId] = {
                    number: tableInfo.number,
                    location: tableInfo.location,
                    orders: []
                };
            }

            // Obtener el pago para saber el total
            const payment = payments.find(p => p.order_id.toString() === order._id.toString());
            const total = payment ? payment.amount : order.total_amount || 0;

            // Procesar items
            const items = (order.items || []).map((item: OrderItemType) => {
                const dish = (order.dishDetails || []).find((d: DishType) => d._id.toString() === item.dish_id.toString());
                return {
                    name: dish?.name || 'Desconocido',
                    quantity: item.quantity || 0,
                    price: item.unit_price || 0,
                    subtotal: item.subtotal || 0
                };
            });

            ordersByTable[tableId].orders.push({
                orderId: order._id.toString(),
                createdAt: order.createdAt,
                total: total,
                status: order.status,
                items: items
            });
        }

        // Calcular estadísticas por mesa
        const mesaStats = Object.entries(ordersByTable).map(([tableId, data]) => {
            const totalPedidos = data.orders.length;
            const totalIngresos = data.orders.reduce((sum, o) => sum + o.total, 0);
            const promedio = totalPedidos > 0 ? totalIngresos / totalPedidos : 0;

            return {
                tableId,
                number: data.number,
                location: data.location,
                totalPedidos,
                totalIngresos,
                promedio,
                pedidos: data.orders.map(o => ({
                    orderId: o.orderId,
                    fecha: o.createdAt.toISOString(),
                    total: o.total,
                    status: o.status,
                    items: o.items
                }))
            };
        });

        // Ordenar por ingresos (top primero)
        const mesaDetalle = mesaStats.sort((a, b) => b.totalIngresos - a.totalIngresos);

        // ========== 11. DATOS PARA HORARIOS ==========
        // Top 3 horas pico (con detalle de pedidos y montos)
        const hourDetails: Record<string, { count: number; total: number; orders: OrderSummary[] }> = {};

        orders.forEach(o => {
            const hour = new Date(o.createdAt).getHours();
            const hourKey = `${hour}:00`;
            const payment = payments.find(p => p.order_id.toString() === o._id.toString());
            const amount = payment ? payment.amount : o.total_amount || 0;

            if (!hourDetails[hourKey]) {
                hourDetails[hourKey] = { count: 0, total: 0, orders: [] };
            }
            hourDetails[hourKey].count += 1;
            hourDetails[hourKey].total += amount;
            hourDetails[hourKey].orders.push({
                orderId: o._id,
                total: amount,
                status: o.status,
                service_type: o.service_type
            });
        });

        const topHours = Object.entries(hourDetails)
            .map(([hour, data]) => ({
                hour,
                count: data.count,
                total: data.total,
                orders: data.orders
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 3);

        // Días con más cancelaciones (consultar documentos cancelados)
        const cancelledOrdersDocs = await Order.find({
            status: 'cancelled',
            createdAt: { $gte: startDate, $lte: endDate }
        }).lean();

        const cancellationDays: Record<string, number> = {};
        cancelledOrdersDocs.forEach(o => {
            const date = new Date(o.createdAt);
            const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            cancellationDays[dateKey] = (cancellationDays[dateKey] || 0) + 1;
        });

        const topCancellationDays = Object.entries(cancellationDays)
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 3);

        // Comparativa delivery vs restaurante por horario
        const serviceByHour: Record<string, { dine_in: number; delivery: number; total: number }> = {};

        orders.forEach(o => {
            const hour = new Date(o.createdAt).getHours();
            const hourKey = `${hour}:00`;

            if (!serviceByHour[hourKey]) {
                serviceByHour[hourKey] = { dine_in: 0, delivery: 0, total: 0 };
            }
            serviceByHour[hourKey].total += 1;
            if (o.service_type === 'dine_in' || o.service_type === 'dinein') {
                serviceByHour[hourKey].dine_in += 1;
            } else if (o.service_type === 'delivery') {
                serviceByHour[hourKey].delivery += 1;
            }
        });

        // Obtener los horarios con más actividad (top 5 para gráfico)
        const serviceByHourArray = Object.entries(serviceByHour)
            .map(([hour, data]) => ({
                hour,
                dine_in: data.dine_in,
                delivery: data.delivery,
                total: data.total
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);

        return NextResponse.json({
            // Métricas existentes
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
            loyaltyPointsUsed,
            dineInRevenue,
            deliveryRevenue,
            dineInOrders: dineInOrdersList.length,
            deliveryOrders: deliveryOrdersList.length,
            avgDineIn: dineInOrdersList.length > 0 ? dineInRevenue / dineInOrdersList.length : 0,
            avgDelivery: deliveryOrdersList.length > 0 ? deliveryRevenue / deliveryOrdersList.length : 0,

            // Datos para Eficiencia Operativa
            dineInCompleted,
            deliveryCompleted,
            dineInCancelled,
            deliveryCancelled,
            dineInInProgress,
            deliveryInProgress,
            inProgressOrders,
            avgCompletionTime,
            topWaiter,
            tablesServedToday,
            dineInOrdersCount: dineInOrdersList.length,
            deliveryOrdersCount: deliveryOrdersList.length,

            // ========== DATOS PARA CLIENTES ==========
            totalCustomers: uniqueCustomers.size,
            newCustomers: newCustomers.length,
            recurringCustomers: recurringCustomers.length,
            customerAvgSpent,
            mostLoyal,
            loyaltyData,
            customerLastVisit: Object.fromEntries(
                Object.entries(customerLastVisit).map(([email, date]) => [email, date.toISOString().split('T')[0]])
            ),
            customerOrders,
            customerTotalSpent,
            mesaDetalle,
            topHours,
            topCancellationDays,
            serviceByHourArray,
        });
    } catch (error) {
        console.error('Error en métricas BI:', error);
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}