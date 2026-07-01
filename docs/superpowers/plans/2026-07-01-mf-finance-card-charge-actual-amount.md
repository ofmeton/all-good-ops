# mf-finance: カード引落額の手入力（実額上書き）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/cashflow` の変動額カード引落（`card_charge_schedules.amount_type='variable'`）について、自動推定額をカード明細で確定した実額に手入力で置き換えられるようにする。

**Architecture:** 既存の定期収入の実額上書き機能（`recurring_overrides` テーブル + `OccurrenceActions` コンポーネント）と同形のパターンを、カード引落に対して並行に追加する。新規テーブル `card_charge_overrides`（`schedule_id, occurrence_date, amount`）を導入し、純粋ロジック層（`lib/cashflow/rolling.mjs`）で上書きがあればそれを採用、無ければ従来の自動推定にフォールバックする。

**Tech Stack:** Next.js 16 (App Router) / TypeScript / better-sqlite3 / Node.js `node:test`（`.mjs`の純粋ロジックのみ単体テスト対象、DB/UIはこのリポジトリの既存慣習どおり手動検証）。

## Global Constraints

- 対象は `card_charge_schedules.amount_type === 'variable'` のみ。`fixed` 型への上書きはサーバー側で拒否する。
- 「スキップ」（その回を無しとして扱う）機能は実装しない（スコープ外・仕様書で確認済み）。
- 新規テーブルは `recurring_overrides` と同じ場所（`db/schema.sql` と `db/migrate.mjs` の両方）に追加する。
- 既存の `test/cashflow-rolling.test.mjs` のテストは1件も壊さない（新規フィールドはすべて optional で追加し、既存の `assert.equal`/`assert.deepEqual` が特定フィールドのみを見ている箇所に影響しないことを各タスクで確認する）。
- コミットメッセージは既存の conventional commits 形式（例: `feat(mf-finance/cashflow): ...`）に揃える。
- 作業ブランチ: `task/260701-mf-finance-card-charge-override`（worktree: `/Users/rikukudo/Projects/all-good-ops-mf-finance-card-charge-override`）。以降のコマンドはすべて `apps/mf-finance` 配下で実行する。
- このリポジトリに `tsc`/`typescript` の直接インストールは無い。型チェックは `npm run build`（`next build` が内部で TypeScript チェックを行う）で代用する。

## 前提: 依存関係インストール

このworktreeは `wt-new.sh` 作成時点でルートの `npm install` のみ実行済みで、`apps/mf-finance` 配下は未インストール。Task 1 に着手する前に一度だけ実行する。

```bash
cd /Users/rikukudo/Projects/all-good-ops-mf-finance-card-charge-override/apps/mf-finance
npm install
```

Expected: `added N packages` で正常終了（既知の warning: `prebuild-install@7.1.3 deprecated` は無視してよい）。

---

## File Structure

- Modify: `db/schema.sql` — `card_charge_overrides` テーブル定義を追加
- Modify: `db/migrate.mjs` — 同テーブルを `applyRecurringMigrations` に追加（既存DBへの適用経路）
- Modify: `lib/cashflow/rolling.mjs` — `indexCardChargeOverrides` 追加、`expandCardChargeSchedules` に overrides 適用ロジック追加、`buildRolling` のカード引落イベント生成に `scheduleId`/`amountType` を伝播
- Modify: `lib/cashflow-queries.ts` — `CardChargeOverrideRow`/`getCardChargeOverrides()` 追加、`expandCardCharges()` から overrides を渡す、`RollingEvent`/`ExpandedCardCharge` に `scheduleId`/`amountType` 追加
- Modify: `lib/actions.ts` — `setCardChargeOverride`/`clearCardChargeOverride` 追加
- Create: `app/cashflow/CardChargeOccurrenceActions.tsx` — 実額入力用の新規UIコンポーネント
- Modify: `app/cashflow/CashflowTimeline.tsx` — 変動カード引落の行に新規コンポーネントを表示
- Modify: `test/cashflow-rolling.test.mjs` — overrides 適用のテストケースを追加

---

### Task 1: DB スキーマ — `card_charge_overrides` テーブル

**Files:**
- Modify: `db/schema.sql:248`（`card_charge_schedules` のインデックス定義の直後）
- Modify: `db/migrate.mjs`（末尾、`card_charge_schedules` のマイグレーションブロックの直後）

**Interfaces:**
- Produces: テーブル `card_charge_overrides(id, schedule_id, occurrence_date, amount, created_at)`。UNIQUE制約 `(schedule_id, occurrence_date)`。以降のタスクはこのテーブルに `INSERT ... ON CONFLICT ... DO UPDATE` / `DELETE` / `SELECT schedule_id, occurrence_date, amount` で読み書きする。

- [ ] **Step 1: `db/schema.sql` にテーブル定義を追加**

`db/schema.sql` の246〜248行目（`card_charge_schedules` の直後）を以下のように変更する。

