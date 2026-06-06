import * as XLSX from 'xlsx';

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

function checkSheet(wb: XLSX.WorkBook, sheetName: string) {
  const sheet = wb.Sheets[sheetName];
  if (!sheet) {
    console.log(`Sheet ${sheetName} not found!`);
    return;
  }
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
  console.log(`\nSheet: ${sheetName} (${rows.length} rows)`);
  if (rows.length > 0) {
    console.log('Keys:', Object.keys(rows[0]));
  }
  const counts: Record<string, number> = {};
  rows.forEach(row => {
    const rawStatus = row['Status'] || row['status'];
    const status = parseStatus(rawStatus ? String(rawStatus) : null, 'planned');
    counts[status] = (counts[status] || 0) + 1;
  });
  console.log('Status counts:', counts);
}

function main() {
  const wb = XLSX.readFile('upload/Roam Point Site Tracker.xlsx');
  checkSheet(wb, 'Leads');
  checkSheet(wb, 'Scheduled Site Visit');
  checkSheet(wb, 'TBD');
}

main();
