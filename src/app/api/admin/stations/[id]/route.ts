import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions, ADMIN_EMAIL } from '@/lib/auth';

const EDITABLE_FIELDS = [
  'name', 'status', 'address', 'neighborhood', 'partner', 'siteManager',
  'managerPhone', 'notes', 'chargerCount', 'totalKw', 'latitude', 'longitude',
  'connectorType', 'operatingHours', 'launchDate',
] as const;

const NUMERIC_FIELDS = new Set(['chargerCount', 'totalKw', 'latitude', 'longitude']);
const DATE_FIELDS = new Set(['launchDate']);
const VALID_STATUSES = ['operational', 'construction', 'planned', 'blocked', 'archived'];

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || session.user.email !== ADMIN_EMAIL) return null;
  return session;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized - admin only' }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json() as Record<string, unknown>;

  // Build a whitelist-filtered update payload
  const data: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (!(field in body)) continue;
    const raw = body[field];

    if (field === 'status') {
      if (typeof raw === 'string' && VALID_STATUSES.includes(raw)) {
        data[field] = raw;
      }
    } else if (NUMERIC_FIELDS.has(field)) {
      const n = raw === '' || raw === null ? null : Number(raw);
      data[field] = n !== null && !isNaN(n) ? n : null;
    } else if (DATE_FIELDS.has(field)) {
      data[field] = raw ? new Date(raw as string) : null;
    } else {
      data[field] = raw === '' ? null : raw;
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const station = await db.chargingStation.findUnique({ where: { id } });
  if (!station) {
    return NextResponse.json({ error: 'Station not found' }, { status: 404 });
  }

  const updated = await db.chargingStation.update({
    where: { id },
    data,
  });

  return NextResponse.json({
    success: true,
    station: { id: updated.id, chargerId: updated.chargerId, name: updated.name, status: updated.status },
    message: `${updated.name} updated`,
  });
}