変更前:
```sql
CREATE INDEX IF NOT EXISTS idx_card_charge_schedules_account ON card_charge_schedules (card_account, active);
```

変更後:
```sql
CREATE INDEX IF NOT EXISTS idx_card_charge_schedules_account ON card_charge_schedules (card_account, active);

CREATE TABLE IF NOT EXISTS card_charge_overrides (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  schedule_id  INTEGER NOT NULL REFERENCES card_charge_schedules(id) ON DELETE CASCADE,
  occurrence_date TEXT NOT NULL,
  amount       INTEGER NOT NULL,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  UNIQUE (schedule_id, occurrence_date)
);
CREATE INDEX IF NOT EXISTS idx_card_charge_overrides_sid ON card_charge_overrides (schedule_id);
```

- [ ] **Step 2: `db/migrate.mjs` に同テーブルを追加**

`db/migrate.mjs` の末尾（`card_charge_schedules` の列追加処理と最後のインデックス作成の直後、関数の閉じ括弧の直前）に以下を追加する。

```javascript
  db.exec(`
    CREATE TABLE IF NOT EXISTS card_charge_overrides (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      schedule_id  INTEGER NOT NULL REFERENCES card_charge_schedules(id) ON DELETE CASCADE,
      occurrence_date TEXT NOT NULL,
      amount       INTEGER NOT NULL,
      created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
      UNIQUE (schedule_id, occurrence_date)
    )
  `);
  db.exec("CREATE INDEX IF NOT EXISTS idx_card_charge_overrides_sid ON card_charge_overrides (schedule_id)");
```

- [ ] **Step 3: スクラッチDBで検証**

```bash
node --input-type=module -e "
import { readFileSync } from 'node:fs';
import Database from 'better-sqlite3';
import { applyRecurringMigrations } from './db/migrate.mjs';
const db = new Database('/tmp/mf-finance-schema-check.db');
db.exec(readFileSync('./db/schema.sql', 'utf8'));
applyRecurringMigrations(db);
const cols = db.prepare('PRAGMA table_info(card_charge_overrides)').all();
console.log(JSON.stringify(cols.map((c) => c.name)));
db.close();
"
rm -f /tmp/mf-finance-schema-check.db
```

Expected: `["id","schedule_id","occurrence_date","amount","created_at"]`

- [ ] **Step 4: コミット**

```bash
git add db/schema.sql db/migrate.mjs
git commit -m "feat(mf-finance/cashflow): card_charge_overrides テーブルを追加"
```

---

### Task 2: 純粋ロジック — overrides の適用（TDD）

**Files:**
- Modify: `lib/cashflow/rolling.mjs:81-116`（`expandCardChargeSchedules`）、`lib/cashflow/rolling.mjs:118-125`（`indexOverrides` 直後に `indexCardChargeOverrides` を追加）、`lib/cashflow/rolling.mjs:222-235`（`buildRolling` のカード引落イベント生成）
- Test: `test/cashflow-rolling.test.mjs`

**Interfaces:**
- Consumes: なし（このファイルはDB非依存の純粋ロジック）
- Produces:
  - `indexCardChargeOverrides(arr: Array<{schedule_id:number, occurrence_date:string, amount:number}> | Map): Map<string, {schedule_id:number, occurrence_date:string, amount:number}>` — キーは `` `${schedule_id}|${occurrence_date}` ``。Task 3 がこれを使う。
  - `expandCardChargeSchedules({schedules, today, days, variableByPeriod, overrides})` の戻り値の各要素に `scheduleId: number|null` と `amountType: "fixed"|"variable"` が追加される。Task 3 が `overrides` 引数を渡す。
  - `buildRolling`/`buildAccountRolling` が返す `RollingEvent`（source='card_charge'）に `scheduleId`/`amountType` が追加される。Task 4以降のUIがこれを使う。

- [ ] **Step 1: 失敗するテストを書く**

`test/cashflow-rolling.test.mjs` の1〜16行目のimportに `indexCardChargeOverrides` を追加する。

変更前:
```javascript
import {
  buildAccountRolling,
  buildBalanceMatrix,
  buildRolling,
  buildUpcomingWithdrawals,
  cardBillingPeriod,
  effectiveDay,
  expandCardChargeSchedules,
  monthEndOffsetDays,
  monthlyChargeDates,
  monthlyOccurrences,
  monthlyRecurringContribution,
  weekdayOf,
} from "../lib/cashflow/rolling.mjs";
```

変更後:
```javascript
import {
  buildAccountRolling,
  buildBalanceMatrix,
  buildRolling,
  buildUpcomingWithdrawals,
  cardBillingPeriod,
  effectiveDay,
  expandCardChargeSchedules,
  indexCardChargeOverrides,
  monthEndOffsetDays,
  monthlyChargeDates,
  monthlyOccurrences,
  monthlyRecurringContribution,
  weekdayOf,
} from "../lib/cashflow/rolling.mjs";
```

