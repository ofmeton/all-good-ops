// scripts/detect-recurring.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { detectRecurring } from './lib/recurring.mjs';
import { join } from 'node:path';
import { dataDir } from './lib/paths.mjs';

const records = JSON.parse(readFileSync(join(dataDir(), 'normalized.json'), 'utf8'));
// 直近12ヶ月で判定（古い薄いデータのノイズを避ける）
const cutoff = '2025-06';
const recent = records.filter(r => r.date.slice(0,7) >= cutoff && !r.is_transfer && !r.is_internal_move);
const candidates = detectRecurring(recent, { minMonths: 3, amountTolerance: 0.15 });
writeFileSync('data/recurring-candidates.json', JSON.stringify(candidates, null, 2));
console.log(`detected ${candidates.length} recurring candidates`);
for (const c of candidates.slice(0, 20)) console.log(`  ${c.kind} ${c.name} ~${c.amountAvg} (${c.monthsSeen}m, day${c.day})`);
