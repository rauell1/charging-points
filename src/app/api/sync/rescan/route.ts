import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { readdir } from 'fs/promises';
import { join } from 'path';
import { syncWorkbook } from '@/lib/sync-helper';

const UPLOAD_DIR = join(process.cwd(), 'upload');

export async function POST() {
  const startTime = Date.now();

  try {
    const files = await readdir(UPLOAD_DIR);
    const excelFiles = files.filter(f => /\.(xlsx|xls|csv)$/i.test(f));

    if (excelFiles.length === 0) {
      return NextResponse.json({
        message: 'No Excel files found in upload directory',
        filesScanned: 0,
        results: [],
        timestamp: new Date().toISOString(),
      });
    }

    const results: Array<{
      file: string;
      sheets: string[];
      created: number;
      updated: number;
      unchanged: number;
      errors: number;
    }> = [];

    let totalCreated = 0;
    let totalUpdated = 0;
    let totalUnchanged = 0;
    let totalErrors = 0;

    for (const fileName of excelFiles) {
      const filePath = join(UPLOAD_DIR, fileName);

      try {
        const workbook = XLSX.readFile(filePath);
        const fileResult = await syncWorkbook(workbook, 'rescan', fileName);

        totalCreated += fileResult.summary.created;
        totalUpdated += fileResult.summary.updated;
        totalUnchanged += fileResult.summary.unchanged;
        totalErrors += fileResult.summary.errors;

        results.push({
          file: fileName,
          sheets: fileResult.sheets,
          created: fileResult.summary.created,
          updated: fileResult.summary.updated,
          unchanged: fileResult.summary.unchanged,
          errors: fileResult.summary.errors,
        });
      } catch (err) {
        results.push({
          file: fileName,
          sheets: [],
          created: 0,
          updated: 0,
          unchanged: 0,
          errors: 1,
        });
        totalErrors++;
        console.error(`Error processing ${fileName}:`, err);
      }
    }

    // Log to SyncLog
    const durationMs = Date.now() - startTime;
    const status = totalErrors > 0 ? (totalCreated + totalUpdated > 0 ? 'partial' : 'error') : 'success';
    try {
      await db.syncLog.create({
        data: {
          source: 'rescan',
          status,
          created: totalCreated,
          updated: totalUpdated,
          unchanged: totalUnchanged,
          errors: totalErrors,
          details: JSON.stringify({ filesScanned: excelFiles.length, files: results.map(r => r.file) }),
          fileName: `${excelFiles.length} files`,
          triggerBy: 'user',
          durationMs,
        },
      });
    } catch (logErr) {
      console.error('Failed to write sync log:', logErr);
    }

    return NextResponse.json({
      message: `Rescan complete: ${totalCreated} new, ${totalUpdated} updated, ${totalUnchanged} unchanged, ${totalErrors} errors`,
      filesScanned: excelFiles.length,
      summary: { totalCreated, totalUpdated, totalUnchanged, totalErrors },
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Rescan error:', error);

    // Log error to SyncLog
    try {
      const durationMs = Date.now() - startTime;
      await db.syncLog.create({
        data: {
          source: 'rescan',
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
    } catch { /* ignore log failures */ }

    return NextResponse.json(
      { error: 'Failed to rescan upload folder', details: String(error) },
      { status: 500 }
    );
  }
}
