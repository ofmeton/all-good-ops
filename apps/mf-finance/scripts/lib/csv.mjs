// scripts/lib/csv.mjs
// MFのCSVは全フィールドが " で囲まれる。フィールド内に改行が含まれる場合あり（メモ欄）。
export function parseCsv(text) {
  const rows = [];
  const src = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  let fields = [], cur = '', inQ = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch === '"') { inQ = !inQ; continue; }
    if (ch === '\n' && !inQ) {
      fields.push(cur); cur = '';
      if (fields.join('').trim() !== '') rows.push(fields);
      fields = [];
      continue;
    }
    if (ch === ',' && !inQ) { fields.push(cur); cur = ''; continue; }
    cur += ch;
  }
  // Handle last line without trailing newline
  if (cur !== '' || fields.length > 0) {
    fields.push(cur);
    if (fields.join('').trim() !== '') rows.push(fields);
  }
  return rows;
}
