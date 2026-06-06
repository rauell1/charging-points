import * as XLSX from 'xlsx';
import { syncWorkbook } from '../src/lib/sync-helper';
import { db } from '../src/lib/db';

async function main() {
  const files = [
    { path: 'upload/[ROAM] - [Field Operations KE] - Locations Database.xlsx', name: 'Locations Database' },
    { path: 'upload/[ROAM] - [CHARGING] - Motorcycle Charging Sites.xlsx', name: 'Motorcycle Charging Sites' },
    { path: 'upload/Roam Point Site Tracker.xlsx', name: 'Roam Point Site Tracker' }
  ];

  for (const file of files) {
    console.log(`Syncing ${file.name}...`);
    try {
      const wb = XLSX.readFile(file.path);
      const res = await syncWorkbook(wb, 'manual_script', file.name);
      console.log(`Result: ${res.summary.created} created, ${res.summary.updated} updated, ${res.summary.errors} errors`);
    } catch (e) {
      console.error(`Error syncing ${file.name}:`, e);
    }
  }

  // Double check counts in local database
  const activeHubs = await db.chargingStation.count({ where: { type: 'hub', status: 'operational' } });
  const activePoints = await db.chargingStation.count({ where: { type: 'point', status: 'operational' } });
  const activeKiosks = await db.chargingStation.count({ where: { type: 'kiosk', status: 'operational' } });
  const constructionHubs = await db.chargingStation.count({ where: { type: 'hub', status: 'construction' } });
  const constructionPoints = await db.chargingStation.count({ where: { type: 'point', status: 'construction' } });
  const constructionKiosks = await db.chargingStation.count({ where: { type: 'kiosk', status: 'construction' } });

  console.log('\n--- Counts in Local Database ---');
  console.log(`Operational Hubs: ${activeHubs}`);
  console.log(`Operational Points: ${activePoints}`);
  console.log(`Operational Kiosks: ${activeKiosks}`);
  console.log(`Construction Hubs: ${constructionHubs}`);
  console.log(`Construction Points: ${constructionPoints}`);
  console.log(`Construction Kiosks: ${constructionKiosks}`);
}

main().catch(console.error).finally(() => db.$disconnect());
