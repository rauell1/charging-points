import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions, ADMIN_EMAIL } from '@/lib/auth';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || session.user.email !== ADMIN_EMAIL) {
    return null;
  }
  return session;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized - admin only' }, { status: 403 });
  }

  const stations = await db.chargingStation.findMany({
    orderBy: [{ type: 'asc' }, { status: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      chargerId: true,
      name: true,
      type: true,
      status: true,
      address: true,
      neighborhood: true,
      launchDate: true,
      partner: true,
      siteManager: true,
      managerPhone: true,
      notes: true,
      chargerCount: true,
      totalKw: true,
      latitude: true,
      longitude: true,
      connectorType: true,
      operatingHours: true,
      statusOverride: true,
      statusOverrideBy: true,
      statusOverrideAt: true,
      statusOverrideNote: true,
    },
  });

  // Compute what the smart rule would say (without override)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const enriched = stations.map((s) => {
    // Reverse-engineer what the sheet likely says from the final status + override
    // The smart rule: operational if sheet=operational AND launchDate <= today
    let smartRuleResult: string;
    if (s.statusOverride) {
      // We don't know the raw sheet status easily - show override info
      smartRuleResult = s.statusOverride;
    } else {
      smartRuleResult = s.status;
    }

    return {
      ...s,
      smartRuleResult,
      hasOverride: !!s.statusOverride,
      overrideInfo: s.statusOverride
        ? `Set by ${s.statusOverrideBy ?? 'admin'} on ${s.statusOverrideAt?.toLocaleDateString() ?? 'unknown date'}${s.statusOverrideNote ? ` - "${s.statusOverrideNote}"` : ''}`
        : null,
    };
  });

  return NextResponse.json({ stations: enriched });
}
