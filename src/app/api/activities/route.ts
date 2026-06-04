import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const activities = await db.activityLog.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        station: {
          select: { name: true, type: true },
        },
      },
    });

    return NextResponse.json(activities);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 });
  }
}
