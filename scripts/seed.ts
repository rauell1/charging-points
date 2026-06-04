import * as XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

function toStr(val: unknown): string | null {
  if (val === undefined || val === null || String(val).trim() === '') return null;
  return String(val).trim();
}

function toNum(val: unknown): number | null {
  if (val === undefined || val === null || val === '') return null;
  const n = typeof val === 'number' ? val : parseFloat(String(val));
  return isNaN(n) ? null : n;
}

function parseStatus(raw: string | null): string {
  if (!raw) return 'operational';
  const s = raw.toLowerCase();
  if (s.includes('operational') || s.includes('active') || s.includes('live')) return 'operational';
  if (s.includes('construction') || s.includes('install')) return 'construction';
  if (s.includes('blocked') || s.includes('stalled')) return 'blocked';
  if (s.includes('archived') || s.includes('closed') || s.includes('cancelled')) return 'archived';
  if (s.includes('planned') || s.includes('coming') || s.includes('upcoming')) return 'planned';
  return 'operational';
}

function parseCoordinate(val: unknown): { lat: number | null; lng: number | null } {
  if (!val) return { lat: null, lng: null };
  const s = String(val).trim();
  // "lat, lng" format
  const parts = s.split(',');
  if (parts.length === 2) {
    const lat = parseFloat(parts[0].trim());
    const lng = parseFloat(parts[1].trim());
    if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
  }
  return { lat: null, lng: null };
}

async function upsertStation(data: {
  chargerId: string;
  name: string;
  type: string;
  status: string;
  address?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  chargerCount?: number;
  totalKw?: number;
  connectorType?: string | null;
  partner?: string | null;
  siteManager?: string | null;
  managerPhone?: string | null;
  services?: string;
  operatingHours?: string | null;
  solarPowered?: boolean;
  dynamicsCode?: string | null;
  notes?: string | null;
}) {
  const id = data.chargerId.startsWith('#') ? data.chargerId : `#${data.chargerId}`;
  const existing = await db.chargingStation.findUnique({ where: { chargerId: id } });
  const payload = { ...data, chargerId: id, services: data.services ?? JSON.stringify(['charging']) };
  if (existing) {
    await db.chargingStation.update({ where: { chargerId: id }, data: payload });
    return 'updated';
  } else {
    await db.chargingStation.create({ data: payload });
    return 'created';
  }
}

async function seedLiveData(wb: XLSX.WorkBook) {
  const sheet = wb.Sheets['Live data'];
  if (!sheet) return { created: 0, updated: 0 };
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
  let created = 0, updated = 0;
  for (const row of rows) {
    const code = toStr(row['code']);
    if (!code) continue;
    const name = toStr(row['station']) ?? code;
    const lat = toNum(row['latitude']);
    const lng = toNum(row['longitude']);
    const type = code.startsWith('#RH') || code.includes('-RH-') ? 'hub' : 'point';
    const servicesRaw = toStr(row['services']) ?? '';
    const servicesArr: string[] = [];
    if (servicesRaw.toLowerCase().includes('charg')) servicesArr.push('charging');
    if (servicesRaw.toLowerCase().includes('rental')) servicesArr.push('rental');
    if (servicesArr.length === 0) servicesArr.push('charging');
    const openTime = toStr(row['openTime']);
    const closeTime = toStr(row['closeTime']);
    const phone = toStr(row['phone Number']);
    const result = await upsertStation({
      chargerId: code,
      name,
      type,
      status: 'operational',
      latitude: lat,
      longitude: lng,
      services: JSON.stringify(servicesArr),
      operatingHours: openTime && closeTime ? `${openTime} - ${closeTime}` : null,
      managerPhone: phone,
    });
    result === 'created' ? created++ : updated++;
  }
  return { created, updated };
}

