import CashClose from '@/models/CashClose';
import CashShiftConfig from '@/models/CashShiftConfig';
import Employee from '@/models/Employee';
import Payment from '@/models/Payment';
import Order from '@/models/Order';

export const RESTAURANT_ID = '69e170e941daf8c2b2f76677';
export const CASH_SHIFT_TIMEZONE = 'America/La_Paz';

export type CashShiftName = 'Turno Mañana' | 'Turno Tarde' | 'Turno Completo';

type ShiftWindow = {
  name: CashShiftName;
  start: string;
  end: string;
};

export type CashShiftConfigData = {
  morningStart: string;
  morningEnd: string;
  afternoonStart: string;
  afternoonEnd: string;
};

const DEFAULT_SHIFT_CONFIG: CashShiftConfigData = {
  morningStart: '08:00',
  morningEnd: '16:00',
  afternoonStart: '16:00',
  afternoonEnd: '21:00',
};

const SHIFT_ALIASES: Record<string, CashShiftName> = {
  'turno manana': 'Turno Mañana',
  'turno maã±ana': 'Turno Mañana',
  'turno maÃ±ana': 'Turno Mañana',
  'turno maa±ana': 'Turno Mañana',
  'turno tarde': 'Turno Tarde',
  'turno completo': 'Turno Completo',
};

export function parseTimeToMinutes(value: string) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function formatShiftRange(start: string, end: string) {
  return `${start} - ${end}`;
}

function getShiftBoundary(dateKey: string, time: string) {
  return new Date(`${dateKey}T${time}:00-04:00`);
}

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

export function validateCashShiftConfig(config: CashShiftConfigData) {
  const morningStart = parseTimeToMinutes(config.morningStart);
  const morningEnd = parseTimeToMinutes(config.morningEnd);
  const afternoonStart = parseTimeToMinutes(config.afternoonStart);
  const afternoonEnd = parseTimeToMinutes(config.afternoonEnd);

  if (
    morningStart === null ||
    morningEnd === null ||
    afternoonStart === null ||
    afternoonEnd === null
  ) {
    return { ok: false as const, error: 'Todos los horarios deben tener formato HH:mm.' };
  }

  if (morningStart >= morningEnd) {
    return { ok: false as const, error: 'El turno mañana debe terminar despues de iniciar.' };
  }

  if (afternoonStart >= afternoonEnd) {
    return { ok: false as const, error: 'El turno tarde debe terminar despues de iniciar.' };
  }

  if (morningEnd > afternoonStart) {
    return { ok: false as const, error: 'Los turnos de mañana y tarde no deben superponerse.' };
  }

  return { ok: true as const };
}

export async function getCashShiftConfig(restaurantId = RESTAURANT_ID): Promise<CashShiftConfigData> {
  const config = await CashShiftConfig.findOne({ restaurantId }).lean<CashShiftConfigData | null>();
  if (!config) return DEFAULT_SHIFT_CONFIG;

  return {
    morningStart: config.morningStart ?? DEFAULT_SHIFT_CONFIG.morningStart,
    morningEnd: config.morningEnd ?? DEFAULT_SHIFT_CONFIG.morningEnd,
    afternoonStart: config.afternoonStart ?? DEFAULT_SHIFT_CONFIG.afternoonStart,
    afternoonEnd: config.afternoonEnd ?? DEFAULT_SHIFT_CONFIG.afternoonEnd,
  };
}

