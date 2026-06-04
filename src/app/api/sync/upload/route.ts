import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

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

    try {
      // Parse Excel directly from buffer — no temp file needed
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const result = await processWorkbook(workbook, source);

      // Log to SyncLog
      const durationMs = Date.now() - startTime;
      const status = result.summary.errors > 0 ? (result.summary.created + result.summary.updated > 0 ? 'partial' : 'error') : 'success';
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
      } catch (logErr) {
        console.error('Failed to write sync log:', logErr);
      }

      return NextResponse.json(result);
    }
  } catch (error) {
    console.error('Sync upload error:', error);

    // Log error to SyncLog
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
    } catch { /* ignore log failures */ }

    return NextResponse.json(
      { error: 'Failed to process file', details: String(error) },
      { status: 500 }
    );
  }
}

interface SyncResult {
  message: string;
  file: string;
  source: string;
  sheets: string[];
  summary: {
    created: number;
    updated: number;
    unchanged: number;
    errors: number;
    changes: Array<{
      action: 'created' | 'updated' | 'unchanged' | 'error';
      chargerId: string;
      name: string;
      field?: string;
      oldVal?: string;
      newVal?: string;
    }>;
  };
  timestamp: string;
}

async function processWorkbook(workbook: XLSX.WorkBook, source: string): Promise<SyncResult> {
  const sheetNames = workbook.SheetNames;
  const result: SyncResult = {
    message: 'Sync completed',
    file: '',
    source,
    sheets: sheetNames,
    summary: { created: 0, updated: 0, unchanged: 0, errors: 0, changes: [] },
    timestamp: new Date().toISOString(),
  };

  // Detect which workbook this is based on sheet names
  const hasRP = sheetNames.some(n => n.includes('RP'));
  const hasRH = sheetNames.some(n => n.includes('RH'));

  if (hasRP) {
    const rpSheetName = sheetNames.find(n => n.includes('RP'))!;
    const rpSheet = workbook.Sheets[rpSheetName];
    const rpRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(rpSheet);
    await processRoamPoints(rpRows, result);
  }

  if (hasRH) {
    const rhSheetName = sheetNames.find(n => n.includes('RH'))!;
    const rhSheet = workbook.Sheets[rhSheetName];
    const rhRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(rhSheet);
    await processRoamHubs(rhRows, result);
  }

  // Check for SITES sheet (Motorcycle Charging Sites)
  if (sheetNames.includes('SITES')) {
    const sitesSheet = workbook.Sheets['SITES'];
    const sitesRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sitesSheet);
    await processSitesSheet(sitesRows, result);
  }

  // Auto-detect generic sheets with charging data
  if (!hasRP && !hasRH && !sheetNames.includes('SITES')) {
    for (const name of sheetNames) {
      if (['CONFIG', 'LOOKUPS', 'AGENTS', 'MULTI SITES PARTNERS', 'TBD'].includes(name)) continue;
      const sheet = workbook.Sheets[name];
      if (!sheet) continue;
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
      if (rows.length > 0) {
        const firstRow = rows[0];
        const keys = Object.keys(firstRow);
        if (keys.some(k => /charger|station|site|point|hub/i.test(k))) {
          await processGenericSheet(rows, result, name);
        }
      }
    }
  }

  return result;
}

async function processRoamPoints(
  rows: Record<string, unknown>[],
  result: SyncResult
) {
  for (const row of rows) {
    try {
      const chargerId = extractString(row, ['Charger ID', 'charger_id', 'ID', 'Site ID', 'chargerId']);
      if (!chargerId) continue;

      const normalizedId = chargerId.startsWith('#') ? chargerId : `#${chargerId}`;
      const name = extractString(row, ['Site Name', 'Name', 'Site', 'name', 'site_name']) || `Roam Point - ${chargerId}`;
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
      const partner = extractString(row, ['Partner', 'Host', 'Partner Name', 'partner', 'host_name']);
      const siteManager = extractString(row, ['Site Manager', 'Contact Person', 'Manager', 'site_manager']);
      const managerPhone = extractString(row, ['Phone', 'Contact', 'phone', 'contact_number']);
      const connectorType = extractString(row, ['Connector', 'connector_type', 'Type']);
      const powerOutput = extractNumber(row, ['Power', 'kW', 'power_output', 'Output']);
      const chargerCount = extractNumber(row, ['Chargers', 'charger_count', 'No. Chargers'], 1);
      const totalKw = extractNumber(row, ['Total kW', 'total_kw', 'Total Power'], 6);
      const notes = extractString(row, ['Notes', 'Comment', 'Remarks', 'notes', 'comments']);
      const operatingHours = extractString(row, ['Hours', 'operating_hours', 'Operating Hours']);

      const existing = await db.chargingStation.findUnique({
        where: { chargerId: normalizedId },
      });

      const updateData: Record<string, unknown> = {
        name: name || undefined,
        type: 'point',
        status,
        address: address || undefined,
        neighborhood: neighborhood || undefined,
        latitude: lat !== null ? lat : undefined,
        longitude: lng !== null ? lng : undefined,
        chargerCount: chargerCount || 1,
        totalKw: totalKw || 6,
        connectorType: connectorType || 'Type 6',
        powerOutputKw: powerOutput !== null ? powerOutput : undefined,
        partner: partner || undefined,
        siteManager: siteManager || undefined,
        managerPhone: managerPhone || undefined,
        services: JSON.stringify(['charging']),
        operatingHours: operatingHours || undefined,
        notes: notes || undefined,
      };

      if (existing) {
        const changes = detectChanges(existing, updateData);
        if (changes.length > 0) {
          await db.chargingStation.update({
            where: { chargerId: normalizedId },
            data: updateData,
          });
          result.summary.updated++;
          changes.forEach(c => {
            result.summary.changes.push({
              action: 'updated',
              chargerId: normalizedId,
              name: name || chargerId,
              field: c.field,
              oldVal: String(c.oldVal ?? ''),
              newVal: String(c.newVal ?? ''),
            });
          });
        } else {
          result.summary.unchanged++;
        }
      } else {
        await db.chargingStation.create({
          data: { chargerId: normalizedId, ...updateData },
        });
        result.summary.created++;
        result.summary.changes.push({
          action: 'created',
          chargerId: normalizedId,
          name: name || chargerId,
        });
      }
    } catch (error) {
      console.error('Error processing row:', error);
      result.summary.errors++;
      result.summary.changes.push({
        action: 'error',
        chargerId: extractString(row, ['Charger ID', 'charger_id', 'ID']) || 'unknown',
        name: 'Unknown',
      });
    }
  }
}