async function seedRoamHubs(wb: XLSX.WorkBook) {
  const sheet = wb.Sheets['RH - KE'];
  if (!sheet) return { created: 0, updated: 0 };
  // First 2 rows are section headers; actual column names are in row index 1
  const allRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { header: 1 }) as unknown[][];
  if (allRows.length < 3) return { created: 0, updated: 0 };
  const colNames = allRows[1] as string[];
  let created = 0, updated = 0;
  for (let i = 2; i < allRows.length; i++) {
    const rawRow = allRows[i] as unknown[];
    const row: Record<string, unknown> = {};
    colNames.forEach((col, idx) => { if (col) row[col] = rawRow[idx]; });
    const chargerId = toStr(row['Roam Charger ID']);
    if (!chargerId) continue;
    const name = toStr(row['Site Name']) ?? toStr(row['Station Name']) ?? `Roam Hub - ${chargerId}`;
    const coordStr = toStr(row['Coordinate']);
    const { lat, lng } = parseCoordinate(coordStr);
    const result = await upsertStation({
      chargerId,
      name,
      type: 'hub',
      status: parseStatus(toStr(row['Status'])),
      neighborhood: toStr(row['Area']),
      partner: toStr(row['Partner']),
      siteManager: toStr(row['Full Name']),
      managerPhone: toStr(row['Phone Number']),
      dynamicsCode: toStr(row['Dynamics Project Code']),
      latitude: lat,
      longitude: lng,
      services: JSON.stringify(['charging', 'rental']),
    });
    result === 'created' ? created++ : updated++;
  }
  return { created, updated };
}

async function seedRoamPoints(wb: XLSX.WorkBook) {
  const sheet = wb.Sheets['RP - KE'];
  if (!sheet) return { created: 0, updated: 0 };
  const allRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { header: 1 }) as unknown[][];
  if (allRows.length < 3) return { created: 0, updated: 0 };
  const colNames = allRows[1] as string[];
  let created = 0, updated = 0;
  for (let i = 2; i < allRows.length; i++) {
    const rawRow = allRows[i] as unknown[];
    const row: Record<string, unknown> = {};
    colNames.forEach((col, idx) => { if (col) row[col] = rawRow[idx]; });
    const chargerId = toStr(row['Roam Charge Station ID']);
    if (!chargerId) continue;
    const name = toStr(row['Site Name']) ?? toStr(row['Charger Name']) ?? `Roam Point - ${chargerId}`;
    const coordStr = toStr(row['Coordinate']);
    const { lat, lng } = parseCoordinate(coordStr);
    const result = await upsertStation({
      chargerId,
      name,
      type: 'point',
      status: parseStatus(toStr(row['Status'])),
      neighborhood: toStr(row['Area']),
      partner: toStr(row['Partner']),
      siteManager: toStr(row['Full Name']),
      managerPhone: toStr(row['Phone Number']),
      dynamicsCode: toStr(row['Dynamics Project Code']),
      latitude: lat,
      longitude: lng,
      services: JSON.stringify(['charging']),
    });
    result === 'created' ? created++ : updated++;
  }
  return { created, updated };
}

async function main() {
  const locDb = XLSX.readFile('upload/[ROAM] - [Field Operations KE] - Locations Database.xlsx');

  console.log('Seeding from Live data sheet...');
  const live = await seedLiveData(locDb);
  console.log(`  Live data: ${live.created} created, ${live.updated} updated`);

  console.log('Seeding Roam Hubs (RH - KE)...');
  const hubs = await seedRoamHubs(locDb);
  console.log(`  Hubs: ${hubs.created} created, ${hubs.updated} updated`);

  console.log('Seeding Roam Points (RP - KE)...');
  const points = await seedRoamPoints(locDb);
  console.log(`  Points: ${points.created} created, ${points.updated} updated`);

  const total = live.created + hubs.created + points.created;
  const totalUp = live.updated + hubs.updated + points.updated;
  console.log(`\nDone. Total: ${total} created, ${totalUp} updated`);
  await db.$disconnect();
}

main().catch((e) => { console.error(e); db.$disconnect(); process.exit(1); });
