import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    // API key check
    const apiKey = request.headers.get('x-api-key');
    const expectedKey = process.env.SYNC_API_KEY || 'roam-sync-key-2025';

    if (!apiKey || apiKey !== expectedKey) {
      return NextResponse.json(
        { error: 'Invalid or missing API key. Provide x-api-key header.' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Webhook can accept data in flexible formats
    // Format 1: { stations: [...] }  (same as /api/sync/data)
    // Format 2: { data: { stations: [...] } }
    // Format 3: { items: [...] }
    // Format 4: raw array of station objects
    let stations: unknown[] = [];

    if (Array.isArray(body)) {
      stations = body;
    } else if (body.stations && Array.isArray(body.stations)) {
      stations = body.stations;
    } else if (body.data?.stations && Array.isArray(body.data.stations)) {
      stations = body.data.stations;
    } else if (body.items && Array.isArray(body.items)) {
      stations = body.items;
    } else if (body.payload && Array.isArray(body.payload)) {
      stations = body.payload;
    }

    if (stations.length === 0) {
      return NextResponse.json(
        { error: 'No station data found in webhook payload. Expected stations/items/data.stations array.' },
        { status: 400 }
      );
    }

    let created = 0;
    let updated = 0;
    let unchanged = 0;
    let errors = 0;
    const changes: Array<{
      action: string;
      chargerId: string;
      name: string;
      field?: string;
      oldVal?: string;
      newVal?: string;
    }> = [];

    for (const raw of stations) {
      try {
        const station = raw as Record<string, unknown>;

        // Try multiple field names for charger ID
        const chargerIdRaw = station.chargerId || station.charger_id || station.siteId || station.site_id || station.id;
        if (!chargerIdRaw) {
          errors++;
          continue;
        }

        const chargerId = String(chargerIdRaw).startsWith('#')
          ? String(chargerIdRaw)
          : `#${chargerIdRaw}`;

        const name = String(station.name || station.siteName || station.site_name || `Station - ${chargerId}`);
        const statusRaw = station.status ? String(station.status) : 'planned';
        let status = 'planned';
        const s = statusRaw.toLowerCase();
        if (s.includes('operational') || s.includes('active') || s.includes('live')) status = 'operational';
        else if (s.includes('construction') || s.includes('install')) status = 'construction';
        else if (s.includes('blocked') || s.includes('stalled')) status = 'blocked';
        else if (s.includes('archived') || s.includes('closed') || s.includes('cancelled')) status = 'archived';
        else if (s.includes('planned') || s.includes('coming') || s.includes('upcoming')) status = 'planned';

        const type = String(station.type || station.stationType || station.station_type || 'point');
        const address = station.address ? String(station.address) : (station.location ? String(station.location) : name);
        const neighborhood = station.neighborhood ? String(station.neighborhood) : (station.area ? String(station.area) : (station.landmark ? String(station.landmark) : 'Nairobi'));
        const lat = station.latitude != null ? Number(station.latitude) : (station.lat != null ? Number(station.lat) : null);
        const lng = station.longitude != null ? Number(station.longitude) : (station.lng != null ? Number(station.lng) : (station.lon != null ? Number(station.lon) : null));
        const chargerCount = station.chargerCount != null ? Number(station.chargerCount) : (station.charger_count != null ? Number(station.charger_count) : 1);
        const totalKw = station.totalKw != null ? Number(station.totalKw) : (station.total_kw != null ? Number(station.total_kw) : 6);
        const connectorType = station.connectorType ? String(station.connectorType) : (station.connector_type ? String(station.connector_type) : null);
        const powerOutputKw = station.powerOutputKw != null ? Number(station.powerOutputKw) : (station.power_output != null ? Number(station.power_output) : null);
        const partner = station.partner ? String(station.partner) : (station.host ? String(station.host) : null);
        const siteManager = station.siteManager ? String(station.siteManager) : (station.site_manager ? String(station.site_manager) : (station.contactPerson ? String(station.contactPerson) : null));
        const managerPhone = station.managerPhone ? String(station.managerPhone) : (station.phone ? String(station.phone) : (station.contact ? String(station.contact) : null));
        const notes = station.notes ? String(station.notes) : (station.remarks ? String(station.remarks) : null);

        const updateData = {
          name,
          type,
          status,
          address,
          neighborhood,
          latitude: lat,
          longitude: lng,
          chargerCount,
          totalKw,
          connectorType,
          powerOutputKw,
          partner,
          siteManager,
          managerPhone,
          services: JSON.stringify(['charging']),
          notes,
        };

        const existing = await db.chargingStation.findUnique({
          where: { chargerId },
        });

        if (existing) {
          const fieldChanges = detectChanges(existing, updateData);
          if (fieldChanges.length > 0) {
            await db.chargingStation.update({
              where: { chargerId },
              data: updateData,
            });
            updated++;
            fieldChanges.forEach((c) => {
              changes.push({
                action: 'updated',
                chargerId,
                name,
                field: c.field,
                oldVal: String(c.oldVal ?? ''),
                newVal: String(c.newVal ?? ''),
              });
            });
          } else {
            unchanged++;
          }
        } else {
          await db.chargingStation.create({
            data: { chargerId, ...updateData },
          });
          created++;
          changes.push({ action: 'created', chargerId, name });
        }
      } catch (err) {
        console.error('Error processing webhook station:', err);
        errors++;
      }
    }

    const durationMs = Date.now() - startTime;
    const status = errors > 0 ? (created + updated > 0 ? 'partial' : 'error') : 'success';

    // Log to SyncLog
    await db.syncLog.create({
      data: {
        source: 'webhook',
        status,
        created,
        updated,
        unchanged,
        errors,
        details: JSON.stringify(changes.slice(0, 100)),
        triggerBy: body.triggerBy || 'webhook',
        durationMs,
      },
    });

    return NextResponse.json({
      message: `Webhook sync complete: ${created} created, ${updated} updated, ${unchanged} unchanged, ${errors} errors`,
      summary: { created, updated, unchanged, errors },
      changes,
      durationMs,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Webhook error:', error);

    try {
      const durationMs = Date.now() - startTime;
      await db.syncLog.create({
        data: {
          source: 'webhook',
          status: 'error',
          created: 0,
          updated: 0,
          unchanged: 0,
          errors: 1,
          details: JSON.stringify({ error: String(error) }),
          triggerBy: 'webhook',
          durationMs,
        },
      });
    } catch {
      // Ignore log failures
    }

    return NextResponse.json(
      { error: 'Failed to process webhook', details: String(error) },
      { status: 500 }
    );
  }
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
    'siteManager', 'managerPhone', 'notes',
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