ファイル末尾（706行目、最後のテストの後）に以下を追加する。

```javascript

test("indexCardChargeOverrides: schedule_id|occurrence_date キーの Map を作る", () => {
  const map = indexCardChargeOverrides([
    { schedule_id: 3, occurrence_date: "2026-07-01", amount: 5000 },
  ]);
  assert.equal(map.get("3|2026-07-01").amount, 5000);
  assert.equal(map.size, 1);
});

test("expandCardChargeSchedules: overrides で variable の見込みを実額に置き換える(estimated:false)", () => {
  const charges = expandCardChargeSchedules({
    today: "2026-06-16",
    days: 20,
    schedules: [
      {
        id: 7,
        card_account: "三井住友カード",
        charge_day: 27,
        amount_type: "variable",
        fixed_amount: null,
      },
    ],
    variableByPeriod: new Map([["三井住友カード|2026-05-31", 51000]]),
    overrides: new Map([["7|2026-06-27", { schedule_id: 7, occurrence_date: "2026-06-27", amount: 63500 }]]),
  });

  assert.equal(charges.length, 1);
  assert.equal(charges[0].amount, 63500);
  assert.equal(charges[0].estimated, false);
  assert.equal(charges[0].scheduleId, 7);
  assert.equal(charges[0].amountType, "variable");
});

test("expandCardChargeSchedules: overrides に対象occurrenceが無ければ従来通り自動推定のまま", () => {
  const charges = expandCardChargeSchedules({
    today: "2026-06-16",
    days: 20,
    schedules: [
      {
        id: 7,
        card_account: "三井住友カード",
        charge_day: 27,
        amount_type: "variable",
        fixed_amount: null,
      },
    ],
    variableByPeriod: new Map([["三井住友カード|2026-05-31", 51000]]),
    overrides: new Map(),
  });

  assert.equal(charges.length, 1);
  assert.equal(charges[0].amount, 51000);
  assert.equal(charges[0].estimated, true);
  assert.equal(charges[0].scheduleId, 7);
});

test("expandCardChargeSchedules: fixed 型は overrides があっても無視する", () => {
  const charges = expandCardChargeSchedules({
    today: "2026-06-16",
    days: 20,
    schedules: [
      {
        id: 9,
        card_account: "ポケットカード",
        charge_day: 27,
        amount_type: "fixed",
        fixed_amount: 3000,
      },
    ],
    variableByPeriod: new Map(),
    overrides: new Map([["9|2026-06-27", { schedule_id: 9, occurrence_date: "2026-06-27", amount: 99999 }]]),
  });

  assert.equal(charges.length, 1);
  assert.equal(charges[0].amount, 3000);
  assert.equal(charges[0].estimated, false);
  assert.equal(charges[0].amountType, "fixed");
});

test("buildRolling: cardCharges の scheduleId/amountType をイベントへ伝播する", () => {
  const r = buildRolling({
    today: "2026-06-01",
    days: 30,
    startBalance: 100000,
    recurring: [],
    scheduled: [],
    cardCharges: [
      {
        date: "2026-06-27",
        amount: 42000,
        account: "VISAカード",
        name: "VISAカード カード引落",
        amountType: "variable",
        estimated: false,
        scheduleId: 5,
      },
    ],
  });

  assert.equal(r.events[0].scheduleId, 5);
  assert.equal(r.events[0].amountType, "variable");
});
```

- [ ] **Step 2: テストを実行し失敗を確認**

```bash
node --test test/cashflow-rolling.test.mjs
```

Expected: `indexCardChargeOverrides is not defined`（import エラー）で新規5件が FAIL。既存テストは影響を受けずそのまま PASS のはず。

- [ ] **Step 3: `indexCardChargeOverrides` を実装**

`lib/cashflow/rolling.mjs` の125行目（`indexOverrides` 関数の閉じ括弧の直後）に追加する。

```javascript
export function indexCardChargeOverrides(arr) {
  if (arr instanceof Map) return arr;
  const map = new Map();
  for (const ov of arr ?? []) {
    map.set(`${ov.schedule_id}|${ov.occurrence_date}`, ov);
  }
  return map;
}
```

- [ ] **Step 4: `expandCardChargeSchedules` に overrides 適用を実装**

`lib/cashflow/rolling.mjs:81-116` を以下に置き換える。

