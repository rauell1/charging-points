import { db } from '@/lib/db';
import { runSheetsSync } from '@/app/api/sync/sheets/route';
import { NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// GET /api/cron/sync-sheets
//
// Vercel cron job endpoint - pulls the deployment tracking Google Sheet
// and upserts ChargingStation records via resolveStation() (no duplicates).
//
// Scheduled in vercel.json:  "0 */6 * * *"  (every 6 hours)
// Auth:  CRON_SECRET env var must match Vercel's Authorization header,
//        OR the request must come from Vercel's cron infrastructure.
// ---------------------------------------------------------------------------
export async function GET(request: Request) {
  // Verify this request is from Vercel cron or a trusted caller
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();

  try {
    const result = await runSheetsSync('cron');
    const durationMs = Date.now() - startTime;

    await db.syncLog.create({
      data: {
        source: 'sheets_cron',
        status: result.errors > 0
          ? (result.created + result.updated > 0 ? 'partial' : 'error')
          : 'success',
        created: result.created,
        updated: result.updated,
        unchanged: result.unchanged,
        errors: result.errors,
        details: JSON.stringify({
          skipped: result.skipped,
          sheetUrl: result.sheetUrl,
          trigger: 'cron',
        }),
        triggerBy: 'cron',
        durationMs,
      },
    });

    return NextResponse.json({ ok: true, ...result, durationMs });
  } catch (err) {
    const durationMs = Date.now() - startTime;
    const errMsg = String(err);
    console.error('[cron/sync-sheets] Failed:', errMsg);

    await db.syncLog.create({
      data: {
        source: 'sheets_cron',
        status: 'error',
        created: 0, updated: 0, unchanged: 0, errors: 1,
        details: JSON.stringify({ error: errMsg, trigger: 'cron' }),
        triggerBy: 'cron',
        durationMs,
      },
    }).catch(() => {});

    return NextResponse.json({ ok: false, error: errMsg }, { status: 500 });
  }
}
