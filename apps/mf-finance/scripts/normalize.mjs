// scripts/normalize.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { parseCsv } from './lib/csv.mjs';
import { normalizeRows } from './lib/normalize.mjs';
import { isInternalMove, deriveClassification, inferSourceType } from './lib/classify.mjs';

const SRC = process.argv[2] || '../../raw/finance/moneyforward/cashflow-2020-01_2026-06.csv';
const OUT = 'data/normalized.json';
const SOURCE_RULES = []; // 後で給与口座等を追加

const rows = parseCsv(readFileSync(SRC, 'utf8'));
const base = normalizeRows(rows);
const records = base.map(r => ({
  ...r,
  is_internal_move: isInternalMove(r),
  classification: deriveClassification(r),
  source_type: inferSourceType(r, SOURCE_RULES),
}));
mkdirSync('data', { recursive: true });
writeFileSync(OUT, JSON.stringify(records, null, 2));
const inc = records.filter(r => r.included && !r.is_transfer).length;
console.log(`normalized ${records.length} rows (収支対象 ${inc}) -> ${OUT}`);
