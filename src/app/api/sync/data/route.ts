import { db } from '@/lib/db';
import { resolveStation } from '@/lib/sync-helper';
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
    const stations = body.stations;

    if (!Array.isArray(stations) || stations.length === 0) {
      return NextResponse.json(
        { error: 'Request must include a non-empty "stations" array.' },
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

    for (const station of stations) {
      try {
        const stationId = station.chargerId || station.id;
        const chargerId = stationId
          ? String(stationId).startsWith('#')
            ? String(stationId)
            : `#${stationId}`
          : null;

        if (!chargerId) {
          errors++;
          continue;
        }

        const name = String(station.name || `Station - ${chargerId}`);
        const statusRaw = station.status ? String(station.status) : 'planned';
        let status = 'planned';
        const s = statusRaw.toLowerCase();
        if (s.includes('operational') || s.includes('active') || s.includes('live')) status = 'operational';
        else if (s.includes('construction') || s.includes('install')) status = 'construction';
        else if (s.includes('blocked') || s.includes('stalled')) status = 'blocked';
        else if (s.includes('archived') || s.includes('closed') || s.includes('cancelled')) status = 'archived';
        else if (s.includes('planned') || s.includes('coming') || s.includes('upcoming')) status = 'planned';

        const type = String(station.type || 'point');
        const address = station.address ? String(station.address) : name;
        const neighborhood = station.neighborhood ? String(station.neighborhood) : 'Nairobi';
        const lat = station.latitude != null ? Number(station.latitude) : null;
        const lng = station.longitude != null ? Number(station.longitude) : null;
        const chargerCount = station.chargerCount != null ? Number(station.chargerCount) : 1;
        const totalKw = station.totalKw != null ? Number(station.totalKw) : 6;
        const connectorType = station.connectorType ? String(station.connectorType) : null;
        const powerOutputKw = station.powerOutputKw != null ? Number(station.powerOutputKw) : null;
        const partner = station.partner ? String(station.partner) : null;
        const siteManager = station.siteManager ? String(station.siteManager) : null;
        const managerPhone = station.managerPhone ? String(station.managerPhone) : null;
        const notes = station.notes ? String(station.notes) : null;

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

        const { existing, canonicalId } = await resolveStation(chargerId);

        if (existing) {
          const fieldChanges = detectChanges(existing as Record<string, unknown>, updateData);
          if (fieldChanges.length > 0) {
            await db.chargingStation.update({
              where: { chargerId: canonicalId },
              data: updateData,
            });
            updated++;
            fieldChanges.forEach((c) => {
              changes.push({
                action: 'updated',
                chargerId: canonicalId,
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
            data: { chargerId: canonicalId, ...updateData },
          });
          created++;
          changes.push({ action: 'created', chargerId: canonicalId, name });
        }
      } catch (err) {
        console.error('Error processing station:', err);
        errors++;
      }
    }

    const durationMs = Date.now() - startTime;
    const status = errors > 0 ? (created + updated > 0 ? 'partial' : 'error') : 'success';

    // Log to SyncLog
    await db.syncLog.create({
      data: {
        source: 'api_push',
        status,
        created,
        updated,
        unchanged,
        errors,
        details: JSON.stringify(changes.slice(0, 100)),
        triggerBy: 'api',
        durationMs,
      },
    });

    return NextResponse.json({
      message: `Sync complete: ${created} created, ${updated} updated, ${unchanged} unchanged, ${errors} errors`,
      summary: { created, updated, unchanged, errors },
      changes,
      durationMs,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Sync data error:', error);

    // Log error to SyncLog
    try {
      const durationMs = Date.now() - startTime;
      await db.syncLog.create({
        data: {
          source: 'api_push',
          status: 'error',
          created: 0,
          updated: 0,
          unchanged: 0,
          errors: 1,
          details: JSON.stringify({ error: String(error) }),
          triggerBy: 'api',
          durationMs,
        },
      });
    } catch {
      // Ignore log failures
    }

    return NextResponse.json(
      { error: 'Failed to process sync data', details: String(error) },
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