async function processRoamHubs(
  rows: Record<string, unknown>[],
  result: SyncResult
) {
  for (const row of rows) {
    try {
      const chargerId = extractString(row, ['Charger ID', 'charger_id', 'ID', 'Site ID', 'Hub ID']);
      if (!chargerId) continue;

      const normalizedId = chargerId.startsWith('#') ? chargerId : `#${chargerId}`;
      const name = extractString(row, ['Site Name', 'Name', 'Hub Name', 'name']) || `Roam Hub - ${chargerId}`;
      const address = extractString(row, ['Address', 'Location', 'address']);
      const neighborhood = extractString(row, ['Neighborhood', 'Area', 'Landmark']);
      const statusRaw = extractString(row, ['Status', 'status']);

      let status = 'operational';
      if (statusRaw) {
        const s = statusRaw.toLowerCase();
        if (s.includes('operational') || s.includes('active') || s.includes('live')) status = 'operational';
        else if (s.includes('construction') || s.includes('install')) status = 'construction';
        else if (s.includes('blocked') || s.includes('stalled')) status = 'blocked';
        else if (s.includes('archived') || s.includes('closed')) status = 'archived';
        else if (s.includes('planned') || s.includes('coming')) status = 'planned';
      }

      const lat = extractNumber(row, ['Latitude', 'lat', 'Lat']);
      const lng = extractNumber(row, ['Longitude', 'lng', 'Lng']);
      const chargerCount = extractNumber(row, ['Chargers', 'charger_count', 'No. Chargers'], 0);
      const totalKw = extractNumber(row, ['Total kW', 'total_kw', 'Total Power'], 0);
      const partner = extractString(row, ['Partner', 'Host', 'partner']);
      const siteManager = extractString(row, ['Site Manager', 'Manager', 'site_manager']);
      const managerPhone = extractString(row, ['Phone', 'Contact', 'phone']);
      const notes = extractString(row, ['Notes', 'Remarks', 'notes']);
      const operatingHours = extractString(row, ['Hours', 'operating_hours']);
      const solarPowered = extractString(row, ['Solar', 'solar'])?.toLowerCase() === 'yes';
      const dynamicsCode = extractString(row, ['Dynamics Code', 'dynamics_code', 'FO Code']);
      const city = extractString(row, ['City', 'city']) || 'Nairobi';

      const existing = await db.chargingStation.findUnique({
        where: { chargerId: normalizedId },
      });

      const updateData: Record<string, unknown> = {
        name,
        type: 'hub',
        status,
        address: address || undefined,
        neighborhood: neighborhood || undefined,
        city: city || 'Nairobi',
        latitude: lat !== null ? lat : undefined,
        longitude: lng !== null ? lng : undefined,
        chargerCount: chargerCount || 0,
        totalKw: totalKw || 0,
        partner: partner || undefined,
        siteManager: siteManager || undefined,
        managerPhone: managerPhone || undefined,
        services: JSON.stringify(['charging', 'rental']),
        operatingHours: operatingHours || undefined,
        solarPowered: solarPowered || false,
        dynamicsCode: dynamicsCode || undefined,
        notes: notes || undefined,
      };

      if (existing) {
        const changes = detectChanges(existing, updateData);
        if (changes.length > 0) {
          await db.chargingStation.update({
            where: { chargerId: normalizedId },
            data: updateData,
          });
          result.summary.updated++;
          changes.forEach(c => {
            result.summary.changes.push({
              action: 'updated',
              chargerId: normalizedId,
              name,
              field: c.field,
              oldVal: String(c.oldVal ?? ''),
              newVal: String(c.newVal ?? ''),
            });
          });
        } else {
          result.summary.unchanged++;
        }
      } else {
        await db.chargingStation.create({
          data: { chargerId: normalizedId, ...updateData },
        });
        result.summary.created++;
        result.summary.changes.push({ action: 'created', chargerId: normalizedId, name });
      }
    } catch (error) {
      console.error('Error processing hub row:', error);
      result.summary.errors++;
    }
  }
}

