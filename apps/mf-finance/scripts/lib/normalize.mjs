// scripts/lib/normalize.mjs
const COL = { calc:0, date:1, content:2, amount:3, account:4, major:5, middle:6, memo:7, transfer:8, id:9 };

function toIso(s) {            // "2026/05/29" -> "2026-05-29"
  const [y,m,d] = s.split('/');
  return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
}

export function normalizeRows(rows) {
  const out = [];
  for (let i = 0; i < rows.length; i++) {
    const c = rows[i];
    if (c.length < 10) continue;
    if (c[COL.id] === 'ID' || c[COL.date] === '日付') continue; // ヘッダ
    out.push({
      id: c[COL.id],
      included: c[COL.calc] === '1',
      date: toIso(c[COL.date]),
      description: c[COL.content],
      amount: parseInt(c[COL.amount], 10),
      account: c[COL.account],
      category_major: c[COL.major],
      category_middle: c[COL.middle],
      memo: c[COL.memo] || '',
      is_transfer: c[COL.transfer] === '1',
      source: 'mf_cf',
    });
  }
  return out;
}