変更前:
```javascript
export function expandCardChargeSchedules({ schedules = [], today, days, variableByPeriod = new Map() }) {
  const variableMap =
    variableByPeriod instanceof Map
      ? variableByPeriod
      : new Map(Object.entries(variableByPeriod ?? {}));
  const out = [];

  for (const schedule of schedules) {
    const amountType = schedule.amount_type === "fixed" || schedule.amountType === "fixed" ? "fixed" : "variable";
    const cardAccount = schedule.card_account ?? schedule.account;
    if (!cardAccount) continue;
    const debitAccount = schedule.debit_account ?? schedule.debitAccount ?? null;
    for (const date of monthlyChargeDates(today, days, schedule.charge_day ?? schedule.chargeDay)) {
      const period = cardBillingPeriod(
        date,
        schedule.billing_month_offset ?? schedule.billingMonthOffset,
        schedule.closing_day ?? schedule.closingDay,
      );
      const amount =
        amountType === "fixed"
          ? Math.abs(Math.round(Number(schedule.fixed_amount ?? schedule.fixedAmount) || 0))
          : Math.abs(Math.round(Number(variableMap.get(`${cardAccount}|${period.end}`)) || 0));
      if (amountType === "fixed" && amount <= 0) continue;
      out.push({
        date,
        amount,
        account: debitAccount,
        name: schedule.name ?? `${cardAccount} カード引落`,
        amountType,
        estimated: amountType === "variable",
      });
    }
  }

  return out.sort((a, b) => a.date.localeCompare(b.date) || String(a.account ?? "").localeCompare(String(b.account ?? ""), "ja"));
}
```

変更後:
```javascript
export function expandCardChargeSchedules({
  schedules = [],
  today,
  days,
  variableByPeriod = new Map(),
  overrides = new Map(),
}) {
  const variableMap =
    variableByPeriod instanceof Map
      ? variableByPeriod
      : new Map(Object.entries(variableByPeriod ?? {}));
  const overrideMap = overrides instanceof Map ? overrides : indexCardChargeOverrides(overrides);
  const out = [];

  for (const schedule of schedules) {
    const amountType = schedule.amount_type === "fixed" || schedule.amountType === "fixed" ? "fixed" : "variable";
    const cardAccount = schedule.card_account ?? schedule.account;
    if (!cardAccount) continue;
    const debitAccount = schedule.debit_account ?? schedule.debitAccount ?? null;
    const scheduleId = schedule.id ?? null;
    for (const date of monthlyChargeDates(today, days, schedule.charge_day ?? schedule.chargeDay)) {
      const period = cardBillingPeriod(
        date,
        schedule.billing_month_offset ?? schedule.billingMonthOffset,
        schedule.closing_day ?? schedule.closingDay,
      );
      const override =
        amountType === "variable" && scheduleId != null ? overrideMap.get(`${scheduleId}|${date}`) : undefined;
      const estimated = amountType === "variable" && override == null;
      const amount =
        amountType === "fixed"
          ? Math.abs(Math.round(Number(schedule.fixed_amount ?? schedule.fixedAmount) || 0))
          : override != null
            ? Math.abs(Math.round(Number(override.amount) || 0))
            : Math.abs(Math.round(Number(variableMap.get(`${cardAccount}|${period.end}`)) || 0));
      if (amountType === "fixed" && amount <= 0) continue;
      out.push({
        date,
        amount,
        account: debitAccount,
        name: schedule.name ?? `${cardAccount} カード引落`,
        amountType,
        estimated,
        scheduleId,
      });
    }
  }

  return out.sort((a, b) => a.date.localeCompare(b.date) || String(a.account ?? "").localeCompare(String(b.account ?? ""), "ja"));
}
```

- [ ] **Step 5: `buildRolling` のカード引落イベント生成に `scheduleId`/`amountType` を追加**

`lib/cashflow/rolling.mjs:222-235` を以下に置き換える。

変更前:
```javascript
    for (const c of cardCharges) {
      if (c.date === date) {
        events.push({
          date,
          kind: "expense",
          name: c.name,
          amount: Math.abs(c.amount),
          account: c.account ?? null,
          source: "card_charge",
          status: "normal",
          estimated: !!c.estimated,
        });
      }
    }
```

変更後:
```javascript
    for (const c of cardCharges) {
      if (c.date === date) {
        events.push({
          date,
          kind: "expense",
          name: c.name,
          amount: Math.abs(c.amount),
          account: c.account ?? null,
          source: "card_charge",
          status: "normal",
          estimated: !!c.estimated,
          scheduleId: c.scheduleId ?? null,
          amountType: c.amountType ?? null,
        });
      }
    }
```

- [ ] **Step 6: テストを実行し全件成功を確認**

```bash
node --test test/cashflow-rolling.test.mjs
```

Expected: 新規5件を含め全テストが PASS（`# pass` の件数が変更前より5件増える）。

- [ ] **Step 7: フルテストスイートを実行**

```bash
npm test
```

Expected: 既存の72件 + 新規5件が全て PASS、fail 0。

- [ ] **Step 8: コミット**

```bash
git add lib/cashflow/rolling.mjs test/cashflow-rolling.test.mjs
git commit -m "feat(mf-finance/cashflow): カード引落の実額上書きを rolling ロジックに追加"
```

---

### Task 3: クエリ層 — `card_charge_overrides` の読み出しと合成

**Files:**
- Modify: `lib/cashflow-queries.ts:104-121`（`RecurringOverrideRow`/`getRecurringOverrides` の直後に追加）、`lib/cashflow-queries.ts:343-356`（`RollingEvent`）、`lib/cashflow-queries.ts:392-399`（`ExpandedCardCharge`）、`lib/cashflow-queries.ts:425-455`（`expandCardCharges`）

