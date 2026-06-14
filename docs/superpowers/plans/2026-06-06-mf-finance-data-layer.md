# mf-finance データ基盤＋可処分ロジック 実装計画（Plan 1）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** MFエクスポートCSVを正規化して Supabase `mf_finance` に冪等ロードし、可処分（あと使える）を算出できるテスト済みデータ基盤を作る。

**Architecture:** 依存ゼロの純Node ESMライブラリ（csv/normalize/classify/recurring/disposable）を node:test でTDD。CLIがlibを束ねて raw CSV→normalized.json→Supabase upsert。生CSV取得はログイン済みブラウザ依存のため chrome-devtools MCP 手順（cron化は後続でPlaywright永続認証）。

**Tech Stack:** Node ESM(.mjs) / node:test / @supabase/supabase-js / Supabase Postgres(schema `mf_finance`)。

**対象ディレクトリ:** `apps/mf-finance/`（worktree `task/260606-mf-finance`）。仕様: `docs/superpowers/specs/2026-06-06-mf-finance-dashboard-design.md`。

---

## ファイル構成
```
apps/mf-finance/
  package.json              # type:module, scripts(test/normalize/load/detect)
  .gitignore                # data/*.json
  scripts/
    lib/
      csv.mjs               # parseCsv: 引用符付きCSV → 行配列
      normalize.mjs         # normalizeRows: 生行 → 型付きレコード
      classify.mjs          # isInternalMove / deriveClassification / inferSourceType
      recurring.mjs         # detectRecurring: 取引 → 定期候補
      disposable.mjs        # computeMonthlyDisposable: 可処分メトリクス
    normalize.mjs           # CLI: raw CSV → data/normalized.json
    detect-recurring.mjs    # CLI: normalized → data/recurring-candidates.json
    load.mjs                # CLI: normalized.json → Supabase upsert
    acquire.md              # 生CSV取得手順(chrome-devtools, cron化は後続)
  test/
    csv.test.mjs normalize.test.mjs classify.test.mjs recurring.test.mjs disposable.test.mjs
  supabase/migrations/0001_mf_finance_schema.sql
  data/                     # gitignore(normalized.json 等)
```
入力CSV: `raw/finance/moneyforward/cashflow-2020-01_2026-06.csv`（UTF-8・10列、`計算対象,日付,内容,金額（円）,保有金融機関,大項目,中項目,メモ,振替,ID`）。

---

## Task 0: アプリ scaffold

**Files:**
- Create: `apps/mf-finance/package.json`
- Create: `apps/mf-finance/.gitignore`

- [ ] **Step 1: package.json 作成**
```json
{
  "name": "mf-finance",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test test/",
    "normalize": "node scripts/normalize.mjs",
    "detect": "node scripts/detect-recurring.mjs",
    "load": "node scripts/load.mjs"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.45.0"
  }
}
```

- [ ] **Step 2: .gitignore 作成**
```
data/*.json
node_modules/
.env.local
```

- [ ] **Step 3: 依存インストール**
Run: `cd apps/mf-finance && npm install`
Expected: `@supabase/supabase-js` が node_modules に入る（lockfile 生成）。

- [ ] **Step 4: Commit**
```bash
git add apps/mf-finance/package.json apps/mf-finance/.gitignore apps/mf-finance/package-lock.json
git commit -m "chore(mf-finance): app scaffold (node:test + supabase-js)"
```

---

## Task 1: CSV パーサ（引用符対応）

**Files:**
- Create: `apps/mf-finance/scripts/lib/csv.mjs`
- Test: `apps/mf-finance/test/csv.test.mjs`

- [ ] **Step 1: 失敗するテストを書く**
```js
// test/csv.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv } from '../scripts/lib/csv.mjs';

test('引用符内のカンマを壊さない', () => {
  const text = '"a","b,c","d"\n"1","2","3"';
  assert.deepEqual(parseCsv(text), [['a','b,c','d'],['1','2','3']]);
});

test('空行を無視しヘッダ込み全行返す', () => {
  const text = '"日付","金額"\n"2026/05/29","-400"\n\n';
  assert.deepEqual(parseCsv(text), [['日付','金額'],['2026/05/29','-400']]);
});
```

