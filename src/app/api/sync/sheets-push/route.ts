import { db } from '@/lib/db';
import { resolveStation } from '@/lib/sync-helper';
import { NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// POST /api/sync/sheets-push
//
// Receives sheet data PUSHED from a Google Apps Script trigger.
// The Apps Script reads the private Google Sheet and POSTs the rows here.
// This avoids needing the sheet to be publicly accessible.
//
// Expected body (JSON):
// {
//   "rows": [["Header1","Header2",...], ["val1","val2",...], ...],
//   "sheetName": "Roam Points"   // optional, for logging
// }
//
// Auth: x-api-key header must match SYNC_API_KEY env var
// ---------------------------------------------------------------------------

// Canonical ID patterns
const CANONICAL_RE = /^FO-NBI-\d+#R[PH]-KE-[A-Z]+-\d+$/;
const BARE_RE = /^#R[PH]-KE-[A-Z]+-\d+$/;
const isCanonicalId = (s: string) => CANONICAL_RE.test(s.trim());
const isBareId = (s: string) => BARE_RE.test(s.trim());

function detectIdColumn(headers: string[], firstDataRow: string[]): number {
  const headerKeywords = ['project code', 'charger id', 'station id', 'dynamics', 'canonical'];
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase();
    if (headerKeywords.some(kw => h.includes(kw))) return i;
  }
  for (let i = 0; i < firstDataRow.length; i++) {
    if (isCanonicalId(firstDataRow[i]) || isBareId(firstDataRow[i])) return i;
  }
  return 8; // fallback: column I (Roam Points sheet layout)
}

function detectColumns(headers: string[]): {
  id: number; name: number; status: number;
  coord: number; lat: number; lng: number; type: number;
} {
  const h = headers.map((s: string) => s.toLowerCase());
  const find = (...kws: string[]) => h.findIndex((s: string) => kws.some(kw => s.includes(kw)));
  return {
    id: -1,
    name: find('charger name', 'complete name', 'full name', 'name'),
    status: find('status'),
    coord: find('coordinate', 'coords', 'gps'),
    lat: find('latitude', ' lat'),
    lng: find('longitude', 'lon', ' lng'),
    type: find('type', 'station type'),
  };
}

function parseCoord(s: string): [number, number] | null {
  const parts = s.split(',').map(p => parseFloat(p.trim()));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) return [parts[0], parts[1]];
  return null;
}

function normaliseStatus(s: string): string {
  const v = s.toLowerCase().trim();
  if (v.includes('operational') || v.includes('active') || v.includes('live')) return 'operational';
  if (v.includes('construction') || v.includes('install') || v.includes('deploying')) return 'construction';
  if (v.includes('blocked') || v.includes('stalled')) return 'blocked';
  if (v.includes('archived') || v.includes('closed') || v.includes('cancelled')) return 'archived';
  return 'planned';
}

function typeFromId(id: string): string {
  if (id.includes('#RH-KE-')) return 'hub';
  if (id.includes('#RP-KE-')) return 'point';
  if (id.includes('#RK-KE-')) return 'kiosk';
  return 'point';
}

export async function POST(request: Request) {
  const startTime = Date.now();

  // Auth check
  const apiKey = request.headers.get('x-api-key');
  const expectedKey = process.env.SYNC_API_KEY || 'roam-sync-key-2025';
  if (!apiKey || apiKey !== expectedKey) {
    return NextResponse.json(
      { error: 'Invalid or missing API key' },
      { status: 401 }
    );
  }

  // Parse body
  let body: { rows?: unknown[][]; sheetName?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const rows = body.rows;
  if (!Array.isArray(rows) || rows.length < 2) {
    return NextResponse.json(
      { error: 'Body must have "rows" array with at least a header row and one data row' },
      { status: 400 }
    );
  }

  const headers = (rows[0] as unknown[]).map(c => String(c ?? ''));
  const firstData = (rows[1] as unknown[]).map(c => String(c ?? ''));

  // Detect columns
  const cols = detectColumns(headers);
  cols.id = detectIdColumn(headers, firstData);

  let created = 0, updated = 0, unchanged = 0, errors = 0, skipped = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = (rows[i] as unknown[]).map(c => String(c ?? ''));
    if (!row || row.length === 0) continue;

    const rawId = (row[cols.id] ?? '').trim();
    if (!rawId) { skipped++; continue; }
    if (!isCanonicalId(rawId) && !isBareId(rawId)) { skipped++; continue; }

    try {
      const { existing, canonicalId } = await resolveStation(rawId);

      const nameRaw = cols.name >= 0 ? (row[cols.name] ?? '') : '';
      const name = nameRaw.trim() || `Station ${canonicalId}`;

      const statusRaw = cols.status >= 0 ? (row[cols.status] ?? '') : '';
      const status = statusRaw ? normaliseStatus(statusRaw) : 'planned';

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
        } else {
          unchanged++;
        }
      } else {
        await db.chargingStation.create({
          data: { chargerId: canonicalId, ...updateData },
        });
        created++;
      }
    } catch (err) {
      console.error(`Sheets-push error on row ${i + 1}:`, err);
      errors++;
    }
  }

  const durationMs = Date.now() - startTime;
  const status = errors > 0 ? (created + updated > 0 ? 'partial' : 'error') : 'success';

  await db.syncLog.create({
    data: {
      source: 'sheets_push',
      status,
      created,
      updated,
      unchanged,
      errors,
      details: JSON.stringify({
        skipped,
        sheetName: body.sheetName ?? 'unknown',
        trigger: 'apps_script',
        detectedIdCol: cols.id,
        totalRows: rows.length - 1,
      }),
      triggerBy: 'apps_script',
      durationMs,
    },
  });

  return NextResponse.json({
    ok: true,
    created,
    updated,
    unchanged,
    errors,
    skipped,
    durationMs,
    message: `Sync complete: ${created} created, ${updated} updated, ${unchanged} unchanged, ${errors} errors`,
  });
}
