import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { readdir } from 'fs/promises';
import { join } from 'path';

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
        const sheetNames = workbook.SheetNames;

        const fileResult = {
          file: fileName,
          sheets: sheetNames,
          created: 0,
          updated: 0,
          unchanged: 0,
          errors: 0,
        };

        // Process RP sheets
        const rpSheet = sheetNames.find(n => n.includes('RP'));
        if (rpSheet) {
          const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[rpSheet]);
          const counts = await processRows(rows, 'point');
          Object.assign(fileResult, counts);
        }

        // Process RH sheets
        const rhSheet = sheetNames.find(n => n.includes('RH'));
        if (rhSheet) {
          const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[rhSheet]);
          const counts = await processRows(rows, 'hub');
          Object.assign(fileResult, counts);
        }

        // Process SITES sheet
        if (sheetNames.includes('SITES')) {
          const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets['SITES']);
          const counts = await processRows(rows, 'point');
          Object.assign(fileResult, counts);
        }

        totalCreated += fileResult.created;
        totalUpdated += fileResult.updated;
        totalUnchanged += fileResult.unchanged;
        totalErrors += fileResult.errors;
        results.push(fileResult);
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

async function processRows(rows: Record<string, unknown>[], type: 'hub' | 'point') {
  let created = 0;
  let updated = 0;
  let unchanged = 0;

  for (const row of rows) {
    try {
      const chargerId = extractString(row, ['Charger ID', 'charger_id', 'ID', 'Site ID', 'Hub ID']);
      if (!chargerId) continue;

      const normalizedId = chargerId.startsWith('#') ? chargerId : `#${chargerId}`;
      const name = extractString(row, ['Site Name', 'Name', 'Site', 'name', 'site_name', 'Hub Name']) || `${type === 'hub' ? 'Roam Hub' : 'Roam Point'} - ${chargerId}`;
      const address = extractString(row, ['Address', 'Location', 'address', 'location']);
      const neighborhood = extractString(row, ['Neighborhood', 'Area', 'Landmark', 'neighborhood']);
      const statusRaw = extractString(row, ['Status', 'status', 'state']);

      let status = 'planned';
      if (statusRaw) {
        const s = statusRaw.toLowerCase();
        if (s.includes('operational') || s.includes('active') || s.includes('live')) status = 'operational';
        else if (s.includes('construction') || s.includes('install')) status = 'construction';
        else if (s.includes('blocked') || s.includes('stalled')) status = 'blocked';
        else if (s.includes('archived') || s.includes('closed') || s.includes('cancelled')) status = 'archived';
        else if (s.includes('planned') || s.includes('coming') || s.includes('upcoming')) status = 'planned';
      }

      const lat = extractNumber(row, ['Latitude', 'lat', 'Lat']);
      const lng = extractNumber(row, ['Longitude', 'lng', 'Lng', 'Lon']);
      const chargerCount = extractNumber(row, ['Chargers', 'charger_count', 'No. Chargers'], type === 'hub' ? 0 : 1);
      const totalKw = extractNumber(row, ['Total kW', 'total_kw', 'Total Power'], type === 'hub' ? 0 : 6);
      const partner = extractString(row, ['Partner', 'Host', 'Partner Name', 'partner', 'host_name']);
      const siteManager = extractString(row, ['Site Manager', 'Contact Person', 'Manager', 'site_manager']);
      const managerPhone = extractString(row, ['Phone', 'Contact', 'phone', 'contact_number']);
      const notes = extractString(row, ['Notes', 'Comment', 'Remarks', 'notes', 'comments']);

      const existing = await db.chargingStation.findUnique({
        where: { chargerId: normalizedId },
      });

      if (existing) {
        unchanged++;
      } else {
        await db.chargingStation.create({
          data: {
            chargerId: normalizedId,
            name,
            type,
            status,
            address: address || undefined,
            neighborhood: neighborhood || undefined,
            latitude: lat !== null ? lat : undefined,
            longitude: lng !== null ? lng : undefined,
            chargerCount: chargerCount || (type === 'hub' ? 0 : 1),
            totalKw: totalKw || (type === 'hub' ? 0 : 6),
            partner: partner || undefined,
            siteManager: siteManager || undefined,
            managerPhone: managerPhone || undefined,
            services: JSON.stringify(type === 'hub' ? ['charging', 'rental'] : ['charging']),
            notes: notes || undefined,
          },
        });
        created++;
      }
    } catch {
      // Skip errors
    }
  }

  return { created, updated, unchanged };
}

function extractString(row: Record<string, unknown>, possibleKeys: string[]): string | null {
  for (const key of possibleKeys) {
    const val = row[key];
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      return String(val).trim();
    }
  }
  return null;
}

function extractNumber(row: Record<string, unknown>, possibleKeys: string[], fallback?: number): number | null {
  for (const key of possibleKeys) {
    const val = row[key];
    if (val !== undefined && val !== null && val !== '') {
      const num = typeof val === 'number' ? val : parseFloat(String(val));
      if (!isNaN(num)) return num;
    }
  }
  return fallback !== undefined ? fallback : null;
}