**Interfaces:**
- Consumes: Task 2 の `expandCardChargeSchedules({..., overrides})` / `indexCardChargeOverrides`（型としてのみ、実呼び出しはこのファイル内）
- Produces: `getCardChargeOverrides(): CardChargeOverrideRow[]`。Task 4 の `setCardChargeOverride`/`clearCardChargeOverride` はこの関数は使わず直接DBを書くが、同じテーブル・カラム名を前提にする。

- [ ] **Step 1: `CardChargeOverrideRow` と `getCardChargeOverrides` を追加**

`lib/cashflow-queries.ts:121`（`getRecurringOverrides` 関数の閉じ括弧の直後）に追加する。

```typescript
export interface CardChargeOverrideRow {
  schedule_id: number;
  occurrence_date: string;
  amount: number;
}

export function getCardChargeOverrides(): CardChargeOverrideRow[] {
  return db
    .prepare("SELECT schedule_id, occurrence_date, amount FROM card_charge_overrides")
    .all() as CardChargeOverrideRow[];
}
```

- [ ] **Step 2: `RollingEvent` に `scheduleId`/`amountType` を追加**

`lib/cashflow-queries.ts:343-356` を以下に置き換える。

変更前:
```typescript
export interface RollingEvent {
  date: string;
  kind: "income" | "expense";
  name: string;
  amount: number;
  account: string | null;
  source: "recurring" | "scheduled" | "transfer" | "card_charge" | string;
  recurringId?: number;
  occurrenceDate?: string;
  status: "normal" | "pending" | "skipped";
  balanceAfter: number;
  affectsTotal?: boolean;
  estimated?: boolean;
}
```

変更後:
```typescript
export interface RollingEvent {
  date: string;
  kind: "income" | "expense";
  name: string;
  amount: number;
  account: string | null;
  source: "recurring" | "scheduled" | "transfer" | "card_charge" | string;
  recurringId?: number;
  occurrenceDate?: string;
  status: "normal" | "pending" | "skipped";
  balanceAfter: number;
  affectsTotal?: boolean;
  estimated?: boolean;
  scheduleId?: number;
  amountType?: "fixed" | "variable";
}
```

- [ ] **Step 3: `ExpandedCardCharge` に `scheduleId`/`amountType` を追加（`amountType` は既存）**

`lib/cashflow-queries.ts:392-399` を以下に置き換える。

変更前:
```typescript
type ExpandedCardCharge = {
  date: string;
  amount: number;
  account: string | null;
  name: string;
  amountType: "fixed" | "variable";
  estimated: boolean;
};
```

変更後:
```typescript
type ExpandedCardCharge = {
  date: string;
  amount: number;
  account: string | null;
  name: string;
  amountType: "fixed" | "variable";
  estimated: boolean;
  scheduleId: number | null;
};
```

- [ ] **Step 4: `expandCardCharges` から overrides を渡す**

`lib/cashflow-queries.ts:425-455` を以下に置き換える。

変更前:
```typescript
function expandCardCharges(
  schedules: CardChargeScheduleRow[],
  today: string,
  days: number,
): ExpandedCardCharge[] {
  const periods: CardUsagePeriod[] = [];
  const chargeDates = monthlyChargeDates as (today: string, days: number, chargeDay: number) => string[];

  for (const schedule of schedules) {
    const amountType = schedule.amount_type === "fixed" ? "fixed" : "variable";
    const account = schedule.card_account;
    if (!account || amountType === "fixed") continue;
    for (const date of chargeDates(today, days, schedule.charge_day)) {
      const period = cardBillingPeriod(
        date,
        billingMonthOffset(schedule.billing_month_offset),
        closingDay(schedule.closing_day),
      ) as { start: string; end: string };
      periods.push({ account, start: period.start, end: period.end });
    }
  }

  const variableByPeriod = getCardUsageByPeriod(periods);
  const expand = expandCardChargeSchedules as (input: {
    schedules: CardChargeScheduleRow[];
    today: string;
    days: number;
    variableByPeriod: Map<string, number>;
  }) => ExpandedCardCharge[];
  return expand({ schedules, today, days, variableByPeriod });
}
```