- [ ] **Step 2: 失敗を確認**
Run: `cd apps/mf-finance && node --test test/csv.test.mjs`
Expected: FAIL（`parseCsv` 未定義 / モジュール無し）。

- [ ] **Step 3: 最小実装**
```js
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
```

- [ ] **Step 4: パス確認**
Run: `cd apps/mf-finance && node --test test/csv.test.mjs`
Expected: PASS（2 tests）。

- [ ] **Step 5: Commit**
```bash
git add apps/mf-finance/scripts/lib/csv.mjs apps/mf-finance/test/csv.test.mjs
git commit -m "feat(mf-finance): quoted CSV parser"
```

---

## Task 2: 正規化（生行 → 型付きレコード）

**Files:**
- Create: `apps/mf-finance/scripts/lib/normalize.mjs`
- Test: `apps/mf-finance/test/normalize.test.mjs`

ヘッダ列順: `計算対象,日付,内容,金額（円）,保有金融機関,大項目,中項目,メモ,振替,ID`。

- [ ] **Step 1: 失敗するテストを書く**
```js
// test/normalize.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRows } from '../scripts/lib/normalize.mjs';

const HEADER = ['計算対象','日付','内容','金額（円）','保有金融機関','大項目','中項目','メモ','振替','ID'];
const ROW = ['1','2026/05/29','AP/羽田 駐輪場','-400','ポケットカード','自動車','駐車場','','0','ID_A'];

test('1行を型付きレコードに変換（日付ISO・金額int・boolフラグ）', () => {
  const [r] = normalizeRows([HEADER, ROW]);
  assert.equal(r.id, 'ID_A');
  assert.equal(r.included, true);
  assert.equal(r.date, '2026-05-29');
  assert.equal(r.amount, -400);
  assert.equal(r.is_transfer, false);
  assert.equal(r.account, 'ポケットカード');
  assert.equal(r.category_major, '自動車');
  assert.equal(r.source, 'mf_cf');
});

test('ヘッダ行は出力しない / 計算対象0と振替1を反映', () => {
  const row2 = ['0','2026/05/10','振替','1000','横浜銀行','未分類','未分類','','1','ID_B'];
  const out = normalizeRows([HEADER, ROW, row2]);
  assert.equal(out.length, 2);
  assert.equal(out[1].included, false);
  assert.equal(out[1].is_transfer, true);
});
```

- [ ] **Step 2: 失敗を確認**
Run: `cd apps/mf-finance && node --test test/normalize.test.mjs`
Expected: FAIL（`normalizeRows` 未定義）。

- [ ] **Step 3: 最小実装**
```js
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
```

- [ ] **Step 4: パス確認**
Run: `cd apps/mf-finance && node --test test/normalize.test.mjs`
Expected: PASS（2 tests）。

- [ ] **Step 5: Commit**
```bash
git add apps/mf-finance/scripts/lib/normalize.mjs apps/mf-finance/test/normalize.test.mjs
git commit -m "feat(mf-finance): normalize raw rows to typed records"
```

---

## Task 3: 分類（内部移動・classification・source_type）

**Files:**
- Create: `apps/mf-finance/scripts/lib/classify.mjs`
- Test: `apps/mf-finance/test/classify.test.mjs`

仕様§5,§6。固定費カテゴリ＝住宅/通信費/保険。内部移動＝大項目「現金・カード」。source_type は規則表で口座→事業/給与/その他を推定（既定: 収入=other, 支出=personal）。

