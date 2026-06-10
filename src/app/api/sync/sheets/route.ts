import { db } from '@/lib/db';
import { resolveStation } from '@/lib/sync-helper';
import { NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Google Sheets CSV sync
//
// Fetches a publicly-viewable Google Sheet as CSV and upserts ChargingStation
// records. Uses resolveStation() so bare #RP-KE-A-XX / #RH-KE-A-XX IDs are
// always resolved to their canonical FO-NBI-XX counterpart - no duplicates.
//
// Env vars:
//   SHEETS_DEPLOY_URL  - full CSV export URL for the deployment tracking sheet
//   CRON_SECRET        - shared secret to authenticate cron/API calls
//
// Sheet requirements:
//   - Must be "Anyone with link - Viewer" (public read)
//   - Must have a column containing the canonical project code
//     e.g. FO-NBI-01#RP-KE-A-03 or FO-NBI-01#RH-KE-A-07
// ---------------------------------------------------------------------------

// Simple CSV parser (handles quoted fields)
function parseCSV(text: string): string[][] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  return lines.map(line => {
    const fields: string[] = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (ch === ',' && !inQ) {
        fields.push(cur.trim()); cur = '';
      } else {
        cur += ch;
      }
    }
    fields.push(cur.trim());
    return fields;
  }).filter(row => row.some(c => c.length > 0));
}

// Canonical ID pattern: FO-NBI-XX#R[PH]-KE-A-XX or FO-NBI-XX#RH-KE-A-XX
const CANONICAL_PATTERN = /^FO-NBI-\d+#R[PH]-KE-[A-Z]+-\d+$/;
// Bare ID pattern: #RP-KE-A-XX or #RH-KE-A-XX
const BARE_PATTERN = /^#R[PH]-KE-[A-Z]+-\d+$/;

function isCanonicalId(s: string) { return CANONICAL_PATTERN.test(s.trim()); }
function isBareId(s: string) { return BARE_PATTERN.test(s.trim()); }

// Auto-detect which column index contains the canonical project code
function detectIdColumn(headers: string[], firstDataRow: string[]): number {
  // 1. Header keyword match
  const headerKeywords = ['project code', 'charger id', 'station id', 'dynamics', 'canonical'];
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase();
    if (headerKeywords.some(kw => h.includes(kw))) return i;
  }
  // 2. Content scan in first data row - find cell matching canonical or bare ID
  for (let i = 0; i < firstDataRow.length; i++) {
    if (isCanonicalId(firstDataRow[i]) || isBareId(firstDataRow[i])) return i;
  }
  // 3. Fallback: column 8 (index) matches the Roam Points sheet layout
  return 8;
}

// Auto-detect other columns from header names
function detectColumns(headers: string[]): {
  id: number; name: number; status: number;
  coord: number; lat: number; lng: number; type: number;
} {
  const h = headers.map(s => s.toLowerCase());
  const find = (...kws: string[]) => h.findIndex(s => kws.some(kw => s.includes(kw)));

  return {
    id:     -1, // filled by detectIdColumn
    name:   find('charger name', 'complete name', 'full name', 'name'),
    status: find('status'),
    coord:  find('coordinate', 'coords', 'gps'),
    lat:    find('latitude', ' lat'),
    lng:    find('longitude', 'lon', ' lng'),
    type:   find('type', 'station type'),
  };
}

// Parse coordinate string "-1.2662, 36.8353" -> [lat, lng]
function parseCoord(s: string): [number, number] | null {
  const parts = s.split(',').map(p => parseFloat(p.trim()));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return [parts[0], parts[1]];
  }
  return null;
}

// Normalise status string to DB enum
function normaliseStatus(s: string): string {
  const v = s.toLowerCase().trim();
  if (v.includes('operational') || v.includes('active') || v.includes('live')) return 'operational';
  if (v.includes('construction') || v.includes('install') || v.includes('deploying')) return 'construction';
  if (v.includes('blocked') || v.includes('stalled')) return 'blocked';
  if (v.includes('archived') || v.includes('closed') || v.includes('cancelled')) return 'archived';
  if (v.includes('planned') || v.includes('coming') || v.includes('upcoming')) return 'planned';
  return 'planned';
}

// Derive station type from canonical ID
function typeFromId(id: string): string {
  if (id.includes('#RH-KE-')) return 'hub';
  if (id.includes('#RP-KE-')) return 'point';
  if (id.includes('#RK-KE-')) return 'kiosk';
  return 'point';
}

