// scripts/normalize.mjs
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseCsv } from './lib/csv.mjs';
import { normalizeRows } from './lib/normalize.mjs';
import { isInternalMove, deriveClassification, inferSourceType } from './lib/classify.mjs';

const RAW_DIR = '../../raw/finance/moneyforward';
const OUT = 'data/normalized.json';
const SOURCE_RULES = []; // 後で給与口座等を追加

// 引数があればそのファイル、無ければ raw の全 cashflow-*.csv を読む。
// 旧フルCSV + 月次 refetch を併読 → 同一 ID は loader が ON CONFLICT で重複排除（新しい取込が後勝ち）。
const explicit = process.argv[2];
const sources = explicit
  ? [explicit]
  : readdirSync(RAW_DIR)
      .filter(f => f.startsWith('cashflow-') && f.endsWith('.csv'))
      .sort() // 名前順。refetch サフィックス付きが後ろ＝後勝ち
      .map(f => join(RAW_DIR, f));

const rows = sources.flatMap(src => parseCsv(readFileSync(src, 'utf8')));
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
console.log(`normalized ${records.length} rows from ${sources.length} CSV (収支対象 ${inc}) -> ${OUT}`);