- [ ] **Step 1: 失敗するテストを書く**
```js
// test/classify.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isInternalMove, deriveClassification, inferSourceType } from '../scripts/lib/classify.mjs';

const base = { amount:-1000, is_transfer:false, category_major:'食費', category_middle:'外食', account:'ポケットカード' };

test('現金・カードは内部移動', () => {
  assert.equal(isInternalMove({ ...base, category_major:'現金・カード' }), true);
  assert.equal(isInternalMove(base), false);
});

test('classification: 振替>内部移動>収入>固定>変動', () => {
  assert.equal(deriveClassification({ ...base, is_transfer:true }), 'transfer');
  assert.equal(deriveClassification({ ...base, category_major:'現金・カード' }), 'internal');
  assert.equal(deriveClassification({ ...base, amount:50000 }), 'income');
  assert.equal(deriveClassification({ ...base, category_major:'住宅' }), 'fixed');
  assert.equal(deriveClassification(base), 'variable');
});

test('source_type: 規則で給与口座→salary、既定は収入other/支出personal', () => {
  const rules = [{ accountIncludes:'BEAT', sourceType:'salary' }];
  assert.equal(inferSourceType({ amount:200000, account:'BEAT ICE 給与' }, rules), 'salary');
  assert.equal(inferSourceType({ amount:30000, account:'横浜銀行' }, rules), 'other');
  assert.equal(inferSourceType({ amount:-500, account:'横浜銀行' }, rules), 'personal');
});
```

- [ ] **Step 2: 失敗を確認**
Run: `cd apps/mf-finance && node --test test/classify.test.mjs`
Expected: FAIL（関数未定義）。

- [ ] **Step 3: 最小実装**
```js
// scripts/lib/classify.mjs
const INTERNAL_MAJORS = new Set(['現金・カード']);
const FIXED_MAJORS = new Set(['住宅','通信費','保険']);

export function isInternalMove(r) {
  return INTERNAL_MAJORS.has(r.category_major);
}

export function deriveClassification(r) {
  if (r.is_transfer) return 'transfer';
  if (isInternalMove(r)) return 'internal';
  if (r.amount > 0) return 'income';
  if (FIXED_MAJORS.has(r.category_major)) return 'fixed';
  if (r.category_major && r.category_major !== '未分類') return 'variable';
  return 'unknown';
}

// rules: [{ accountIncludes?, descIncludes?, sourceType }]
export function inferSourceType(r, rules = []) {
  for (const rule of rules) {
    if (rule.accountIncludes && r.account?.includes(rule.accountIncludes)) return rule.sourceType;
    if (rule.descIncludes && r.description?.includes(rule.descIncludes)) return rule.sourceType;
  }
  return r.amount > 0 ? 'other' : 'personal';
}
```

- [ ] **Step 4: パス確認**
Run: `cd apps/mf-finance && node --test test/classify.test.mjs`
Expected: PASS（3 tests）。

- [ ] **Step 5: Commit**
```bash
git add apps/mf-finance/scripts/lib/classify.mjs apps/mf-finance/test/classify.test.mjs
git commit -m "feat(mf-finance): classification + source_type inference"
```

---

## Task 4: 定期項目 自動検出

**Files:**
- Create: `apps/mf-finance/scripts/lib/recurring.mjs`
- Test: `apps/mf-finance/test/recurring.test.mjs`

仕様§8。`内容(正規化名)×近い金額` で月次周期を検出。`minMonths`(既定3)以上の異なる月で出現し金額が `amountTolerance`(既定0.15) 以内なら候補。kind は平均金額の符号。

