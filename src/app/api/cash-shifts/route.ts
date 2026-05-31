import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import {
  getCashShiftConfig,
  RESTAURANT_ID,
  upsertCashShiftConfig,
  validateCashShiftConfig,
} from '@/lib/cashRegister';

function buildResponse(config: Awaited<ReturnType<typeof getCashShiftConfig>>) {
  return {
    restaurantId: RESTAURANT_ID,
    morningStart: config.morningStart,
    morningEnd: config.morningEnd,
    afternoonStart: config.afternoonStart,
    afternoonEnd: config.afternoonEnd,
    shifts: [
      {
        shift: 'Turno Mañana',
        start: config.morningStart,
        end: config.morningEnd,
        hours: `${config.morningStart} - ${config.morningEnd}`,
        description: 'Caja habilitada durante la mañana',
      },
      {
        shift: 'Turno Tarde',
        start: config.afternoonStart,
        end: config.afternoonEnd,
        hours: `${config.afternoonStart} - ${config.afternoonEnd}`,
        description: 'Caja habilitada durante la tarde',
      },
      {
        shift: 'Turno Completo',
        start: config.morningStart,
        end: config.afternoonEnd,
        hours: `${config.morningStart} - ${config.afternoonEnd}`,
        description: 'Caja habilitada durante toda la jornada',
      },
    ],
  };
}

export async function GET() {
  try {
    await connectDB();
    const config = await getCashShiftConfig();
    return NextResponse.json(buildResponse(config));
  } catch (error) {
    console.error('[cash-shifts] GET:', error);
    return NextResponse.json({ error: 'Error al cargar horarios de caja' }, { status: 500 });
  }
}

function getAdminUserId(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  try {
    const user = verifyToken(authHeader.split(' ')[1]);
    return user.rol === 'admin' ? user.userId : null;
  } catch {
    return null;
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userId = getAdminUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'No tienes permisos para editar horarios' }, { status: 403 });
    }

    await connectDB();
    const body = await req.json();
    const config = {
      morningStart: String(body.morningStart ?? ''),
      morningEnd: String(body.morningEnd ?? ''),
      afternoonStart: String(body.afternoonStart ?? ''),
      afternoonEnd: String(body.afternoonEnd ?? ''),
    };

    const validation = validateCashShiftConfig(config);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const result = await upsertCashShiftConfig(config, userId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(buildResponse(config));
  } catch (error) {
    console.error('[cash-shifts] PUT:', error);
    return NextResponse.json({ error: 'Error al guardar horarios de caja' }, { status: 500 });
  }
}
