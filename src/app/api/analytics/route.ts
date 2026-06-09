import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Total stats
    const totalStations = await db.chargingStation.count();
    const activeStations = await db.chargingStation.count({ where: { status: 'operational' } });
    const constructionStations = await db.chargingStation.count({ where: { status: 'construction' } });

    // Deployed (Operational) counts
    const hubCount = await db.chargingStation.count({ where: { type: 'hub', status: 'operational' } });
    const pointCount = await db.chargingStation.count({ where: { type: 'point', status: 'operational' } });
    const operationalKiosks = await db.chargingStation.count({ where: { type: 'kiosk', status: 'operational' } });

    // Deploying (Construction) counts
    const constructionHubs = await db.chargingStation.count({ where: { type: 'hub', status: 'construction' } });
    const constructionPoints = await db.chargingStation.count({ where: { type: 'point', status: 'construction' } });
    const constructionKiosks = await db.chargingStation.count({ where: { type: 'kiosk', status: 'construction' } });

    const totalSessions = await db.chargingSession.count();
    const totalChargers = await db.chargingStation.aggregate({ _sum: { chargerCount: true } });

    // Sessions by type
    const sessionsByVehicle = await db.chargingSession.groupBy({
      by: ['vehicleType'],
      _count: { id: true },
      _sum: { chargingMinutes: true, energyKwh: true, costKes: true },
    });

    // Daily session counts - anchored to the most recent session date so
    // periodic batch uploads (e.g. every 3 months) always appear in charts.
    const latestSession = await db.chargingSession.findFirst({
      orderBy: { date: 'desc' },
      select: { date: true },
    });
    const windowEnd = latestSession?.date ?? new Date();
    const windowStart = new Date(windowEnd.getTime() - 30 * 24 * 60 * 60 * 1000);
    const dailySessions = await db.chargingSession.groupBy({
      by: ['date'],
      where: { date: { gte: windowStart, lte: windowEnd } },
      _count: { id: true },
      _sum: { energyKwh: true, costKes: true },
      orderBy: { date: 'asc' },
    });

    // Sessions by station
    const sessionsByStation = await db.chargingStation.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        _count: { select: { sessions: true } },
        sessions: {
          select: {
            energyKwh: true,
            costKes: true,
          },
        },
      },
    });

    const stationStats = sessionsByStation.map((s) => {
      const totalEnergy = s.sessions.reduce((sum, sess) => sum + (sess.energyKwh || 0), 0);
      const totalRevenue = s.sessions.reduce((sum, sess) => sum + (sess.costKes || 0), 0);
      return {
        id: s.id,
        name: s.name,
        type: s.type,
        status: s.status,
        sessionCount: s._count.sessions,
        totalEnergy: Math.round(totalEnergy * 100) / 100,
        totalRevenue: Math.round(totalRevenue),
      };
    });

    // Status × type breakdown for the tiered dashboard overview
    const rawBreakdown = await db.chargingStation.groupBy({
      by: ['status', 'type'],
      _count: { id: true },
      _sum: { chargerCount: true, totalKw: true },
    });

    type BreakdownCell = { count: number; chargers: number; kw: number };
    const breakdown: Record<string, Record<string, BreakdownCell>> = {};
    for (const row of rawBreakdown) {
      if (!breakdown[row.status]) breakdown[row.status] = {};
      breakdown[row.status][row.type] = {
        count: row._count.id,
        chargers: row._sum.chargerCount ?? 0,
        kw: Math.round((row._sum.totalKw ?? 0) * 10) / 10,
      };
    }

    const get = (status: string, type: string): BreakdownCell =>
      breakdown[status]?.[type] ?? { count: 0, chargers: 0, kw: 0 };

    const statusBreakdown = {
      operationalHubs:     get('operational', 'hub'),
      operationalPoints:   get('operational', 'point'),
      operationalKiosks:   get('operational', 'kiosk'),
      constructionHubs:    get('construction', 'hub'),
      constructionPoints:  get('construction', 'point'),
      constructionKiosks:  get('construction', 'kiosk'),
      plannedHubs:         get('planned', 'hub'),
      plannedPoints:       get('planned', 'point'),
      plannedKiosks:       get('planned', 'kiosk'),
      blockedHubs:         get('blocked', 'hub'),
      blockedPoints:       get('blocked', 'point'),
      blockedKiosks:       get('blocked', 'kiosk'),
      archivedHubs:        get('archived', 'hub'),
      archivedPoints:      get('archived', 'point'),
      archivedKiosks:      get('archived', 'kiosk'),
    };

    return NextResponse.json({
      overview: {
        totalStations,
        activeStations,
        constructionStations,
        hubCount,
        pointCount,
        operationalKiosks,
        constructionHubs,
        constructionPoints,
        constructionKiosks,
        totalSessions,
        totalChargers: totalChargers._sum.chargerCount || 0,
      },
      statusBreakdown,
      sessionsByVehicle,
      dailySessions: dailySessions.map((d) => ({
        date: d.date.toISOString().split('T')[0],
        count: d._count.id,
        energy: Math.round((d._sum.energyKwh || 0) * 100) / 100,
        revenue: Math.round(d._sum.costKes || 0),
      })),
      stationStats,
    });
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics', details: String(error) }, { status: 500 });
  }
}