変更後:
```typescript
function expandCardCharges(
  schedules: CardChargeScheduleRow[],
  today: string,
  days: number,
): ExpandedCardCharge[] {
  const periods: CardUsagePeriod[] = [];
  const chargeDates = monthlyChargeDates as (today: string, days: number, chargeDay: number) => string[];

  for (const schedule of schedules) {
    const amountType = schedule.amount_type === "fixed" ? "fixed" : "variable";
    const account = schedule.card_account;
    if (!account || amountType === "fixed") continue;
    for (const date of chargeDates(today, days, schedule.charge_day)) {
      const period = cardBillingPeriod(
        date,
        billingMonthOffset(schedule.billing_month_offset),
        closingDay(schedule.closing_day),
      ) as { start: string; end: string };
      periods.push({ account, start: period.start, end: period.end });
    }
  }

  const variableByPeriod = getCardUsageByPeriod(periods);
  const overrides = new Map(
    getCardChargeOverrides().map((ov) => [`${ov.schedule_id}|${ov.occurrence_date}`, ov] as const),
  );
  const expand = expandCardChargeSchedules as (input: {
    schedules: CardChargeScheduleRow[];
    today: string;
    days: number;
    variableByPeriod: Map<string, number>;
    overrides: Map<string, CardChargeOverrideRow>;
  }) => ExpandedCardCharge[];
  return expand({ schedules, today, days, variableByPeriod, overrides });
}
```

- [ ] **Step 5: 型チェックを実行**

```bash
npm run build
```

Expected: `Running TypeScript ...` の後 `Finished TypeScript in ...` と表示されてビルドが完走する（型エラーがあればここで `Type error: ...` としてビルドが失敗する）。

- [ ] **Step 6: コミット**

```bash
git add lib/cashflow-queries.ts
git commit -m "feat(mf-finance/cashflow): expandCardCharges に実額上書きを合成する"
```

---

### Task 4: アクション層 — `setCardChargeOverride`/`clearCardChargeOverride`

**Files:**
- Modify: `lib/actions.ts`（`clearOccurrenceOverride` の直後、`--- manual_liabilities ---` コメントの直前に追加）

**Interfaces:**
- Consumes: `db`（`@/lib/db`）、`ensureId`/`ensureIsoDate`/`positiveOverrideAmount`（同ファイル内の既存ヘルパー）
- Produces: `setCardChargeOverride(scheduleId: number, date: string, amount: number): Promise<void>`、`clearCardChargeOverride(scheduleId: number, date: string): Promise<void>`。Task 5 の UI コンポーネントがこれらを呼ぶ。

- [ ] **Step 1: `setCardChargeOverride`/`clearCardChargeOverride` を実装**

`lib/actions.ts:224`（`clearOccurrenceOverride` 関数の閉じ括弧の直後、`// --- manual_liabilities ---` の直前）に追加する。

```typescript
export async function setCardChargeOverride(
  scheduleId: number,
  date: string,
  amount: number,
): Promise<void> {
  const _id = ensureId(scheduleId);
  const occurrenceDate = ensureIsoDate(date);
  const schedule = db
    .prepare("SELECT amount_type FROM card_charge_schedules WHERE id = ?")
    .get(_id) as { amount_type: "fixed" | "variable" } | undefined;
  if (!schedule) throw new Error("カード引落予定が見つかりません");
  if (schedule.amount_type !== "variable") {
    throw new Error("実額の上書きは変動額のカード引落のみ対応しています");
  }
  const overrideAmount = positiveOverrideAmount(amount);

  db.prepare(
    `INSERT INTO card_charge_overrides (schedule_id, occurrence_date, amount)
     VALUES (?, ?, ?)
     ON CONFLICT(schedule_id, occurrence_date) DO UPDATE SET
       amount = excluded.amount`,
  ).run(_id, occurrenceDate, overrideAmount);
  revalidatePath("/");
  revalidatePath("/cashflow");
}

export async function clearCardChargeOverride(
  scheduleId: number,
  date: string,
): Promise<void> {
  const _id = ensureId(scheduleId);
  const occurrenceDate = ensureIsoDate(date);
  db.prepare("DELETE FROM card_charge_overrides WHERE schedule_id = ? AND occurrence_date = ?").run(
    _id,
    occurrenceDate,
  );
  revalidatePath("/");
  revalidatePath("/cashflow");
}
```

- [ ] **Step 2: 開発用DBに対して直接呼び出して検証**

このリポジトリでは `lib/actions.ts` の "use server" 関数は node:test で単体テストされておらず（既存の `setOccurrenceOverride` 等も同様）、Next.js の dev server 経由で検証するのがこのコードベースの既存の流儀。ここでは `card_charge_schedules` に variable のスケジュールが1件も無い場合に備え、まずスケジュールを1件用意してから確認する。

```bash
node --input-type=module -e "
import Database from 'better-sqlite3';
import { dataDir } from './scripts/lib/paths.mjs';
import { join } from 'node:path';
const db = new Database(join(dataDir(), 'mf-finance.db'));
const row = db.prepare(\"SELECT id, amount_type FROM card_charge_schedules WHERE amount_type='variable' LIMIT 1\").get();
console.log(JSON.stringify(row ?? null));
db.close();
"
```

Expected: variable のスケジュールが1件以上あれば `{"id":<数値>,"amount_type":"variable"}` が出力される（無ければ Task 6 の手動確認時にUIから1件登録してから進める）。

- [ ] **Step 3: コミット**

```bash
git add lib/actions.ts
git commit -m "feat(mf-finance/cashflow): カード引落実額の上書き/クリア server action を追加"
```

