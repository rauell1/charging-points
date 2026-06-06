import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

// ONE-TIME migration endpoint - delete after use
// Adds statusOverride fields to ChargingStation table
export async function POST(request: Request) {
  const authHeader = request.headers.get('x-migrate-key');
  if (authHeader !== 'roam-migrate-2025') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Use raw SQL to add columns if they don't exist (idempotent)
    await db.$executeRawUnsafe(`
      ALTER TABLE "ChargingStation"
        ADD COLUMN IF NOT EXISTS "statusOverride"     TEXT,
        ADD COLUMN IF NOT EXISTS "statusOverrideBy"   TEXT,
        ADD COLUMN IF NOT EXISTS "statusOverrideAt"   TIMESTAMP(3),
        ADD COLUMN IF NOT EXISTS "statusOverrideNote" TEXT;
    `);

    return NextResponse.json({
      success: true,
      message: 'Migration applied: statusOverride fields added to ChargingStation',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Migration failed', details: String(error) },
      { status: 500 }
    );
  }
}
