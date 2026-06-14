// scripts/lib/recurring.mjs
function ym(date) { return date.slice(0, 7); }
function day(date) { return parseInt(date.slice(8, 10), 10); }
function median(nums) {
  const s = [...nums].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

export function detectRecurring(txs, { minMonths = 3, amountTolerance = 0.15 } = {}) {
  const groups = new Map(); // name -> txs[]
  for (const t of txs) {
    if (t.is_transfer) continue;
    const name = (t.description || '').trim();
    if (!name) continue;
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(t);
  }
  const candidates = [];
  for (const [name, list] of groups) {
    const byMonth = new Map();
    for (const t of list) if (!byMonth.has(ym(t.date))) byMonth.set(ym(t.date), t);
    const monthsSeen = byMonth.size;
    if (monthsSeen < minMonths) continue;
    const amounts = [...byMonth.values()].map(t => t.amount);
    const med = median(amounts);
    if (med === 0) continue;
    const within = amounts.every(a => Math.abs(a - med) <= Math.abs(med) * amountTolerance);
    if (!within) continue;
    const avg = Math.round(amounts.reduce((s, a) => s + a, 0) / amounts.length);
    candidates.push({
      name,
      kind: avg > 0 ? 'income' : 'expense',
      amountAvg: avg,
      day: median([...byMonth.values()].map(t => day(t.date))),
      monthsSeen,
    });
  }
  return candidates.sort((a, b) => Math.abs(b.amountAvg) - Math.abs(a.amountAvg));
}
