import { db } from './db';
import * as XLSX from 'xlsx';

export interface SyncResult {
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

export async function syncWorkbook(workbook: XLSX.WorkBook, source: string, fileName = ''): Promise<SyncResult> {
  const sheetNames = workbook.SheetNames;
  const result: SyncResult = {
    message: 'Sync completed',
    file: fileName,
    source,
    sheets: sheetNames,
    summary: { created: 0, updated: 0, unchanged: 0, errors: 0, changes: [] },
    timestamp: new Date().toISOString(),
  };

  // Reset construction statuses only if we are syncing the main Locations Database
  const isMainDatabase = sheetNames.includes('Live data') || sheetNames.some(n => /^RH\s*-/i.test(n)) || sheetNames.some(n => /^RP\s*-/i.test(n));
  if (isMainDatabase) {
    try {
      await db.chargingStation.updateMany({
        where: { type: { in: ['hub', 'point'] }, status: 'construction' },
        data: { status: 'planned' }
      });
    } catch (err) {
      console.error('Failed to reset construction statuses:', err);
    }
  }
  // 1. Live data sheet (Locations Database workbook)
  if (sheetNames.includes('Live data')) {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets['Live data']);
    await processLiveData(rows, result);
  }

  // 2. RH - KE / RP - KE / RK - KE - NBI sheets (multi-row headers)
  const rhSheet = sheetNames.find(n => /^RH\s*-/.test(n));
  const rpSheet = sheetNames.find(n => /^RP\s*-/.test(n));
  const rkSheet = sheetNames.find(n => /^RK\s*-/.test(n));
  if (rhSheet) await processMultiRowSheet(workbook.Sheets[rhSheet], 'hub', 'Roam Charger ID', result);
  if (rpSheet) await processMultiRowSheet(workbook.Sheets[rpSheet], 'point', 'Roam Charge Station ID', result);
  if (rkSheet) await processMultiRowSheet(workbook.Sheets[rkSheet], 'kiosk', 'Roam Charger ID', result);

  // 3. SITES sheet (pipeline / prospective data)
  if (sheetNames.includes('SITES')) {
    const sitesRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets['SITES']);
    await processSitesSheet(sitesRows, result);
  }

  // 3.1 TBD sheet (site tracker checklists)
  if (sheetNames.includes('TBD')) {
    const tbdRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets['TBD']);
    await processTbdSheet(tbdRows, result);
  }

  // 4. Legacy RP/RH detection (simple single-row headers)
  const hasLegacyRP = !rpSheet && sheetNames.some(n => n.includes('RP'));
  const hasLegacyRH = !rhSheet && sheetNames.some(n => n.includes('RH'));
  if (hasLegacyRP) {
    const name = sheetNames.find(n => n.includes('RP'))!;
    await processRoamPoints(XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[name]), result);
  }
  if (hasLegacyRH) {
    const name = sheetNames.find(n => n.includes('RH'))!;
    await processRoamHubs(XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[name]), result);
  }

  // 5. Auto-detect generic sheets with charging data
  const handled = new Set(['Live data', rhSheet, rpSheet, rkSheet, 'SITES'].filter(Boolean));
  if (!handled.size || (!sheetNames.includes('Live data') && !rhSheet && !rpSheet && !rkSheet && !sheetNames.includes('SITES'))) {
    for (const name of sheetNames) {
      if (['CONFIG', 'LOOKUPS', 'AGENTS', 'MULTI SITES PARTNERS', 'TBD', 'Leads', 'Scheduled Site Visit'].includes(name)) continue;
      if (handled.has(name)) continue;
      const sheet = workbook.Sheets[name];
      if (!sheet) continue;
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
      if (rows.length > 0) {
        const keys = Object.keys(rows[0]);
        if (keys.some(k => /charger|station|site|point|hub/i.test(k))) {
          await processGenericSheet(rows, result, name);
        }
      }
    }
  }

  await postSyncCleanup();

  return result;
}

// ─── Status Mapping Helper ───────────────────────────────────────────────────
function parseStatus(raw: string | null, defaultStatus = 'planned'): string {
  if (!raw) return defaultStatus;
  const s = raw.toLowerCase();
  if (['operational', 'active', 'live'].some(k => s.includes(k))) return 'operational';
  if (['construction', 'install'].some(k => s.includes(k))) return 'construction';
  if (['blocked', 'stalled'].some(k => s.includes(k))) return 'blocked';
  if (['archived', 'closed', 'cancelled', 'rejected'].some(k => s.includes(k))) return 'archived';
  if (['planned', 'coming', 'approved', 'new', 'upcoming'].some(k => s.includes(k))) return 'planned';
  return defaultStatus;
}

