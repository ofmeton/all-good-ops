# mf-finance: カード引落額の手入力（実額上書き）

## Context

mf-finance の `/cashflow` は、`card_charge_schedules`（カードごとの引落日・締め日）を元に、`amount_type='variable'` のカードは当月の利用実績から引落額を自動推定して資金繰り予測に反映している。この推定は「締め日までの利用実績」に基づくため、締め日直後などまだ利用データが出揃っていない時期は実際の請求額とズレることがある。カード明細で確定額が分かった時点で、その回の見込み額を実額に置き換えたい。

同種のニーズは定期収入（`recurring_items` の `amount_type='variable'`）に対してはすでに `recurring_overrides` テーブルと `OccurrenceActions` コンポーネントで実現済み（「⋯」を開いて実額を入力・保存、クリアで自動推定に戻す）。今回はこの既存パターンをカード引落にも展開する。

対象は `amount_type='variable'` のカード引落のみ（`fixed` はすでに固定額を保持しているため対象外）。「スキップ」（その回を無し扱いにする）は今回のスコープ外。

## データモデル

新規テーブル `card_charge_overrides`（`recurring_overrides` と同形。skip 列は無し、amount は必須）。

```sql
CREATE TABLE IF NOT EXISTS card_charge_overrides (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  schedule_id INTEGER NOT NULL REFERENCES card_charge_schedules(id) ON DELETE CASCADE,
  occurrence_date TEXT NOT NULL,
  amount INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  UNIQUE (schedule_id, occurrence_date)
);
CREATE INDEX IF NOT EXISTS idx_card_charge_overrides_sid ON card_charge_overrides (schedule_id);
```

`recurring_overrides` は `db/schema.sql`（`card_charge_schedules` の近く）と `db/migrate.mjs` の `applyRecurringMigrations` の両方に同じ `CREATE TABLE IF NOT EXISTS` 定義を持つ（前者が現行の完全形の記録、後者が既存DBへの適用経路）。`card_charge_overrides` も同じ形で両ファイルに追記する。カラムの追加ではなく新規テーブルなので `ALTER TABLE` は不要。

## ロジック層（`lib/cashflow/rolling.mjs`）

- `indexCardChargeOverrides(arr)` を追加。`indexOverrides` と同形で、`${schedule_id}|${occurrence_date}` をキーにした Map を返す。
- `expandCardChargeSchedules({ schedules, today, days, variableByPeriod, overrides })` に `overrides`（Map、デフォルト空）を追加する。各 occurrence 生成時、`amountType === 'variable'` かつ `overrides.get(`${schedule.id}|${date}`)` が存在すれば、その `amount` を採用し `estimated:false` にする。存在しなければ現状どおり `variableByPeriod` から自動推定し `estimated:true`。
- 各 occurrence の戻り値に `scheduleId`（`schedule.id`）を追加する（`recurringId` と対になるフィールド）。

## クエリ・アクション層

- `lib/cashflow-queries.ts`
  - `getCardChargeOverrides(): { schedule_id: number; occurrence_date: string; amount: number }[]` を追加（単純 SELECT）。
  - `expandCardCharges()` 内でこれを取得し、`expandCardChargeSchedules` へ渡す。
- `lib/actions.ts`
  - `setCardChargeOverride(scheduleId: number, date: string, amount: number): Promise<void>`
    - `ensureId` / `ensureIsoDate` / `positiveOverrideAmount` を再利用。
    - 対象スケジュールを取得し、存在しない場合・`amount_type !== 'variable'` の場合はエラー。
    - `card_charge_overrides` へ upsert（`ON CONFLICT(schedule_id, occurrence_date) DO UPDATE`）。
    - `revalidatePath("/")`, `revalidatePath("/cashflow")`。
  - `clearCardChargeOverride(scheduleId: number, date: string): Promise<void>`
    - 同様の検証後、該当行を DELETE。

## UI

- 新規 `app/cashflow/CardChargeOccurrenceActions.tsx`
  - `OccurrenceActions` と同じ視覚・操作（⋯ボタンで展開 → 実額入力欄 → 保存 → 戻す → 閉じる）。スキップボタンは無し。
  - props: `scheduleId: number`, `occurrenceDate: string`, `estimated: boolean`。
- `app/cashflow/CashflowTimeline.tsx`
  - 既存の `event.source === "recurring" && event.recurringId != null` 分岐の並びに、`event.source === "card_charge" && event.amountType === "variable" && event.scheduleId != null` の分岐を追加し `CardChargeOccurrenceActions` を表示する。
  - 上書き済み（`estimated === false` だが元がカード変動引落）の行は、現行の「見込み」バッジを表示しない（=確定額として扱う）。

## エラーハンドリング

`setOccurrenceOverride` と同じ方針：不正な `scheduleId` / 日付フォーマット / 0以下の金額はサーバー側で拒否。加えて `amount_type='fixed'` のスケジュールに対する上書き試行はサーバー側でも拒否する（UI 側でも `fixed` の行にはボタンを出さないが、二重に守る）。

## テスト

`lib/cashflow/rolling.mjs` の既存 node:test スイート（`test/*.mjs`）に以下を追加する。
- 上書きが存在する occurrence は override の金額を採用し `estimated:false` になること
- 上書きが無い occurrence は従来どおり自動推定 (`estimated:true`) のままであること
- `fixed` 型のスケジュールに overrides を渡しても影響しないこと（対象外の確認）

## スコープ外（今回やらないこと）

- スキップ機能（その回を無しとして扱う）
- `amount_type='fixed'` のスケジュールへの実額上書き
- ホーム画面の「引落予定 vs 残高」（`PayoutCalendar`）側の反映 — これは `recurring_items` のみを見ており `card_charge_schedules` を参照していない別ロジックのため、今回のスコープには含まない