---

### Task 5: UI — 実額入力コンポーネントと表示への組み込み

**Files:**
- Create: `app/cashflow/CardChargeOccurrenceActions.tsx`
- Modify: `app/cashflow/CashflowTimeline.tsx:1-8`（import 追加）、`app/cashflow/CashflowTimeline.tsx:159-187`（行レンダリング）

**Interfaces:**
- Consumes: Task 4 の `setCardChargeOverride`/`clearCardChargeOverride`（`@/lib/actions`）
- Produces: `CardChargeOccurrenceActions({scheduleId, occurrenceDate, estimated}): JSX.Element`

- [ ] **Step 1: `CardChargeOccurrenceActions.tsx` を作成**

`app/cashflow/CardChargeOccurrenceActions.tsx` を新規作成する。

```tsx
"use client";

import { useState, useTransition } from "react";
import { clearCardChargeOverride, setCardChargeOverride } from "@/lib/actions";

export function CardChargeOccurrenceActions({
  scheduleId,
  occurrenceDate,
  estimated,
}: {
  scheduleId: number;
  occurrenceDate: string;
  estimated: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const errorMessage = (e: unknown) => (e instanceof Error ? e.message : "保存に失敗しました");

  const saveAmount = () => {
    setError(null);
    const next = Number(amount);
    if (!Number.isFinite(next) || next <= 0) {
      setError("金額は正の数で入力してください");
      return;
    }
    startTransition(async () => {
      try {
        await setCardChargeOverride(scheduleId, occurrenceDate, next);
        setAmount("");
        setOpen(false);
      } catch (e) {
        setError(errorMessage(e));
      }
    });
  };

  const clear = () => {
    setError(null);
    startTransition(async () => {
      try {
        await clearCardChargeOverride(scheduleId, occurrenceDate);
        setAmount("");
        setOpen(false);
      } catch (e) {
        setError(errorMessage(e));
      }
    });
  };

  return (
    <div className={pending ? "opacity-60" : ""}>
      <div className="flex flex-wrap items-center gap-1.5">
        {!open ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="操作（実額入力）を開く"
            title="操作"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-base leading-none text-muted hover:bg-border/40"
          >
            ⋯
          </button>
        ) : (
          <>
            <label className="sr-only" htmlFor={`card-charge-occ-${scheduleId}-${occurrenceDate}`}>
              実額に変更
            </label>
            <input
              id={`card-charge-occ-${scheduleId}-${occurrenceDate}`}
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={pending}
              placeholder="実額"
              className="tabular h-8 w-24 rounded-lg border border-border bg-background px-2 text-right text-[11px] text-foreground disabled:opacity-40"
            />
            <button
              type="button"
              onClick={saveAmount}
              disabled={pending || amount.trim() === ""}
              className="h-8 rounded-lg border border-primary bg-primary px-2 text-[11px] font-medium text-white hover:bg-primary/90 disabled:opacity-40"
            >
              {estimated ? "確定額を入力" : "変更"}
            </button>
            {!estimated && (
              <button
                type="button"
                onClick={clear}
                disabled={pending}
                className="h-8 rounded-lg border border-border px-2 text-[11px] font-medium text-muted hover:bg-border/40 disabled:opacity-40"
              >
                見込みに戻す
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="操作を閉じる"
              className="h-8 rounded-lg border border-border px-2 text-[11px] font-medium text-muted hover:bg-border/40"
            >
              閉じる
            </button>
          </>
        )}
      </div>
      {error && (
        <p className="mt-1 text-[11px] font-medium text-negative" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: `CashflowTimeline.tsx` に import を追加**

`app/cashflow/CashflowTimeline.tsx:1-8` を以下に置き換える。

変更前:
```tsx
"use client";

import { useState } from "react";
import type { AccountRollingCashflow, RollingEvent, RollingLocation } from "@/lib/cashflow-queries";
import { KIND_LABEL } from "@/lib/cashflow/kinds";
import { yen, shortDate } from "@/lib/format";
import { OccurrenceActions } from "@/app/cashflow/OccurrenceActions";
```

変更後:
```tsx
"use client";