- [ ] **Step 1: 失敗するテストを書く**
```js
// test/recurring.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectRecurring } from '../scripts/lib/recurring.mjs';

const tx = (date, amount, description) => ({ date, amount, description, is_transfer:false });

test('3ヶ月連続・同名・近似額を固定費候補に', () => {
  const txs = [
    tx('2026-03-11', -2520, 'アクサダイレクト 自動車保険 月次'),
    tx('2026-04-11', -2520, 'アクサダイレクト 自動車保険 月次'),
    tx('2026-05-11', -2530, 'アクサダイレクト 自動車保険 月次'),
  ];
  const c = detectRecurring(txs, { minMonths: 3, amountTolerance: 0.15 });
  assert.equal(c.length, 1);
  assert.equal(c[0].kind, 'expense');
  assert.equal(c[0].monthsSeen, 3);
  assert.equal(c[0].day, 11);
  assert.ok(Math.abs(c[0].amountAvg - (-2523)) < 2);
});

test('単発・月数不足は候補にしない / 収入はkind=income', () => {
  const txs = [
    tx('2026-05-27', -911, 'CLOUDFLARE'),
    tx('2026-03-25', 200000, '案件報酬'),
    tx('2026-04-25', 200000, '案件報酬'),
    tx('2026-05-25', 200000, '案件報酬'),
  ];
  const c = detectRecurring(txs, { minMonths: 3, amountTolerance: 0.15 });
  assert.equal(c.length, 1);
  assert.equal(c[0].kind, 'income');
  assert.equal(c[0].name, '案件報酬');
});
```

- [ ] **Step 2: 失敗を確認**
Run: `cd apps/mf-finance && node --test test/recurring.test.mjs`
Expected: FAIL（`detectRecurring` 未定義）。

- [ ] **Step 3: 最小実装**
```js
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
```

- [ ] **Step 4: パス確認**
Run: `cd apps/mf-finance && node --test test/recurring.test.mjs`
Expected: PASS（2 tests）。

- [ ] **Step 5: Commit**
```bash
git add apps/mf-finance/scripts/lib/recurring.mjs apps/mf-finance/test/recurring.test.mjs
git commit -m "feat(mf-finance): recurring item auto-detection"
```

---

## Task 5: 可処分（あと使える）算出

**Files:**
- Create: `apps/mf-finance/scripts/lib/disposable.mjs`
- Test: `apps/mf-finance/test/disposable.test.mjs`

仕様§7。入力: 正規化済 transactions（classification/is_internal_move 付与済）, recurringItems（確定済 income/expense, amount）, {year, month}。

- [ ] **Step 1: 失敗するテストを書く**
```js
// test/disposable.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeMonthlyDisposable } from '../scripts/lib/disposable.mjs';

const t = (date, amount, classification, description='') =>
  ({ date, amount, classification, description, is_transfer: classification==='transfer', is_internal_move: classification==='internal', included:true });

test('可処分とあと使えるを算出（定期収入見込＋スポット − 固定 − 変動実績）', () => {
  const txs = [
    t('2026-05-25', 200000, 'income', '案件報酬'),   // 定期収入に一致
    t('2026-05-10', 30000, 'income', '臨時'),         // スポット着金
    t('2026-05-11', -2520, 'fixed', 'アクサ保険'),     // 固定費(変動費から除外)
    t('2026-05-12', -5000, 'variable', '外食'),        // 変動費実績
    t('2026-05-13', -10000, 'internal', 'ATM引出'),    // 内部移動(除外)
    t('2026-05-14', -3000, 'transfer', '振替'),        // 振替(除外)
  ];
  const recurring = [
    { kind:'income', name:'案件報酬', amount:200000, active:true },
    { kind:'expense', name:'アクサ保険', amount:2520, active:true },
  ];
  const r = computeMonthlyDisposable(txs, recurring, { year:2026, month:5 });
  assert.equal(r.incomeRecurring, 200000);
  assert.equal(r.incomeSpot, 30000);
  assert.equal(r.incomeTotal, 230000);
  assert.equal(r.fixed, 2520);
  assert.equal(r.variableActual, 5000);
  assert.equal(r.disposableBudget, 227480); // 230000 - 2520
  assert.equal(r.remaining, 222480);         // 227480 - 5000
});
```

