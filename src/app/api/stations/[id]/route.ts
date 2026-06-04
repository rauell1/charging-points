import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const station = await db.chargingStation.findUnique({
      where: { id },
      include: {
        activities: { orderBy: { createdAt: 'desc' } },
        sessions: {
          orderBy: { date: 'desc' },
          take: 100,
        },
      },
    });

    if (!station) {
      return NextResponse.json({ error: 'Station not found' }, { status: 404 });
    }

    return NextResponse.json(station);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch station' }, { status: 500 });
  }
}
