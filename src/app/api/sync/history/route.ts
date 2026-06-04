import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const logs = await db.syncLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Summary stats
    const totalSyncs = await db.syncLog.count();
    const totalSuccess = await db.syncLog.count({ where: { status: 'success' } });
    const totalPartial = await db.syncLog.count({ where: { status: 'partial' } });
    const totalErrors = await db.syncLog.count({ where: { status: 'error' } });
    const totalCreated = await db.syncLog.aggregate({ _sum: { created: true }, where: { created: { gt: 0 } } });
    const totalUpdated = await db.syncLog.aggregate({ _sum: { updated: true }, where: { updated: { gt: 0 } } });
    const totalErrorCount = await db.syncLog.aggregate({ _sum: { errors: true }, where: { errors: { gt: 0 } } });

    return NextResponse.json({
      logs,
      summary: {
        totalSyncs,
        totalSuccess,
        totalPartial,
        totalErrors,
        totalCreated: totalCreated._sum.created || 0,
        totalUpdated: totalUpdated._sum.updated || 0,
        totalErrorCount: totalErrorCount._sum.errors || 0,
      },
    });
  } catch (error) {
    console.error('Sync history error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sync history', details: String(error) },
      { status: 500 }
    );
  }
}