- [ ] **Step 2: 失敗を確認**
Run: `cd apps/mf-finance && node --test test/disposable.test.mjs`
Expected: FAIL（未定義）。

- [ ] **Step 3: 最小実装**
```js
// scripts/lib/disposable.mjs
function inMonth(date, year, month) {
  return date.slice(0, 7) === `${year}-${String(month).padStart(2, '0')}`;
}

export function computeMonthlyDisposable(txs, recurringItems, { year, month }) {
  const monthTx = txs.filter(t => t.included && inMonth(t.date, year, month));
  const recIncomeNames = new Set(recurringItems.filter(r => r.kind === 'income' && r.active).map(r => r.name));

  const incomeRecurring = recurringItems
    .filter(r => r.kind === 'income' && r.active)
    .reduce((s, r) => s + r.amount, 0);

  const incomeSpot = monthTx
    .filter(t => t.classification === 'income' && !recIncomeNames.has((t.description || '').trim()))
    .reduce((s, t) => s + t.amount, 0);

  const fixed = recurringItems
    .filter(r => r.kind === 'expense' && r.active)
    .reduce((s, r) => s + r.amount, 0);

  const variableActual = monthTx
    .filter(t => t.classification === 'variable')
    .reduce((s, t) => s + Math.abs(t.amount), 0);

  const incomeTotal = incomeRecurring + incomeSpot;
  const disposableBudget = incomeTotal - fixed;
  const remaining = disposableBudget - variableActual;
  return { incomeRecurring, incomeSpot, incomeTotal, fixed, variableActual, disposableBudget, remaining };
}
```

- [ ] **Step 4: パス確認**
Run: `cd apps/mf-finance && node --test test/disposable.test.mjs`
Expected: PASS（1 test）。

- [ ] **Step 5: 全テスト一括実行**
Run: `cd apps/mf-finance && npm test`
Expected: PASS（csv/normalize/classify/recurring/disposable 全て、計10 tests）。

- [ ] **Step 6: Commit**
```bash
git add apps/mf-finance/scripts/lib/disposable.mjs apps/mf-finance/test/disposable.test.mjs
git commit -m "feat(mf-finance): monthly disposable-income calculation"
```

---

## Task 6: normalize CLI ＋ 実データ突合検証

**Files:**
- Create: `apps/mf-finance/scripts/normalize.mjs`

- [ ] **Step 1: CLI 実装**
```js
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
```

- [ ] **Step 2: 実行して recon 値と突合**
Run: `cd apps/mf-finance && npm run normalize`
Expected: `normalized 3743 rows (収支対象 ~3193) -> data/normalized.json`。recon（README）と総数3743が一致。差異あれば停止して原因調査（推測で埋めない）。

- [ ] **Step 3: Commit（dataはgitignore、CLIのみ）**
```bash
git add apps/mf-finance/scripts/normalize.mjs
git commit -m "feat(mf-finance): normalize CLI (raw CSV -> normalized.json)"
```

---

## Task 7: Supabase `mf_finance` スキーマ migration 〔人間確認必須〕

**Files:**
- Create: `apps/mf-finance/supabase/migrations/0001_mf_finance_schema.sql`