export async function upsertCashShiftConfig(
  config: CashShiftConfigData,
  updatedBy?: string | null,
  restaurantId = RESTAURANT_ID
) {
  const validation = validateCashShiftConfig(config);
  if (!validation.ok) return validation;

  const saved = await CashShiftConfig.findOneAndUpdate(
    { restaurantId },
    {
      $set: {
        restaurantId,
        ...config,
        updatedBy: updatedBy ?? null,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();

  return { ok: true as const, data: saved };
}

export async function getCashShiftWindows(): Promise<Record<CashShiftName, ShiftWindow>> {
  const config = await getCashShiftConfig();

  return {
    'Turno Mañana': {
      name: 'Turno Mañana',
      start: config.morningStart,
      end: config.morningEnd,
    },
    'Turno Tarde': {
      name: 'Turno Tarde',
      start: config.afternoonStart,
      end: config.afternoonEnd,
    },
    'Turno Completo': {
      name: 'Turno Completo',
      start: config.morningStart,
      end: config.afternoonEnd,
    },
  };
}

export function normalizeCashShift(shift?: string | null): CashShiftName | null {
  if (!shift) return null;

  const key = shift
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ã±|Ã±|aa±/g, 'n')
    .trim();

  return SHIFT_ALIASES[key] ?? null;
}

export async function getCurrentOperationalShift(date = new Date()): Promise<CashShiftName | null> {
  const { hour, minute } = getLaPazDateParts(date);
  const currentMinutes = hour * 60 + minute;
  const windows = await getCashShiftWindows();

  const morningStart = parseTimeToMinutes(windows['Turno Mañana'].start) ?? 0;
  const morningEnd = parseTimeToMinutes(windows['Turno Mañana'].end) ?? 0;
  const afternoonStart = parseTimeToMinutes(windows['Turno Tarde'].start) ?? 0;
  const afternoonEnd = parseTimeToMinutes(windows['Turno Tarde'].end) ?? 0;

  if (currentMinutes >= morningStart && currentMinutes < morningEnd) return 'Turno Mañana';
  if (currentMinutes >= afternoonStart && currentMinutes < afternoonEnd) return 'Turno Tarde';
  return null;
}

export async function getCashShiftContext(shiftName: CashShiftName, date = new Date()) {
  const { dateKey } = getLaPazDateParts(date);
  const windows = await getCashShiftWindows();
  const window = windows[shiftName];

  return {
    shiftName,
    shiftDate: dateKey,
    shiftStart: getShiftBoundary(dateKey, window.start),
    shiftEnd: getShiftBoundary(dateKey, window.end),
    shiftRange: formatShiftRange(window.start, window.end),
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

export async function isWithinShiftHours(shiftName: CashShiftName, date = new Date()) {
  const { hour, minute } = getLaPazDateParts(date);
  const currentMinutes = hour * 60 + minute;
  const windows = await getCashShiftWindows();
  const window = windows[shiftName];
  const startMinutes = parseTimeToMinutes(window.start) ?? 0;
  const endMinutes = parseTimeToMinutes(window.end) ?? 0;

  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

export async function getCashCloseForShift(shiftName: CashShiftName, date = new Date()) {
  const shift = await getCashShiftContext(shiftName, date);
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
        shiftName: { $exists: false },
        closingDate: { $gte: shift.shiftStart, $lt: shift.shiftEnd },
      },
    ],
  }).sort({ closingDate: -1 });
}

export async function getOpenCashShiftForUser(userId?: string | null, date = new Date()) {
  const assignedShift = await getCashierShiftByUserId(userId);

  if (!assignedShift) {
    return { ok: false as const, error: 'No se encontro un turno asignado para este cajero.' };
  }

  const shift = await getCashShiftContext(assignedShift, date);

  if (!(await isWithinShiftHours(assignedShift, date))) {
    return {
      ok: false as const,
      error: `Este cajero no esta dentro de su horario de ${assignedShift}: ${shift.shiftRange}.`,
    };
  }

  const cashClose = await getCashCloseForShift(assignedShift, date);
  if (cashClose) {
    return { ok: false as const, error: 'La caja de este turno ya fue cerrada. No se pueden registrar mas pagos.' };
  }

  return { ok: true as const, shift };
}

export async function getOpenOperationalCashShift(date = new Date()) {
  const currentShift = await getCurrentOperationalShift(date);

  if (!currentShift) {
    return { ok: false as const, error: 'Fuera del horario de caja. No se pueden registrar pagos.' };
  }

  const cashClose = await getCashCloseForShift(currentShift, date);
  if (cashClose) {
    return { ok: false as const, error: 'La caja de este turno ya fue cerrada. No se pueden registrar mas pagos.' };
  }

  return { ok: true as const, shift: await getCashShiftContext(currentShift, date) };
}

export async function getCashRegisterSummaryForShift(shiftName: CashShiftName, date = new Date()) {
  const shift = await getCashShiftContext(shiftName, date);

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