/**
 * Option D — Smart status rule (no hardcoded whitelist).
 * A hub is operational if the sheet says Operational AND the launch date is today or past.
 * If no launch date, trust the sheet directly (covers pre-existing hubs without dates).
 * Admin statusOverride always takes full precedence — checked at write time.
 */
function computeSmartStatus(
  type: string,
  rawStatus: string,
  launchDate: Date | null
): string {
  if (type !== 'hub') return rawStatus; // only smart-rule for hubs
  if (rawStatus !== 'operational') return rawStatus; // non-operational → pass through
  // Hub says Operational in sheet
  if (!launchDate) return 'operational'; // no date → trust the sheet
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return launchDate <= today ? 'operational' : 'construction'; // future date → not yet open
}

/** Apply admin override if one is set, else return the computed status */
function applyOverride(statusOverride: string | null | undefined, computedStatus: string): string {
  return statusOverride ?? computedStatus;
}

// ─── Live Data Sheet Parser ──────────────────────────────────────────────────
async function processLiveData(rows: Record<string, unknown>[], result: SyncResult) {
  for (const row of rows) {
    try {
      const chargerId = extractString(row, ['code']);
      if (!chargerId) continue;
      const name = extractString(row, ['station']) ?? chargerId;
      const lat = extractNumber(row, ['latitude', 'Latitude']);
      const lng = extractNumber(row, ['longitude', 'Longitude']);
      const type = chargerId.startsWith('#RH') ? 'hub' : 'point';
      const rawServices = extractString(row, ['services']) ?? '';
      const services: string[] = [];
      if (/charg/i.test(rawServices)) services.push('charging');
      if (/rental/i.test(rawServices)) services.push('rental');
      if (services.length === 0) services.push('charging');
      const openTime = extractString(row, ['openTime']);
      const closeTime = extractString(row, ['closeTime']);

      const existing = await db.chargingStation.findUnique({ where: { chargerId } });
      const smartStatus = computeSmartStatus(type, type === 'hub' ? 'planned' : 'operational', null);
      const status = applyOverride(existing?.statusOverride, smartStatus);
      const data = {
        name, type, status,
        address: name,
        neighborhood: 'Nairobi',
        latitude: lat, longitude: lng,
        services: JSON.stringify(services),
        operatingHours: openTime && closeTime ? `${openTime} - ${closeTime}` : undefined,
        managerPhone: extractString(row, ['phone Number', 'phone']) ?? undefined,
      };

      if (existing) {
        const changes = detectChanges(existing, data);
        if (changes.length > 0) {
          await db.chargingStation.update({ where: { chargerId }, data });
          result.summary.updated++;
          changes.forEach(c => {
            result.summary.changes.push({
              action: 'updated',
              chargerId,
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
        await db.chargingStation.create({ data: { chargerId, ...data } });
        result.summary.created++;
        result.summary.changes.push({ action: 'created', chargerId, name });
      }
    } catch {
      result.summary.errors++;
    }
  }
}

// ─── Multi-Row Header Sheet Parser (RP - KE / RH - KE / RK - KE - NBI) ───────
async function processMultiRowSheet(
  sheet: XLSX.WorkSheet,
  type: 'hub' | 'point' | 'kiosk',
  idColumn: string,
  result: SyncResult
) {
  const allRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 }) as unknown[][];
  if (allRows.length < 3) return;
  const colNames = (allRows[1] as unknown[]).map(c => (c != null ? String(c).trim() : ''));

  function get(row: unknown[], ...keys: string[]): string | null {
    for (const key of keys) {
      const idx = colNames.indexOf(key);
      if (idx >= 0 && row[idx] != null && String(row[idx]).trim() !== '') return String(row[idx]).trim();
    }
    return null;
  }

  for (let i = 2; i < allRows.length; i++) {
    const row = allRows[i] as unknown[];
    try {
      const chargerId = get(row, idColumn, 'Roam Charger ID', 'Roam Charge Station ID');
      if (!chargerId) continue;
      const normalizedId = chargerId.startsWith('#') ? chargerId : `#${chargerId}`;

      // Check if it's an empty pre-allocated template row
      const rawName = get(row, 'Site Name', 'Station Name');
      const coordRaw = get(row, 'Coordinate');
      const statusRaw = get(row, 'Status');
      const phone = get(row, 'Phone Number');
      const siteManager = get(row, 'Full Name');

      const isTemplateName = !rawName || /^Roam\s+(Hub|Point|Kiosk)\s*-\s*$/i.test(rawName.trim());
      const isEmptyTemplate = isTemplateName && !coordRaw && !statusRaw && !phone && !siteManager;

      // Purge/Self-healing: Delete empty template rows if they exist in the database
      if (isEmptyTemplate) {
        await db.chargingStation.deleteMany({ where: { chargerId: normalizedId } });
        continue;
      }

      const name = rawName ?? `${type === 'hub' ? 'Roam Hub' : type === 'kiosk' ? 'Roam Kiosk' : 'Roam Point'} - ${chargerId}`;

      let lat: number | null = null, lng: number | null = null;
      if (coordRaw) {
        const parts = coordRaw.split(',');
        if (parts.length === 2) {
          lat = parseFloat(parts[0]);
          lng = parseFloat(parts[1]);
        }
        if (isNaN(lat!) || isNaN(lng!)) {
          lat = null;
          lng = null;
        }
      }

      // Fallback coordinates for kiosks since their sheet has empty coordinate columns
      if (type === 'kiosk' && (!lat || !lng)) {
        const lowerName = name.toLowerCase();
        if (lowerName.includes('jogoo road')) {
          lat = -1.292109;
          lng = 36.843321;
        } else if (lowerName.includes('lavington')) {
          lat = -1.279364;
          lng = 36.770414;
        } else if (lowerName.includes('kawangware')) {
          lat = -1.287923;
          lng = 36.741585;
        } else if (lowerName.includes('ruaraka')) {
          lat = -1.227694;
          lng = 36.883355;
        }
      }

      // Parse the launch date from the sheet
      // Excel stores dates as serial numbers (e.g. 44931 = Jan 5 2023).
      // get() always returns a string, so we must detect and convert serials manually.
      const launchDateRaw = get(row, 'Launch Date');
      let launchDate: Date | null = null;
      if (launchDateRaw) {
        const numVal = parseFloat(launchDateRaw);
        if (!isNaN(numVal) && numVal > 25569 && numVal < 60000) {
          // Looks like an Excel serial (25569 = Jan 1 1970, 60000 = ~2064)
          const parsed = new Date((numVal - 25569) * 86400 * 1000);
          if (!isNaN(parsed.getTime())) launchDate = parsed;
        } else {
          // Try as a regular date string (e.g. "16/01/2025", "2025-01-16")
          // Normalise DD/MM/YYYY → YYYY-MM-DD for reliable parsing
          const normalised = launchDateRaw.replace(
            /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, '$3-$2-$1'
          );
          const parsed = new Date(normalised);
          if (!isNaN(parsed.getTime()) && parsed.getFullYear() >= 2020 && parsed.getFullYear() <= 2035) {
            launchDate = parsed;
          }
        }
      }

      const existing = await db.chargingStation.findUnique({ where: { chargerId: normalizedId } });
      const rawParsedStatus = parseStatus(statusRaw, 'planned');
      const smartStatus = computeSmartStatus(type, rawParsedStatus, launchDate);
      const status = applyOverride(existing?.statusOverride, smartStatus);
      const stationName = get(row, 'Station Name', 'Site Name') ?? name;
      const area = get(row, 'Area', 'Site Name') ?? 'Nairobi';
      let chargerCount = 0;
      if (type === 'point') {
        const socket = parseInt(get(row, 'Socket v1.2') ?? '0') || 0;
        const type6_3p = parseInt(get(row, '6kW DC 1xType 6 3P') ?? '0') || 0;
        const type6_1p = parseInt(get(row, '6kW DC 2xType 6 1P') ?? '0') || 0;
        chargerCount = socket + type6_3p + type6_1p;
        if (chargerCount === 0) {
          chargerCount = 1; // Fallback
        }
      } else {
        chargerCount = parseInt(get(row, 'Total') ?? '0') || (type === 'kiosk' ? 4 : 0);
      }

      const totalKw = parseFloat(get(row, 'Total kW') ?? '0') || (type === 'point' ? chargerCount * 6 : 0);

      const servicesArr = type === 'hub' 
        ? ['charging', 'rental'] 
        : type === 'kiosk' 
          ? ['rental'] 
          : ['charging'];

      const data = {
        name, type, status,
        address: stationName,
        neighborhood: area,
        partner: get(row, 'Partner') ?? undefined,
        siteManager: siteManager ?? undefined,
        managerPhone: phone ? String(phone) : undefined,
        dynamicsCode: get(row, 'Dynamics Project Code') ?? undefined,
        chargerCount,
        totalKw,
        latitude: lat, longitude: lng,
        services: JSON.stringify(servicesArr),
        launchDate,
      };

      if (existing) {
        const changes = detectChanges(existing, data);
        if (changes.length > 0) {
          await db.chargingStation.update({ where: { chargerId: normalizedId }, data });
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
        await db.chargingStation.create({ data: { chargerId: normalizedId, ...data } });
        result.summary.created++;
        result.summary.changes.push({ action: 'created', chargerId: normalizedId, name });
      }
    } catch (e) {
      console.error('Row error:', e);
      result.summary.errors++;
    }
  }
}

// ─── Single-Row Roam Points (Legacy Sheet Parser) ────────────────────────────
async function processRoamPoints(rows: Record<string, unknown>[], result: SyncResult) {
  for (const row of rows) {
    try {
      const chargerId = extractString(row, ['Charger ID', 'charger_id', 'ID', 'Site ID', 'chargerId']);
      if (!chargerId) continue;
      const normalizedId = chargerId.startsWith('#') ? chargerId : `#${chargerId}`;

      const rawName = extractString(row, ['Site Name', 'Name', 'Site', 'name', 'site_name']);
      const lat = extractNumber(row, ['Latitude', 'lat', 'Lat']);
      const lng = extractNumber(row, ['Longitude', 'lng', 'Lon']);
      const statusRaw = extractString(row, ['Status', 'status', 'state']);
      const phone = extractString(row, ['Phone', 'Contact', 'phone', 'contact_number']);
      const siteManager = extractString(row, ['Site Manager', 'Contact Person', 'Manager', 'site_manager']);

      const isTemplateName = !rawName || /^Roam\s+(Hub|Point|Kiosk)\s*-\s*$/i.test(rawName.trim());
      // Skip empty template rows
      if (isTemplateName && lat === null && lng === null && !statusRaw && !phone && !siteManager) {
        continue;
      }

      const name = rawName || `Roam Point - ${chargerId}`;
      const address = extractString(row, ['Address', 'Location', 'address', 'location']);
      const neighborhood = extractString(row, ['Neighborhood', 'Area', 'Landmark', 'neighborhood']);
      const smartStatus = computeSmartStatus('point', parseStatus(statusRaw, 'planned'), null);
      const existing2 = await db.chargingStation.findUnique({ where: { chargerId: normalizedId } });
      const status = applyOverride(existing2?.statusOverride, smartStatus);

      const partner = extractString(row, ['Partner', 'Host', 'Partner Name', 'partner', 'host_name']);
      const connectorType = extractString(row, ['Connector', 'connector_type', 'Type']);
      const powerOutput = extractNumber(row, ['Power', 'kW', 'power_output', 'Output']);
      const chargerCount = extractNumber(row, ['Chargers', 'charger_count', 'No. Chargers'], 1);
      const totalKw = extractNumber(row, ['Total kW', 'total_kw', 'Total Power'], 6);
      const notes = extractString(row, ['Notes', 'Comment', 'Remarks', 'notes', 'comments']);
      const operatingHours = extractString(row, ['Hours', 'operating_hours', 'Operating Hours']);

      // existing already fetched above for override check
      const existing = existing2;

      const data = {
        name,
        type: 'point',
        status,
        address: address || name,
        neighborhood: neighborhood || 'Nairobi',
        latitude: lat,
        longitude: lng,
        chargerCount: chargerCount || 1,
        totalKw: totalKw || 6,
        connectorType: connectorType || 'Type 6',
        powerOutputKw: powerOutput !== null ? powerOutput : undefined,
        partner: partner || undefined,
        siteManager: siteManager || undefined,
        managerPhone: phone || undefined,
        services: JSON.stringify(['charging']),
        operatingHours: operatingHours || undefined,
        notes: notes || undefined,
      };

      if (existing) {
        const changes = detectChanges(existing, data);
        if (changes.length > 0) {
          await db.chargingStation.update({ where: { chargerId: normalizedId }, data });
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
        await db.chargingStation.create({ data: { chargerId: normalizedId, ...data } });
        result.summary.created++;
        result.summary.changes.push({ action: 'created', chargerId: normalizedId, name });
      }
    } catch (error) {
      console.error('Error processing legacy row:', error);
      result.summary.errors++;
    }
  }
}

// ─── Single-Row Roam Hubs (Legacy Sheet Parser) ─────────────────────────────
async function processRoamHubs(rows: Record<string, unknown>[], result: SyncResult) {
  for (const row of rows) {
    try {
      const chargerId = extractString(row, ['Charger ID', 'charger_id', 'ID', 'Site ID', 'Hub ID']);
      if (!chargerId) continue;
      const normalizedId = chargerId.startsWith('#') ? chargerId : `#${chargerId}`;

      const rawName = extractString(row, ['Site Name', 'Name', 'Hub Name', 'name']);
      const lat = extractNumber(row, ['Latitude', 'lat', 'Lat']);
      const lng = extractNumber(row, ['Longitude', 'lng', 'Lng']);
      const statusRaw = extractString(row, ['Status', 'status']);
      const phone = extractString(row, ['Phone', 'Contact', 'phone']);
      const siteManager = extractString(row, ['Site Manager', 'Manager', 'site_manager']);

      const isTemplateName = !rawName || /^Roam\s+(Hub|Point|Kiosk)\s*-\s*$/i.test(rawName.trim());
      // Skip empty template rows
      if (isTemplateName && lat === null && lng === null && !statusRaw && !phone && !siteManager) {
        continue;
      }

      const name = rawName || `Roam Hub - ${chargerId}`;
      const address = extractString(row, ['Address', 'Location', 'address']);
      const neighborhood = extractString(row, ['Neighborhood', 'Area', 'Landmark']);

      const existing = await db.chargingStation.findUnique({ where: { chargerId: normalizedId } });
      const smartStatus = computeSmartStatus('hub', parseStatus(statusRaw, 'planned'), null);
      const status = applyOverride(existing?.statusOverride, smartStatus);

      const chargerCount = extractNumber(row, ['Chargers', 'charger_count', 'No. Chargers'], 0);
      const totalKw = extractNumber(row, ['Total kW', 'total_kw', 'Total Power'], 0);
      const partner = extractString(row, ['Partner', 'Host', 'partner']);
      const notes = extractString(row, ['Notes', 'Remarks', 'notes']);
      const operatingHours = extractString(row, ['Hours', 'operating_hours']);
      const solarPowered = extractString(row, ['Solar', 'solar'])?.toLowerCase() === 'yes';
      const dynamicsCode = extractString(row, ['Dynamics Code', 'dynamics_code', 'FO Code']);
      const city = extractString(row, ['City', 'city']) || 'Nairobi';

      const data = {
        name,
        type: 'hub',
        status,
        address: address || name,
        neighborhood: neighborhood || 'Nairobi',
        city: city || 'Nairobi',
        latitude: lat,
        longitude: lng,
        chargerCount: chargerCount || 0,
        totalKw: totalKw || 0,
        partner: partner || undefined,
        siteManager: siteManager || undefined,
        managerPhone: phone || undefined,
        services: JSON.stringify(['charging', 'rental']),
        operatingHours: operatingHours || undefined,
        solarPowered: solarPowered || false,
        dynamicsCode: dynamicsCode || undefined,
        notes: notes || undefined,
      };

      if (existing) {
        const changes = detectChanges(existing, data);
        if (changes.length > 0) {
          await db.chargingStation.update({ where: { chargerId: normalizedId }, data });
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
        await db.chargingStation.create({ data: { chargerId: normalizedId, ...data } });
        result.summary.created++;
        result.summary.changes.push({ action: 'created', chargerId: normalizedId, name });
      }
    } catch (error) {
      console.error('Error processing legacy hub row:', error);
      result.summary.errors++;
    }
  }
}

// ─── SITES Sheet Parser (from Motorcycle Charging Sites) ─────────────────────
async function processSitesSheet(rows: Record<string, unknown>[], result: SyncResult) {
  for (const row of rows) {
    try {
      const siteId = extractString(row, ['Site_ID', 'Site ID', 'site_id']);
      if (!siteId) continue;

      const landmark = extractString(row, ['Landmark', 'Site Name']) ?? 'Unknown Landmark';
      const neighborhood = extractString(row, ['County', 'Neighborhood', 'Area']) ?? 'Nairobi';
      const city = extractString(row, ['County', 'City']) ?? 'Nairobi';
      const lat = extractNumber(row, ['Latitude', 'lat', 'Lat']);
      const lng = extractNumber(row, ['Longitude', 'lng', 'Lng']);
      const estimatedPoints = extractNumber(row, ['Estimated_Charging_Points', 'Estimated Points'], 1) || 1;
      const electricityAccess = extractString(row, ['Electricity_Access', 'Electricity Access']) ?? 'Easy';
      const landlordType = extractString(row, ['Landlord_Type', 'Landlord Type']) ?? 'Other';
      const bikeTraffic = extractString(row, ['Bike_Traffic', 'Bike Traffic']) ?? 'Medium';
      const securityLevel = extractString(row, ['Security_Level', 'Security Level']) ?? 'Medium';
      const priorityScore = extractNumber(row, ['Priority_Score', 'Priority Score'], 0) || 0;
      const priorityBucket = extractString(row, ['Priority_Bucket', 'Priority Bucket']) ?? 'P2 - Medium';
      const statusRaw = extractString(row, ['Status', 'status']);
      const status = statusRaw ? statusRaw.toLowerCase() : 'new';

      const agentName = extractString(row, ['Found_By_Name', 'Agent Name', 'BD_Owner']);
      const agentType = extractString(row, ['Found_By_Type', 'Agent Type']) ?? 'Agent';
      const partnerName = extractString(row, ['Site_Responsible_Name', 'Partner Name', 'Site Manager']);
      const partnerPhone = extractString(row, ['Site_Responsible_Phone', 'Partner Phone', 'Phone']);
      const partnerEmail = extractString(row, ['Site_Responsible_Email', 'Partner Email', 'Email']);
      const mountType = extractString(row, ['Site_Type', 'Mount Type']);
      const deploymentPhase = extractString(row, ['Deployment_Phase', 'Deployment Phase']);
      const deploymentCost = extractNumber(row, ['Deployment_Cost_KES', 'Cost']);
      const monthlyRent = extractNumber(row, ['Monthly_Rent_KES', 'Rent']);
      const rawComment = extractString(row, ['Agent_Comment', 'Comment', 'Internal_Notes']);

      const existing = await db.pipelineSite.findUnique({ where: { siteId } });

      let commentObj = {
        comment: rawComment ?? '',
        checklist: {
          agreement: 'Pending',
          consent: 'Pending',
          titleDeed: 'Pending',
          rentAgreed: 'Pending'
        }
      };

      if (existing && existing.agentComment) {
        try {
          const parsed = JSON.parse(existing.agentComment);
          if (parsed && typeof parsed === 'object') {
            commentObj.checklist = parsed.checklist || commentObj.checklist;
            if (rawComment) commentObj.comment = rawComment;
          }
        } catch {
          commentObj.comment = existing.agentComment;
        }
      }

      const agentComment = JSON.stringify(commentObj);

      const data = {
        landmark,
        neighborhood,
        city,
        latitude: lat,
        longitude: lng,
        estimatedPoints,
        electricityAccess,
        landlordType,
        bikeTraffic,
        securityLevel,
        priorityScore,
        priorityBucket,
        status,
        agentName,
        agentType,
        partnerName,
        partnerPhone: partnerPhone ? String(partnerPhone) : undefined,
        partnerEmail,
        mountType,
        deploymentPhase,
        deploymentCost,
        monthlyRent,
        agentComment,
      };

      if (existing) {
        await db.pipelineSite.update({ where: { siteId }, data });
        result.summary.updated++;
      } else {
        await db.pipelineSite.create({ data: { siteId, ...data } });
        result.summary.created++;
        result.summary.changes.push({ action: 'created', chargerId: siteId, name: landmark });
      }
    } catch (error) {
      console.error('Error in SITES parser:', error);
      result.summary.errors++;
    }
  }
}

// ─── TBD Sheet Parser (from Roam Point Site Tracker) ─────────────────────────
async function processTbdSheet(rows: Record<string, unknown>[], result: SyncResult) {
  function normalizePhone(p: string | null | undefined): string | null {
    if (!p) return null;
    const digits = p.replace(/\D/g, '');
    return digits.length >= 9 ? digits.slice(-9) : digits;
  }

  for (const row of rows) {
    try {
      const siteName = extractString(row, ['Site Name', 'Site_Name']);
      if (!siteName) continue;

      const partnerPhoneRaw = extractString(row, ['Partner Phone', 'Partner_Phone', 'Contact']);
      const partnerPhoneNorm = normalizePhone(partnerPhoneRaw);

      const coordRaw = extractString(row, ['GPS Coordinates', 'GPS_Coordinates', 'Coordinate']);
      let lat: number | null = null, lng: number | null = null;
      if (coordRaw) {
        const parts = coordRaw.split(',');
        if (parts.length === 2) {
          lat = parseFloat(parts[0]);
          lng = parseFloat(parts[1]);
        }
      }

      const colAgreement = extractString(row, ['Collaboration Agreement', 'Collaboration_Agreement']);
      const colConsent = extractString(row, ['Consent Letter', 'Consent_Letter']);
      const colTitle = extractString(row, ['Title Deed', 'Proof of Ownership/Lease', 'Title_Deed']);
      const colRent = extractString(row, ['Agreed to Commercials', 'Agreed_to_Commercials']);

      let match: any = null;

      if (partnerPhoneNorm) {
        match = await db.pipelineSite.findFirst({
          where: {
            partnerPhone: {
              endsWith: partnerPhoneNorm
            }
          }
        });
      }

      if (!match && lat && lng) {
        match = await db.pipelineSite.findFirst({
          where: {
            latitude: { gte: lat - 0.002, lte: lat + 0.002 },
            longitude: { gte: lng - 0.002, lte: lng + 0.002 }
          }
        });
      }

      if (!match) {
        match = await db.pipelineSite.findFirst({
          where: {
            landmark: {
              contains: siteName,
              mode: 'insensitive'
            }
          }
        });
      }

      if (match) {
        let currentComment = '';
        let currentChecklist = {
          agreement: 'Pending',
          consent: 'Pending',
          titleDeed: 'Pending',
          rentAgreed: 'Pending'
        };

        if (match.agentComment) {
          try {
            const parsed = JSON.parse(match.agentComment);
            currentComment = parsed.comment ?? '';
            currentChecklist = parsed.checklist ?? currentChecklist;
          } catch {
            currentComment = match.agentComment;
          }
        }

        function parseChecklistStatus(val: string | null): string {
          if (!val) return 'Pending';
          const v = val.toLowerCase().trim();
          if (v === 'yes' || v === 'signed' || v === 'collected' || v === 'y' || v === 'done' || v === 'true') return 'Signed';
          if (v === 'no' || v === 'pending' || v === 'n' || v === 'false') return 'Pending';
          return val;
        }

        const checklist = {
          agreement: parseChecklistStatus(colAgreement) !== 'Pending' ? parseChecklistStatus(colAgreement) : currentChecklist.agreement,
          consent: parseChecklistStatus(colConsent) !== 'Pending' ? parseChecklistStatus(colConsent) : currentChecklist.consent,
          titleDeed: parseChecklistStatus(colTitle) !== 'Pending' ? parseChecklistStatus(colTitle) : currentChecklist.titleDeed,
          rentAgreed: parseChecklistStatus(colRent) !== 'Pending' ? parseChecklistStatus(colRent) : currentChecklist.rentAgreed
        };

        const agentComment = JSON.stringify({
          comment: currentComment,
          checklist
        });

        await db.pipelineSite.update({
          where: { id: match.id },
          data: {
            agentComment,
            mountType: extractString(row, ['Mount Type']) ?? match.mountType,
            partnerEmail: extractString(row, ['Partner Email']) ?? match.partnerEmail,
          }
        });

        result.summary.updated++;
      } else {
        const siteId = `SITE-TBD-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
        const checklist = {
          agreement: colAgreement ? colAgreement : 'Pending',
          consent: colConsent ? colConsent : 'Pending',
          titleDeed: colTitle ? colTitle : 'Pending',
          rentAgreed: colRent ? colRent : 'Pending'
        };

        const agentComment = JSON.stringify({
          comment: `Imported from TBD tracker.`,
          checklist
        });

        await db.pipelineSite.create({
          data: {
            siteId,
            landmark: siteName,
            neighborhood: extractString(row, ['Region']) ?? 'Nairobi',
            latitude: lat,
            longitude: lng,
            electricityAccess: 'Easy',
            landlordType: extractString(row, ['Location Type']) ?? 'Other',
            bikeTraffic: 'Medium',
            securityLevel: 'Medium',
            status: 'approved',
            partnerName: extractString(row, ['Partner Name']),
            partnerPhone: partnerPhoneRaw,
            partnerEmail: extractString(row, ['Partner Email']),
            mountType: extractString(row, ['Mount Type']),
            agentComment,
            priorityBucket: 'P2 - Medium',
          }
        });
        result.summary.created++;
      }
    } catch (e) {
      console.error('TBD row error:', e);
      result.summary.errors++;
    }
  }
}

// ─── Generic Sheet Parser ────────────────────────────────────────────────────
async function processGenericSheet(rows: Record<string, unknown>[], result: SyncResult, sheetName: string) {
  for (const row of rows) {
    try {
      const chargerId = extractString(row, ['Charger ID', 'ID', 'Site ID', 'charger_id']);
      if (!chargerId) continue;
      const normalizedId = chargerId.startsWith('#') ? chargerId : `#${chargerId}`;

      const rawName = extractString(row, ['Name', 'Site Name', 'station']);
      const lat = extractNumber(row, ['Latitude', 'lat', 'Lat']);
      const lng = extractNumber(row, ['Longitude', 'lng', 'Lng']);

      const isTemplateName = !rawName || /^Roam\s+(Hub|Point|Kiosk)\s*-\s*$/i.test(rawName.trim());
      // Skip empty template rows
      if (isTemplateName && lat === null && lng === null) {
        continue;
      }

      const name = rawName || `${sheetName} - ${chargerId}`;
      const address = extractString(row, ['Address', 'Location']);
      const neighborhood = extractString(row, ['Neighborhood', 'Area']);

      const existing = await db.chargingStation.findUnique({ where: { chargerId: normalizedId } });

      const data = {
        name,
        type: 'point',
        status: 'planned',
        address: address || name,
        neighborhood: neighborhood || 'Nairobi',
        latitude: lat,
        longitude: lng,
        services: JSON.stringify(['charging']),
      };

      if (existing) {
        const changes = detectChanges(existing, data);
        if (changes.length > 0) {
          await db.chargingStation.update({ where: { chargerId: normalizedId }, data });
          result.summary.updated++;
        } else {
          result.summary.unchanged++;
        }
      } else {
        await db.chargingStation.create({ data: { chargerId: normalizedId, ...data } });
        result.summary.created++;
        result.summary.changes.push({ action: 'created', chargerId: normalizedId, name });
      }
    } catch {
      result.summary.errors++;
    }
  }
}

// ─── Inner Helpers ───────────────────────────────────────────────────────────
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
    'name', 'type', 'status', 'address', 'neighborhood', 'latitude', 'longitude',
    'chargerCount', 'totalKw', 'connectorType', 'powerOutputKw', 'partner',
    'siteManager', 'managerPhone', 'notes', 'operatingHours', 'launchDate',
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

// ─── Post-Sync Cleanup & Status Adjustments ──────────────────────────────────
async function postSyncCleanup() {
  // Disabled status override to ensure point station statuses align strictly with the Locations Database Excel source of truth.
}

function findActiveStationMatch(site: any, stations: any[]) {
  const normalizePhone = (p: string | null | undefined): string | null => {
    if (!p) return null;
    const digits = p.replace(/\D/g, '');
    return digits.length >= 9 ? digits.slice(-9) : digits;
  };

  const sitePhoneNorm = normalizePhone(site.partnerPhone);

  return stations.find(s => {
    // 1. Phone match
    if (sitePhoneNorm && s.managerPhone) {
      const stationPhoneNorm = normalizePhone(s.managerPhone);
      if (stationPhoneNorm === sitePhoneNorm) return true;
    }

    // 2. Dynamics code / ID match
    if (s.dynamicsCode && s.dynamicsCode.includes(site.siteId)) return true;
    if (s.chargerId && s.chargerId.includes(site.siteId)) return true;

    // 3. Proximity match (within 250m)
    if (site.latitude && site.longitude && s.latitude && s.longitude) {
      const latDiff = Math.abs(site.latitude - s.latitude);
      const lngDiff = Math.abs(site.longitude - s.longitude);
      if (latDiff < 0.002 && lngDiff < 0.002) return true;
    }

    // 4. Name match
    if (s.name && site.landmark && (
      s.name.toLowerCase().includes(site.landmark.toLowerCase()) ||
      site.landmark.toLowerCase().includes(s.name.toLowerCase())
    )) {
      return true;
    }

    return false;
  });
}

