import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const stations = await db.chargingStation.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        _count: { select: { sessions: true, activities: true } },
      },
    });

    return NextResponse.json(stations);
  } catch (error) {
    console.error('Stations API error:', error);
    return NextResponse.json({ error: 'Failed to fetch stations' }, { status: 500 });
  }
}