async function processSitesSheet(
  rows: Record<string, unknown>[],
  result: SyncResult
) {
  for (const row of rows) {
    try {
      const siteId = extractString(row, ['Site ID', 'Charger ID', 'ID', 'site_id']);
      if (!siteId) continue;

      const normalizedId = siteId.startsWith('#') ? siteId : `#${siteId}`;
      const name = extractString(row, ['Site Name', 'Name', 'name']) || `Site - ${siteId}`;
      const address = extractString(row, ['Address', 'Location', 'address']);
      const neighborhood = extractString(row, ['Neighborhood', 'Area', 'Landmark', 'neighborhood']);
      const statusRaw = extractString(row, ['Status', 'status']);

      let status = 'planned';
      if (statusRaw) {
        const s = statusRaw.toLowerCase();
        if (['operational', 'active'].some(k => s.includes(k))) status = 'operational';
        else if (['construction', 'install'].some(k => s.includes(k))) status = 'construction';
        else if (['blocked', 'stalled'].some(k => s.includes(k))) status = 'blocked';
        else if (['archived', 'closed'].some(k => s.includes(k))) status = 'archived';
      }

      const lat = extractNumber(row, ['Latitude', 'lat', 'Lat']);
      const lng = extractNumber(row, ['Longitude', 'lng', 'Lng']);
      const partner = extractString(row, ['Partner', 'Host', 'partner']);
      const notes = extractString(row, ['Notes', 'Remarks', 'notes']);

      const existing = await db.chargingStation.findUnique({
        where: { chargerId: normalizedId },
      });

      const updateData: Record<string, unknown> = {
        name,
        type: 'point',
        status,
        address: address || undefined,
        neighborhood: neighborhood || undefined,
        latitude: lat !== null ? lat : undefined,
        longitude: lng !== null ? lng : undefined,
        partner: partner || undefined,
        services: JSON.stringify(['charging']),
        notes: notes || undefined,
      };

      if (!existing) {
        await db.chargingStation.create({
          data: { chargerId: normalizedId, ...updateData },
        });
        result.summary.created++;
        result.summary.changes.push({ action: 'created', chargerId: normalizedId, name });
      } else {
        const changes = detectChanges(existing, updateData);
        if (changes.length > 0) {
          await db.chargingStation.update({
            where: { chargerId: normalizedId },
            data: updateData,
          });
          result.summary.updated++;
        } else {
          result.summary.unchanged++;
        }
      }
    } catch {
      result.summary.errors++;
    }
  }
}

async function processGenericSheet(
  rows: Record<string, unknown>[],
  result: SyncResult,
  sheetName: string
) {
  for (const row of rows) {
    try {
      const chargerId = extractString(row, ['Charger ID', 'ID', 'Site ID', 'charger_id']);
      if (!chargerId) continue;

      const normalizedId = chargerId.startsWith('#') ? chargerId : `#${chargerId}`;
      const name = extractString(row, ['Name', 'Site Name']) || `${sheetName} - ${chargerId}`;
      const address = extractString(row, ['Address', 'Location']);
      const neighborhood = extractString(row, ['Neighborhood', 'Area']);

      const existing = await db.chargingStation.findUnique({
        where: { chargerId: normalizedId },
      });

      if (!existing) {
        await db.chargingStation.create({
          data: {
            chargerId: normalizedId,
            name,
            type: 'point',
            status: 'planned',
            address: address || undefined,
            neighborhood: neighborhood || undefined,
            services: JSON.stringify(['charging']),
          },
        });
        result.summary.created++;
        result.summary.changes.push({ action: 'created', chargerId: normalizedId, name });
      } else {
        result.summary.unchanged++;
      }
    } catch {
      result.summary.errors++;
    }
  }
}

// ─── Helper functions ─────────────────────────────────────────────────────────

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

interface Change {
  field: string;
  oldVal: unknown;
  newVal: unknown;
}

function detectChanges(existing: Record<string, unknown>, newData: Record<string, unknown>): Change[] {
  const changes: Change[] = [];
  const fieldsToCompare = [
    'name', 'status', 'address', 'neighborhood', 'latitude', 'longitude',
    'chargerCount', 'totalKw', 'connectorType', 'powerOutputKw', 'partner',
    'siteManager', 'managerPhone', 'notes', 'operatingHours',
  ];

  for (const field of fieldsToCompare) {
    const oldVal = existing[field];
    const newVal = newData[field];
    if (newVal !== undefined && JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes.push({ field, oldVal, newVal });
    }
  }

  return changes;
}
