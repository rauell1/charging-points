import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { syncWorkbook, pruneSyncLogs } from '@/lib/sync-helper';

export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const source = (formData.get('source') as string) || 'auto-detect';

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const result = await syncWorkbook(workbook, source, file.name);

    const durationMs = Date.now() - startTime;
    const status = result.summary.errors > 0
      ? (result.summary.created + result.summary.updated > 0 ? 'partial' : 'error')
      : 'success';

    try {
      await db.syncLog.create({
        data: {
          source: 'manual_upload',
          status,
          created: result.summary.created,
          updated: result.summary.updated,
          unchanged: result.summary.unchanged,
          errors: result.summary.errors,
          details: JSON.stringify(result.summary.changes.slice(0, 100)),
          fileName: file.name,
          triggerBy: 'user',
          durationMs,
        },
      });
      await pruneSyncLogs();
    } catch (logErr) {
      console.error('Failed to write sync log:', logErr);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Sync upload error:', error);

    try {
      const durationMs = Date.now() - startTime;
      await db.syncLog.create({
        data: {
          source: 'manual_upload',
          status: 'error',
          created: 0,
          updated: 0,
          unchanged: 0,
          errors: 1,
          details: JSON.stringify({ error: String(error) }),
          triggerBy: 'user',
          durationMs,
        },
      });
      await pruneSyncLogs();
    } catch { /* ignore log failures */ }

    return NextResponse.json(
      { error: 'Failed to process file', details: String(error) },
      { status: 500 }
    );
  }
}
