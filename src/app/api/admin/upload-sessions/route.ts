import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions, ADMIN_EMAIL } from '@/lib/auth';

// Allow larger uploads (up to 16 MB for big CSVs)
export const config = { api: { bodyParser: false } };

// ─── Auth helper ──────────────────────────────────────────────────────────────
async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || session.user.email !== ADMIN_EMAIL) return null;
  return session;
}

// ─── Simple CSV parser ────────────────────────────────────────────────────────
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const vals = parseCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = vals[idx] ?? ''; });
    rows.push(row);
  }
  return rows;
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      fields.push(cur); cur = '';
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

// ─── Timestamp parser ─────────────────────────────────────────────────────────
function parseTs(ts: string): Date | null {
  const s = ts.replace(/\s+UTC$/, '').trim();
  for (const fmt of ['%Y-%m-%d %H:%M:%S.%f', '%Y-%m-%d %H:%M:%S', '%Y-%m-%d']) {
    const d = tryParseDate(s);
    if (d) return d;
  }
  return null;
}

function tryParseDate(s: string): Date | null {
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

// ─── Required CSV columns ─────────────────────────────────────────────────────
const REQUIRED_COLS = [
  'service_id', 'paymentDate', 'duration', 'totalFee',
  'pickupLocationProjectCode', 'transactionStatus',
];

// ─── POST /api/admin/upload-sessions ─────────────────────────────────────────
export async function POST(req: NextRequest) {
  const adminSession = await requireAdmin();
  if (!adminSession) {
    return NextResponse.json({ error: 'Unauthorized — admin only' }, { status: 403 });
  }

  const start = Date.now();

  // Parse multipart
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid multipart form data' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  if (!file) {
    return NextResponse.json({ error: 'No file provided. Send as form field "file".' }, { status: 400 });
  }

  const fileName = file.name;
  const csvText = await file.text();

  // Parse CSV
  let rows: Record<string, string>[];
  try {
    rows = parseCSV(csvText);
  } catch {
    return NextResponse.json({ error: 'Failed to parse CSV' }, { status: 400 });
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: 'CSV is empty or has no data rows' }, { status: 400 });
  }

  // Validate columns
  const missing = REQUIRED_COLS.filter(c => !(c in rows[0]));
  if (missing.length > 0) {
    return NextResponse.json({
      error: `CSV is missing required columns: ${missing.join(', ')}`,
    }, { status: 400 });
  }

  // Load station map: chargerId → station DB id
  const stations = await db.chargingStation.findMany({
    where: { type: 'hub' },
    select: { id: true, chargerId: true, name: true },
  });
  const stationMap = new Map<string, { id: string; name: string }>(
    stations.map(s => [s.chargerId, { id: s.id, name: s.name }])
  );

  // Process rows
  const seenIds = new Set<string>();
  const unknownHubs = new Map<string, number>(); // code → count
  const hubBreakdown = new Map<string, { name: string; count: number }>();
  const sessions: {
    id: string; stationId: string; vehicleType: string;
    chargingMinutes: number; rangeKm: number;
    energyKwh: null; costKes: number | null; date: Date; createdAt: Date;
  }[] = [];

  let skippedDuplicate = 0;
  let skippedNoStation = 0;
  let skippedBadDate = 0;
  let firstDate: string | null = null;
  let lastDate: string | null = null;

  for (const row of rows) {
    const serviceId = row['service_id']?.trim();
    if (!serviceId) continue;

    // Deduplicate
    if (seenIds.has(serviceId)) { skippedDuplicate++; continue; }
    seenIds.add(serviceId);

    // Resolve station
    const projectCode = row['pickupLocationProjectCode']?.trim() ?? '';
    const station = stationMap.get(projectCode);
    if (!station) {
      skippedNoStation++;
      unknownHubs.set(projectCode, (unknownHubs.get(projectCode) ?? 0) + 1);
      continue;
    }

    // Parse date
    const rawDate = row['paymentDate']?.trim() ?? '';
    const sessionDate = parseTs(rawDate);
    if (!sessionDate) { skippedBadDate++; continue; }

    const dateStr = sessionDate.toISOString().substring(0, 10);
    if (!firstDate || dateStr < firstDate) firstDate = dateStr;
    if (!lastDate || dateStr > lastDate) lastDate = dateStr;

    // Parse fields
    const durationH = parseFloat(row['duration'] ?? '0') || 0;
    const chargingMinutes = Math.max(0, Math.round(durationH * 60));
    const totalFee = row['totalFee']?.trim();
    const costKes = totalFee ? (parseFloat(totalFee) || null) : null;

    // Hub breakdown
    const prev = hubBreakdown.get(station.id);
    hubBreakdown.set(station.id, { name: station.name, count: (prev?.count ?? 0) + 1 });

    sessions.push({
      id: serviceId,
      stationId: station.id,
      vehicleType: 'motorcycle',
      chargingMinutes,
      rangeKm: 0,
      energyKwh: null,
      costKes,
      date: sessionDate,
      createdAt: sessionDate,
    });
  }

  // Batch insert using createMany with skipDuplicates
  const BATCH = 500;
  let inserted = 0;
  for (let i = 0; i < sessions.length; i += BATCH) {
    const result = await db.chargingSession.createMany({
      data: sessions.slice(i, i + BATCH),
      skipDuplicates: true,
    });
    inserted += result.count;
  }

  const skippedDbDuplicate = sessions.length - inserted;
  const totalSkipped = skippedDuplicate + skippedNoStation + skippedBadDate + skippedDbDuplicate;
  const durationMs = Date.now() - start;

  // Build details JSON
  const details = JSON.stringify({
    dateRange: { from: firstDate, to: lastDate },
    hubBreakdown: Object.fromEntries(
      [...hubBreakdown.entries()].map(([id, v]) => [v.name, v.count])
    ),
    unknownHubs: unknownHubs.size > 0
      ? Object.fromEntries([...unknownHubs.entries()])
      : null,
    skippedDuplicate,
    skippedNoStation,
    skippedBadDate,
    skippedDbDuplicate,
    totalRows: rows.length,
  });

  // Log to SyncLog
  await db.syncLog.create({
    data: {
      source: 'csv_sessions',
      status: skippedNoStation > 0 ? 'partial' : 'success',
      created: inserted,
      updated: 0,
      unchanged: skippedDbDuplicate,
      errors: skippedNoStation,
      details,
      fileName,
      triggerBy: adminSession.user?.email ?? 'admin',
      durationMs,
    },
  });

  return NextResponse.json({
    success: true,
    fileName,
    totalRows: rows.length,
    inserted,
    skipped: {
      csvDuplicate: skippedDuplicate,
      noStation: skippedNoStation,
      badDate: skippedBadDate,
      dbDuplicate: skippedDbDuplicate,
      total: totalSkipped,
    },
    dateRange: { from: firstDate, to: lastDate },
    hubBreakdown: Object.fromEntries(
      [...hubBreakdown.entries()].map(([, v]) => [v.name, v.count])
    ),
    unknownHubs: unknownHubs.size > 0
      ? Object.fromEntries([...unknownHubs.entries()])
      : null,
    durationMs,
  });
}