- [ ] **Step 1: migration SQL 作成**
```sql
-- 0001_mf_finance_schema.sql
create schema if not exists mf_finance;

create table mf_finance.transactions (
  id text primary key,
  included boolean not null default true,
  date date not null,
  description text,
  amount integer not null,
  account text,
  category_major text,
  category_middle text,
  memo text,
  is_transfer boolean not null default false,
  is_internal_move boolean not null default false,
  classification text,
  source_type text,
  llm_labeled boolean not null default false,
  source text not null default 'mf_cf',
  ingested_at timestamptz not null default now()
);
create index on mf_finance.transactions (date);
create index on mf_finance.transactions (classification);

create table mf_finance.recurring_items (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('income','expense')),
  name text not null,
  match_pattern text,
  amount integer not null,
  day integer,
  source_type text,
  active boolean not null default true,
  confirmed text not null default 'auto' check (confirmed in ('auto','user')),
  created_at timestamptz not null default now()
);

create table mf_finance.account_status (
  id bigint generated always as identity primary key,
  account text not null,
  status text,
  last_fetched_at timestamptz,
  captured_at timestamptz not null default now()
);

create table mf_finance.asset_history (
  date date primary key,
  total integer,
  deposit_cash_crypto integer,
  points integer
);

create table mf_finance.liability_snapshots (
  snapshot_date date primary key,
  total integer,
  breakdown jsonb,
  captured_at timestamptz not null default now()
);

create table mf_finance.manual_liabilities (
  id bigint generated always as identity primary key,
  name text not null,
  lender text,
  balance integer,
  rate numeric,
  monthly_payment integer,
  as_of_date date
);

create table mf_finance.category_rules (
  id bigint generated always as identity primary key,
  pattern text not null,
  match_type text,
  category_major text,
  category_middle text,
  classification text,
  source_type text,
  source text not null default 'manual',
  created_at timestamptz not null default now()
);
```

- [ ] **Step 2: 〔人間確認〕適用許可を取る**
DB書込のため、ユーザーに「`ofmeton-apps`(hofvvcvhjslevymhbcqj) に上記 migration を適用してよいか」を確認。承認後のみ次へ。

- [ ] **Step 3: migration 適用**
Supabase MCP `apply_migration`（project_id=`hofvvcvhjslevymhbcqj`, name=`mf_finance_schema`, query=上記SQL）。
Verify: `list_tables`(schemas=['mf_finance']) で7テーブルを確認。

- [ ] **Step 4: Commit**
```bash
git add apps/mf-finance/supabase/migrations/0001_mf_finance_schema.sql
git commit -m "feat(mf-finance): supabase mf_finance schema migration"
```

---

## Task 8: load.mjs（Supabase upsert）

**Files:**
- Create: `apps/mf-finance/scripts/load.mjs`

接続情報は `apps/mf-finance/.env.local`（main repo側で作成・gitignore済）に `SUPABASE_URL` / `SUPABASE_SERVICE_KEY`。

- [ ] **Step 1: load CLI 実装**
```js
// scripts/load.mjs
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
if (!url || !key) { console.error('SUPABASE_URL / SUPABASE_SERVICE_KEY 未設定'); process.exit(1); }

const supabase = createClient(url, key, { db: { schema: 'mf_finance' } });
const records = JSON.parse(readFileSync('data/normalized.json', 'utf8'));

const CHUNK = 500;
let done = 0;
for (let i = 0; i < records.length; i += CHUNK) {
  const chunk = records.slice(i, i + CHUNK).map(r => ({
    id: r.id, included: r.included, date: r.date, description: r.description,
    amount: r.amount, account: r.account, category_major: r.category_major,
    category_middle: r.category_middle, memo: r.memo, is_transfer: r.is_transfer,
    is_internal_move: r.is_internal_move, classification: r.classification,
    source_type: r.source_type, source: r.source,
  }));
  const { error } = await supabase.from('transactions').upsert(chunk, { onConflict: 'id' });
  if (error) { console.error(error); process.exit(1); }
  done += chunk.length;
  console.log(`upserted ${done}/${records.length}`);
}
console.log('done');
```

- [ ] **Step 2: env 準備の確認**
`apps/mf-finance/.env.local` に `SUPABASE_URL`(=`https://hofvvcvhjslevymhbcqj.supabase.co`) と service key を設定。値はシェル履歴に残さない（直接ファイル編集）。

- [ ] **Step 3: 実行**
Run: `cd apps/mf-finance && node --env-file=.env.local scripts/load.mjs`
Expected: `upserted 3743/3743` → `done`。

- [ ] **Step 4: 冪等性検証（再実行で重複しない）**
Run: 同コマンド再実行。
Verify (Supabase MCP `execute_sql`): `select count(*) from mf_finance.transactions;` が 3743 のまま（再実行で増えない）。

