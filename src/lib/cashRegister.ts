import CashClose from '@/models/CashClose';
import Employee from '@/models/Employee';
import Payment from '@/models/Payment';
import Order from '@/models/Order';

export const RESTAURANT_ID = '69e170e941daf8c2b2f76677';
export const CASH_SHIFT_TIMEZONE = 'America/La_Paz';

export type CashShiftName = 'Turno Mañana' | 'Turno Tarde' | 'Turno Completo';

type ShiftWindow = {
  name: CashShiftName;
  startHour: number;
  endHour: number;
};

const SHIFT_WINDOWS: Record<CashShiftName, ShiftWindow> = {
  'Turno Mañana': { name: 'Turno Mañana', startHour: 8, endHour: 16 },
  'Turno Tarde': { name: 'Turno Tarde', startHour: 16, endHour: 21 },
  'Turno Completo': { name: 'Turno Completo', startHour: 8, endHour: 21 },
};

const SHIFT_ALIASES: Record<string, CashShiftName> = {
  'turno manana': 'Turno Mañana',
  'turno mañana': 'Turno Mañana',
  'turno maã±ana': 'Turno Mañana',
  'turno maa±ana': 'Turno Mañana',
  'turno tarde': 'Turno Tarde',
  'turno completo': 'Turno Completo',
};

function getLaPazDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: CASH_SHIFT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? '0';

  return {
    dateKey: `${value('year')}-${value('month')}-${value('day')}`,
    hour: Number(value('hour')),
    minute: Number(value('minute')),
  };
}

function getShiftBoundary(dateKey: string, hour: number) {
  return new Date(`${dateKey}T${String(hour).padStart(2, '0')}:00:00-04:00`);
}

export function normalizeCashShift(shift?: string | null): CashShiftName | null {
  if (!shift) return null;

  const key = shift
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  return SHIFT_ALIASES[key] ?? null;
}

export function getCurrentOperationalShift(date = new Date()): CashShiftName | null {
  const { hour } = getLaPazDateParts(date);

  if (hour >= 8 && hour < 16) return 'Turno Mañana';
  if (hour >= 16 && hour < 21) return 'Turno Tarde';
  return null;
}

export function getCashShiftContext(shiftName: CashShiftName, date = new Date()) {
  const { dateKey } = getLaPazDateParts(date);
  const window = SHIFT_WINDOWS[shiftName];

  return {
    shiftName,
    shiftDate: dateKey,
    shiftStart: getShiftBoundary(dateKey, window.startHour),
    shiftEnd: getShiftBoundary(dateKey, window.endHour),
  };
}

export async function getCashierShiftByUserId(userId?: string | null): Promise<CashShiftName | null> {
  if (!userId) return null;

  const employee = await Employee.findById(userId)
    .select('employmentDetails.shift rol isActive activo')
    .lean<{
      employmentDetails?: { shift?: string };
      rol?: string;
      isActive?: boolean;
      activo?: boolean;
    } | null>();

  if (!employee || employee.rol !== 'cajero') return null;
  if (employee.isActive === false || employee.activo === false) return null;

  return normalizeCashShift(employee.employmentDetails?.shift);
}

export function isWithinShiftHours(shiftName: CashShiftName, date = new Date()) {
  const { hour, minute } = getLaPazDateParts(date);
  const currentMinutes = hour * 60 + minute;
  const window = SHIFT_WINDOWS[shiftName];

  return currentMinutes >= window.startHour * 60 && currentMinutes < window.endHour * 60;
}

export async function getCashCloseForShift(shiftName: CashShiftName, date = new Date()) {
  const shift = getCashShiftContext(shiftName, date);
  const blockingShiftNames =
    shiftName === 'Turno Completo' ? [shiftName] : [shiftName, 'Turno Completo'];

  return CashClose.findOne({
    restaurantId: RESTAURANT_ID,
    $or: [
      {
        shiftDate: shift.shiftDate,
        shiftName: { $in: blockingShiftNames },
      },
      {
        // Cierres creados antes de guardar shiftName/shiftDate.
        shiftName: { $exists: false },
        closingDate: { $gte: shift.shiftStart, $lt: shift.shiftEnd },
      },
    ],
  }).sort({ closingDate: -1 });
}

export async function getOpenCashShiftForUser(userId?: string | null, date = new Date()) {
  const assignedShift = await getCashierShiftByUserId(userId);

  if (!assignedShift) {
    return { ok: false as const, error: 'No se encontró un turno asignado para este cajero.' };
  }

  if (!isWithinShiftHours(assignedShift, date)) {
    return { ok: false as const, error: `Este cajero no está dentro de su horario de ${assignedShift}.` };
  }

  const cashClose = await getCashCloseForShift(assignedShift, date);
  if (cashClose) {
    return { ok: false as const, error: 'La caja de este turno ya fue cerrada. No se pueden registrar mas pagos.' };
  }

  return { ok: true as const, shift: getCashShiftContext(assignedShift, date) };
}

export async function getOpenOperationalCashShift(date = new Date()) {
  const currentShift = getCurrentOperationalShift(date);

  if (!currentShift) {
    return { ok: false as const, error: 'Fuera del horario de caja. No se pueden registrar pagos.' };
  }

  const cashClose = await getCashCloseForShift(currentShift, date);
  if (cashClose) {
    return { ok: false as const, error: 'La caja de este turno ya fue cerrada. No se pueden registrar mas pagos.' };
  }

  return { ok: true as const, shift: getCashShiftContext(currentShift, date) };
}

export async function getCashRegisterSummaryForShift(shiftName: CashShiftName, date = new Date()) {
  const shift = getCashShiftContext(shiftName, date);

  const payments = await Payment.find({
    timestamp: { $gte: shift.shiftStart, $lt: shift.shiftEnd },
    status: 'completed',
  }).lean();

  const cashTotal = payments
    .filter((payment) => payment.method === 'cash')
    .reduce((sum, payment) => sum + payment.amount, 0);

  const qrTotal = payments
    .filter((payment) => payment.method === 'qr')
    .reduce((sum, payment) => sum + payment.amount, 0);

  const salesTotal = cashTotal + qrTotal;

  const orders = await Order.find({
    status: 'paid',
    updatedAt: { $gte: shift.shiftStart, $lt: shift.shiftEnd },
  }).lean();

  const tablesServed = new Set(
    orders.filter((order) => order.table_id).map((order) => order.table_id?.toString())
  ).size;

  return {
    ...shift,
    openingDate: shift.shiftStart,
    openingBalance: 0,
    salesTotal,
    cashTotal,
    qrTotal,
    tablesServed,
    ordersCount: orders.length,
  };
}
