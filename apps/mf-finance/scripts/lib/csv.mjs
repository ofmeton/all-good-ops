// scripts/lib/csv.mjs
// MFのCSVは全フィールドが " で囲まれ、改行はレコード区切り。フィールド内に " は出ない前提。
export function parseCsv(text) {
  const rows = [];
  for (const rawLine of text.split('\n')) {
    const line = rawLine.replace(/\r$/, '');
    if (line.trim() === '') continue;
    const fields = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === ',' && !inQ) { fields.push(cur); cur = ''; continue; }
      cur += ch;
    }
    fields.push(cur);
    rows.push(fields);
  }
  return rows;
}
