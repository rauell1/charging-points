import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions, ADMIN_EMAIL } from '@/lib/auth';

const VALID_STATUSES = ['operational', 'construction', 'planned', 'blocked', 'archived'];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || session.user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized — admin only' }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json() as { status: string | null; note?: string };
  const { status, note } = body;

  // null = clear override
  if (status !== null && !VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')} or null to clear` },
      { status: 400 }
    );
  }

  const station = await db.chargingStation.findUnique({ where: { id } });
  if (!station) {
    return NextResponse.json({ error: 'Station not found' }, { status: 404 });
  }

  const updated = await db.chargingStation.update({
    where: { id },
    data: {
      // If clearing override, reset status to what smart rule computed last sync
      // Just clear the override fields — next sync will recompute
      statusOverride: status,
      statusOverrideBy: status ? session.user.email : null,
      statusOverrideAt: status ? new Date() : null,
      statusOverrideNote: status ? (note ?? null) : null,
      // Immediately apply override to the live status field
      status: status ?? station.status,
    },
  });

  return NextResponse.json({
    success: true,
    station: {
      id: updated.id,
      chargerId: updated.chargerId,
      name: updated.name,
      status: updated.status,
      statusOverride: updated.statusOverride,
      statusOverrideBy: updated.statusOverrideBy,
      statusOverrideAt: updated.statusOverrideAt,
    },
    message: status
      ? `Override set: ${station.name} → ${status}`
      : `Override cleared: ${station.name} will follow smart sync rule`,
  });
}
