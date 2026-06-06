import * as XLSX from 'xlsx';

function main() {
  const workbook = XLSX.readFile('upload/[ROAM] - [Field Operations KE] - Locations Database.xlsx');
  const sheet = workbook.Sheets['RH - KE'];
  if (!sheet) {
    console.log('RH - KE sheet not found!');
    return;
  }
  const allRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 }) as unknown[][];
  const colNames = (allRows[1] as unknown[]).map(c => (c != null ? String(c).trim() : ''));

  function get(row: unknown[], ...keys: string[]): string | null {
    for (const key of keys) {
      const idx = colNames.indexOf(key);
      if (idx >= 0 && row[idx] != null && String(row[idx]).trim() !== '') return String(row[idx]).trim();
    }
    return null;
  }

  console.log(`ColNames:`, colNames);
  console.log('\nAll Hub Rows:');
  for (let i = 2; i < allRows.length; i++) {
    const row = allRows[i] as unknown[];
    const id = get(row, 'Roam Charger ID');
    if (!id) continue;
    const name = get(row, 'Site Name', 'Station Name');
    const status = get(row, 'Status');
    const coord = get(row, 'Coordinate');
    console.log(`Row ${i}: ID=${id}, Name=${name}, Status=${status}, Coordinate=${coord}`);
  }
}

main();
