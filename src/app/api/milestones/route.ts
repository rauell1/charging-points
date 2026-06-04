import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const milestones = await db.milestone.findMany({
      orderBy: { date: 'asc' },
    });

    return NextResponse.json(milestones);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch milestones' }, { status: 500 });
  }
}
