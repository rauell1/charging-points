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

    // Daily session counts (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const dailySessions = await db.chargingSession.groupBy({
      by: ['date'],
      where: { date: { gte: thirtyDaysAgo } },
      _count: { id: true },
      _sum: { energyKwh: true, costKes: true },
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