import { useState } from "react";
import type { AccountRollingCashflow, RollingEvent, RollingLocation } from "@/lib/cashflow-queries";
import { KIND_LABEL } from "@/lib/cashflow/kinds";
import { yen, shortDate } from "@/lib/format";
import { OccurrenceActions } from "@/app/cashflow/OccurrenceActions";
import { CardChargeOccurrenceActions } from "@/app/cashflow/CardChargeOccurrenceActions";
```

- [ ] **Step 3: 行レンダリングに変動カード引落の操作を追加**

`app/cashflow/CashflowTimeline.tsx:159-187` を以下に置き換える。

変更前:
```tsx
                {rolling.matrix.rows.map((row, i) => {
                  const event = row.event;
                  const isRecurring =
                    event.kind === "income" &&
                    event.source === "recurring" &&
                    event.recurringId != null &&
                    event.occurrenceDate != null;
                  return (
                    <tr key={`${event.date}-${event.source}-${i}`} className="border-b border-border/60 align-top last:border-b-0">
                      <th scope="row" className="whitespace-nowrap py-2 pr-3 text-left text-xs font-normal text-muted">
                        {shortDate(event.date)}
                      </th>
                      <td className="min-w-44 py-2 pr-3 text-xs text-foreground">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span>{event.name}</span>
                          {event.source === "card_charge" && event.estimated && (
                            <span className="rounded-full bg-border/60 px-2 py-0.5 text-[10px] font-medium text-muted">
                              {event.amount === 0 ? "当月利用なし" : "見込み"}
                            </span>
                          )}
                          {isRecurring && (
                            <OccurrenceActions
                              recurringId={event.recurringId!}
                              occurrenceDate={event.occurrenceDate!}
                              status={event.status}
                            />
                          )}
                        </div>
                      </td>
```

変更後:
```tsx
                {rolling.matrix.rows.map((row, i) => {
                  const event = row.event;
                  const isRecurring =
                    event.kind === "income" &&
                    event.source === "recurring" &&
                    event.recurringId != null &&
                    event.occurrenceDate != null;
                  const isCardChargeVariable =
                    event.source === "card_charge" &&
                    event.amountType === "variable" &&
                    event.scheduleId != null;
                  return (
                    <tr key={`${event.date}-${event.source}-${i}`} className="border-b border-border/60 align-top last:border-b-0">
                      <th scope="row" className="whitespace-nowrap py-2 pr-3 text-left text-xs font-normal text-muted">
                        {shortDate(event.date)}
                      </th>
                      <td className="min-w-44 py-2 pr-3 text-xs text-foreground">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span>{event.name}</span>
                          {event.source === "card_charge" && event.estimated && (
                            <span className="rounded-full bg-border/60 px-2 py-0.5 text-[10px] font-medium text-muted">
                              {event.amount === 0 ? "当月利用なし" : "見込み"}
                            </span>
                          )}
                          {isRecurring && (
                            <OccurrenceActions
                              recurringId={event.recurringId!}
                              occurrenceDate={event.occurrenceDate!}
                              status={event.status}
                            />
                          )}
                          {isCardChargeVariable && (
                            <CardChargeOccurrenceActions
                              scheduleId={event.scheduleId!}
                              occurrenceDate={event.date}
                              estimated={event.estimated ?? false}
                            />
                          )}
                        </div>
                      </td>
```

- [ ] **Step 4: 型チェックを実行**

```bash
npm run build
```

Expected: `Running TypeScript ...` の後 `Finished TypeScript in ...` と表示されてビルドが完走する。

- [ ] **Step 5: コミット**

```bash
git add app/cashflow/CardChargeOccurrenceActions.tsx app/cashflow/CashflowTimeline.tsx
git commit -m "feat(mf-finance/cashflow): 変動カード引落に実額入力UIを追加"
```

---

### Task 6: エンドツーエンド検証

**Files:** なし（検証のみ）

**Interfaces:** なし

- [ ] **Step 1: フルテストスイートを実行**

```bash
npm test
```

Expected: 全件 PASS、fail 0（Task 2 で追加した5件を含む）。

- [ ] **Step 2: dev server を起動**

```bash
npm run dev
```

`http://localhost:3000/cashflow` を開く（既にポート使用中なら `npm run dev -- -p <空きポート>`）。

- [ ] **Step 3: 変動カード引落が無ければ1件登録**

「カード引落予定」セクションで、カード口座を選び「変動」を選択して1件登録する（引落日は今日から30日以内の日付にする）。

- [ ] **Step 4: 実額入力を確認**

「日付別の増減と残高」テーブルで、登録したカード引落の行（「見込み」バッジ付き）の「⋯」を開き、実額を入力して保存する。

Expected: 保存後、その行の「見込み」バッジが消え、金額欄が入力した実額に変わり、「見込み残高」「最小残高」等のサマリが再計算される。

- [ ] **Step 5: 「見込みに戻す」を確認**

同じ行の「⋯」を開き「見込みに戻す」を押す。

Expected: 「見込み」バッジが再表示され、金額が自動推定額（または当月利用なしなら¥0）に戻る。

- [ ] **Step 6: 固定額カード引落に操作が出ないことを確認**

`amount_type='fixed'` のカード引落の行を確認する。

Expected: 「⋯」ボタンが表示されない（`isCardChargeVariable` が false のため）。

- [ ] **Step 7: dev server を停止**

Ctrl+C で停止する。

- [ ] **Step 8: 最終確認とプッシュ判断**

```bash
git log --oneline main..HEAD
git status --porcelain
```

Expected: Task 1〜5 の5コミットのみ、未コミット差分なし。この後の merge/PR/discard は `superpowers:finishing-a-development-branch` に従う。