// ---------------------------------------------------------------------------
// Core sync logic - exported so cron can call it directly
// ---------------------------------------------------------------------------
export async function runSheetsSync(triggerBy = 'api'): Promise<{
  created: number; updated: number; unchanged: number; errors: number;
  skipped: number; sheetUrl: string; message: string;
}> {
  const sheetUrl = process.env.SHEETS_DEPLOY_URL;
  if (!sheetUrl) {
    throw new Error('SHEETS_DEPLOY_URL environment variable is not set. Add it in Vercel project settings.');
  }

  // Fetch CSV
  const res = await fetch(sheetUrl, { cache: 'no-store' });
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        `Sheet is not publicly accessible (HTTP ${res.status}). ` +
        `Open the Google Sheet, click Share, and set "Anyone with the link" to Viewer.`
      );
    }
    throw new Error(`Failed to fetch sheet: HTTP ${res.status}`);
  }

  const csvText = await res.text();
  const rows = parseCSV(csvText);
  if (rows.length < 2) throw new Error('Sheet appears empty or has no data rows');

  const headers = rows[0];
  const firstData = rows[1] ?? [];

  // Detect column positions
  const cols = detectColumns(headers);
  cols.id = detectIdColumn(headers, firstData);

  let created = 0, updated = 0, unchanged = 0, errors = 0, skipped = 0;
  const changes: Array<{ action: string; chargerId: string; name: string }> = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    // Get the project code cell
    const rawId = (row[cols.id] ?? '').trim();
    if (!rawId) { skipped++; continue; }

    // Must be a recognised canonical or bare ID
    if (!isCanonicalId(rawId) && !isBareId(rawId)) { skipped++; continue; }

    try {
      // Resolve to canonical ID (dedup logic)
      const { existing, canonicalId } = await resolveStation(rawId);

      // Build update payload
      const nameRaw = cols.name >= 0 ? (row[cols.name] ?? '') : '';
      const name = nameRaw.trim() || `Station ${canonicalId}`;

      const statusRaw = cols.status >= 0 ? (row[cols.status] ?? '') : '';
      const status = statusRaw ? normaliseStatus(statusRaw) : 'planned';

      // Coordinates: try combined coord column first, then separate lat/lng
      let lat: number | null = null;
      let lng: number | null = null;
      if (cols.coord >= 0 && row[cols.coord]) {
        const parsed = parseCoord(row[cols.coord]);
        if (parsed) [lat, lng] = parsed;
      }
      if (lat === null && cols.lat >= 0 && row[cols.lat]) {
        const v = parseFloat(row[cols.lat]);
        if (!isNaN(v)) lat = v;
      }
      if (lng === null && cols.lng >= 0 && row[cols.lng]) {
        const v = parseFloat(row[cols.lng]);
        if (!isNaN(v)) lng = v;
      }

      const stationType = cols.type >= 0 && row[cols.type]
        ? row[cols.type].toLowerCase().trim() || typeFromId(canonicalId)
        : typeFromId(canonicalId);

      const updateData = {
        name,
        type: stationType,
        status,
        address: name,
        neighborhood: 'Nairobi',
        latitude: lat,
        longitude: lng,
        chargerCount: 1,
        totalKw: 6,
        services: '["charging"]',
      };

      if (existing) {
        // Check if anything actually changed before writing
        const needsUpdate =
          existing.name !== name ||
          (existing as Record<string, unknown>).status !== status ||
          (lat !== null && (existing as Record<string, unknown>).latitude !== lat) ||
          (lng !== null && (existing as Record<string, unknown>).longitude !== lng);

        if (needsUpdate) {
          await db.chargingStation.update({
            where: { chargerId: canonicalId },
            data: updateData,
          });
          updated++;
          changes.push({ action: 'updated', chargerId: canonicalId, name });
        } else {
          unchanged++;
        }
      } else {
        await db.chargingStation.create({
          data: { chargerId: canonicalId, ...updateData },
        });
        created++;
        changes.push({ action: 'created', chargerId: canonicalId, name });
      }
    } catch (err) {
      console.error(`Sheet sync error on row ${i + 1}:`, err);
      errors++;
    }
  }

  return {
    created, updated, unchanged, errors, skipped, sheetUrl,
    message: `Sheets sync: ${created} created, ${updated} updated, ${unchanged} unchanged, ${errors} errors, ${skipped} skipped`,
  };
}

// ---------------------------------------------------------------------------
// POST /api/sync/sheets  - manual trigger (admin or external webhook)
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  const startTime = Date.now();

  // Verify secret key
  const apiKey = request.headers.get('x-api-key');
  const expectedKey = process.env.SYNC_API_KEY || 'roam-sync-key-2025';
  if (!apiKey || apiKey !== expectedKey) {
    return NextResponse.json(
      { error: 'Invalid or missing API key. Provide x-api-key header.' },
      { status: 401 }
    );
  }

  try {
    const result = await runSheetsSync('api_manual');
    const durationMs = Date.now() - startTime;

    await db.syncLog.create({
      data: {
        source: 'sheets_sync',
        status: result.errors > 0 ? (result.created + result.updated > 0 ? 'partial' : 'error') : 'success',
        created: result.created,
        updated: result.updated,
        unchanged: result.unchanged,
        errors: result.errors,
        details: JSON.stringify({ skipped: result.skipped, sheetUrl: result.sheetUrl }),
        triggerBy: 'api_manual',
        durationMs,
      },
    });

    return NextResponse.json({ ...result, durationMs });
  } catch (err) {
    const durationMs = Date.now() - startTime;
    const errMsg = String(err);

    await db.syncLog.create({
      data: {
        source: 'sheets_sync',
        status: 'error',
        created: 0, updated: 0, unchanged: 0, errors: 1,
        details: JSON.stringify({ error: errMsg }),
        triggerBy: 'api_manual',
        durationMs,
      },
    }).catch(() => {});

    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