- [ ] **Step 5: Commit**
```bash
git add apps/mf-finance/scripts/load.mjs
git commit -m "feat(mf-finance): idempotent loader to supabase"
```

---

## Task 9: detect-recurring CLI ＋ 候補出力

**Files:**
- Create: `apps/mf-finance/scripts/detect-recurring.mjs`

- [ ] **Step 1: CLI 実装**
```js
// scripts/detect-recurring.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { detectRecurring } from './lib/recurring.mjs';

const records = JSON.parse(readFileSync('data/normalized.json', 'utf8'));
// 直近12ヶ月で判定（古い薄いデータのノイズを避ける）
const cutoff = '2025-06';
const recent = records.filter(r => r.date.slice(0,7) >= cutoff && !r.is_transfer && !r.is_internal_move);
const candidates = detectRecurring(recent, { minMonths: 3, amountTolerance: 0.15 });
writeFileSync('data/recurring-candidates.json', JSON.stringify(candidates, null, 2));
console.log(`detected ${candidates.length} recurring candidates`);
for (const c of candidates.slice(0, 20)) console.log(`  ${c.kind} ${c.name} ~${c.amountAvg} (${c.monthsSeen}m, day${c.day})`);
```

- [ ] **Step 2: 実行して候補を目視**
Run: `cd apps/mf-finance && npm run detect`
Expected: 固定費（保険/通信/サブスク）と定期収入の候補が並ぶ。妥当性を目視（家賃・通信・保険・CLOUDFLARE等）。

- [ ] **Step 3: Commit**
```bash
git add apps/mf-finance/scripts/detect-recurring.mjs
git commit -m "feat(mf-finance): recurring detection CLI"
```

---

## Task 10: 取得手順ドキュメント（cron化は後続）

**Files:**
- Create: `apps/mf-finance/scripts/acquire.md`

- [ ] **Step 1: 手順を文書化**
内容: ①個人Chromeで MF ログイン＋remote debugging 有効化 ②chrome-devtools MCP で `/cf/csv?...`(全月ループ) と `/bs/history/csv` を fetch（Shift-JIS→UTF-8）し `raw/finance/moneyforward/` に保存 ③`/accounts` から連携状態を取得し account_status へ ④作業後 remote debugging 無効化。cron自動化は Playwright 永続認証プロファイルで後続対応（現 cron 全停止中）。参照: memory `reference-chrome-devtools-mcp`。

- [ ] **Step 2: Commit**
```bash
git add apps/mf-finance/scripts/acquire.md
git commit -m "docs(mf-finance): data acquisition procedure"
```

---

## Self-Review（計画の自己点検結果）
- 仕様カバレッジ: §4スキーマ→Task7 / §5派生→Task2,3 / §6可処分→Task5 / §8定期検出→Task4,9 / 取得→Task6,8,10。連携鮮度(account_status)はTask7でテーブル・Task10で取得・**UI表示はPlan 2**。口座別利用・赤字着金警告・引落カレンダーは**Plan 2(UI)** で実装（本Planはデータ基盤）。
- プレースホルダ: なし（各stepに実コード・実コマンド・期待出力）。
- 型整合: レコードのプロパティ名（id/included/date/amount/is_transfer/is_internal_move/classification/source_type）が Task2→3→5→8 で一貫。`recurring_items` の amount は正の額（支出は正で保持、可処分計算で減算）。

## 次（Plan 2 予定）
可処分ダッシュボードUI（Next.js App Router）: home（あと使える＋内訳）、月次収支・前月比・前年同月比・トレンド、連携鮮度＋refresh促し、口座/カード別利用、赤字着金警告、引落予定vs残高カレンダー、定期項目 確定UI。`frontend-design`/`nextjs-supabase-site-gotchas`/`responsive-layout` skill 準拠。
