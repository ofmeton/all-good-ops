# 民泊清掃管理アプリ Plan 3: 通知・カレンダー・オーナー画面・仕上げ 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 設計書 1〜9章を完全に充足する状態に仕上げる。LINE/メール通知（冪等性付き）と Vercel Cron（前日リマインド・24h未割当アラート・写真期限切れ削除）を導入し、管理者カレンダー・物件オーナー閲覧画面・管理者管理画面を実装、Plan 2 持ち越し（写真リサイズ・submitReport トランザクション・連続予約警告等）も完結させる。

**Architecture:** Plan 1/2 の基盤（service role DB アクセス・状態機械・assertActor 系の認可）の上に、(a) 通知レイヤ（`db/notifications.ts` + `lib/notify.ts` + チャネル別アダプタ `lib/line.ts` / `lib/email.ts`）を追加し既存トリガー点に配線、(b) Vercel Cron Job を3本立てて時刻起動の処理（リマインド/アラート/写真削除）をサーバ側で実行、(c) 既存のデータアクセスを再利用してカレンダー・オーナー閲覧・管理者管理の3画面を組み立てる。通知の冪等性は `notifications_log` の `kind+recipient+対象key+日付` でガード。

**通知チャネル選定方針（コスト 0 円運用）:** LINE Messaging API は月200通の無料枠を維持するため、**LINE で送る kind は `request_created` のみ**（依頼作成を担当スタッフへ即時通知。納品先業務で「調整時間がボトルネック」のためここに即時性を投資する判断）。他の kind（`reminder` / `report_submitted` / `request_confirmed` / `supply_requested` / `unassigned_alert`）はメール（Resend、月3000通無料枠）のみ。`notify.ts` 内に `LINE_ENABLED_KINDS` ホワイトリストを置き、kind に応じて LINE 経路を自動的にスキップする。リマインダーは前日17:00 メール送信（業務開始前に開けば十分）。

**運用規模試算（納品先想定）:** 物件 5〜10軒・1軒あたり月10依頼・1依頼あたり担当スタッフ平均2人 → 月 LINE 通知数 100〜200通。LINE 無料枠 200通の範囲内に収まる。10軒運用は枠ぎりぎりなので、その時点で `notifications_log`（`channel='line' AND status='sent'`）の月次推移を見て、ライトプラン（5,000円/月・月5,000通枠）契約を検討する。納品時に運用見守りポイントとして引き継ぐ。

**Tech Stack:** Next.js 16（App Router, TypeScript）/ Supabase（Postgres, Storage, Auth）/ Tailwind CSS / Vitest / Playwright / Vercel Cron / LINE Messaging API（@line/bot-sdk）/ Resend（@resend/node）/ sharp（画像リサイズ）

設計書: `outputs/clients/minpaku-cleaning/docs/2026-05-14-design.md`
Plan 1 計画書: `outputs/clients/minpaku-cleaning/docs/2026-05-14-plan-1-foundation.md`
Plan 2 計画書: `outputs/clients/minpaku-cleaning/docs/2026-05-15-plan-2-request-flow.md`
アプリのルート: `outputs/clients/minpaku-cleaning/app/`（以下、パスはこのディレクトリ基準）

**Plan 3 で完結するもの（Plan 1/2 の持ち越し含む）:**
- 通知（LINE/メール）の発火点（Plan 2 で `// TODO(Plan 3): 通知` を残した4箇所）
- `notifications_log` の索引・status 整合性（Plan 1 review 持ち越し）
- 写真の期限切れ自動削除（Plan 2 持ち越し、`deletePhoto` を Cron から利用）
- 写真リサイズ/圧縮（Plan 2 持ち越し、`sharp` 採用）
- `submitReport` のトランザクション化（Plan 2 review 持ち越し、Postgres RPC）
- `StaffOnlyError` の 403 マッピング（Plan 2 review 持ち越し）
- 連続予約警告（Plan 2 持ち越し、設計書6章の UI 警告）
- カレンダービュー（設計書5章）
- 物件オーナー閲覧画面（`/property/[token]`、設計書5章）
- 管理者管理画面（`/admin/admins`、設計書5章）
- 通知冪等性のテスト（設計書9章テスト方針 #4）

**Plan 3 のスコープ外:** 設計書10章「将来展望」（会計機能・OTA自動連携）は本納品スコープ外（Plan 1 doc で明示）。

---

## Plan 1/2 からの前提（実装済み・変更しない）

- `src/lib/supabase-server.ts` → `createServiceClient()`
- `src/lib/supabase-auth.ts` → `resolveAdminActor()`、`createAuthClient()`
- `src/lib/auth.ts` → `Actor` 型・`resolveActorByToken(token)`
- `src/lib/status-machine.ts` → `CleaningStatus` 型・`assertTransition`・`InvalidTransitionError`
- `src/lib/storage.ts` → `uploadReportPhoto` / `getPhotoSignedUrl` / `deletePhoto`
- `src/lib/db/{scope,properties,owners,staff,tokens,requests,reports,supplies}.ts`
- `src/proxy.ts` → 管理者ルート用 `x-pathname` middleware
- `src/app/admin/{login,layout,page,properties,owners,staff,requests,supplies,TokenControls}` — 管理者画面群
- `src/app/staff/[token]/...` — スタッフ画面群
- `src/app/api/admin/{properties,owners,staff,requests,tokens}` / `src/app/api/staff/{requests,photos,supplies}` — API ルート群
- migrations 0001〜0004 適用済み
- テスト基盤: `tests/helpers/reset-db.ts` の `resetDb()`、`vitest.config.ts` の `fileParallelism: false`、`tests/__mocks__/server-only.ts`、`playwright.config.ts`
- 全 vitest テスト 59 件 PASS、E2E 1 件 PASS、build 成功

**通知発火点の `// TODO(Plan 3): 通知` コメント位置:**
- `src/lib/db/requests.ts` `createRequest` 内 — 「依頼作成時に担当スタッフへ通知」
- `src/lib/db/requests.ts` `confirmRequest` 内 — 「確認完了時に物件オーナーへ通知」
- `src/lib/db/reports.ts` `submitReport` 内 — 「完了報告時に管理者へ通知」
- `src/lib/db/supplies.ts` `createSupplyRequest` 内 — 「備品補充依頼時に管理者＋オーナーへ通知」

---

## ファイル構成

```
outputs/clients/minpaku-cleaning/app/
  supabase/migrations/
    0005_notifications_polish.sql  notifications_log の索引・status 整合性
  src/lib/
    line.ts                        LINE Messaging API アダプタ（pushMessage）
    email.ts                       Resend アダプタ（sendMail）
    notify.ts                      通知ディスパッチャ（受信者解決＋冪等性＋ログ）
    image.ts                       sharp による画像リサイズ・圧縮
    cron-auth.ts                   Vercel Cron 認証（CRON_SECRET ヘッダー）
    db/
      notifications.ts             notifications_log のデータアクセス
      admins.ts                    管理者管理（追加・削除・role_level）
  src/app/
    admin/
      calendar/page.tsx            月別カレンダー
      admins/page.tsx              管理者一覧＋追加・削除
      admins/AdminForm.tsx         管理者追加フォーム
      requests/[id]/RequestActions.tsx 連続予約警告を追加（Modify）
      page.tsx                     ダッシュボード（Modify: 当月の依頼ハイライト）
    property/
      [token]/layout.tsx           オーナー認証ガード（無効トークンは専用エラー）
      [token]/page.tsx             オーナー閲覧画面（物件・カレンダー・履歴・写真・備品履歴）
    api/
      admin/admins/route.ts        管理者 CRUD
      admin/calendar/data/route.ts カレンダーデータ取得（任意。ページが server fetch で取る場合は不要）
      cron/remind/route.ts         前日17:00 リマインド cron
      cron/unassigned-alerts/route.ts 24h 未割当アラート cron
      cron/cleanup-photos/route.ts 写真期限切れ削除 cron
  vercel.json                      Vercel Cron 定義
  .env.local.example               追加: LINE/Resend/CRON_SECRET の例
  tests/
    lib/notify.test.ts             通知ディスパッチャ＋冪等性
    db/notifications.test.ts       notifications_log データアクセス
    db/admins.test.ts              admins データアクセス
    api/cron.test.ts               cron 認証（オプション、ユニット可能なら）
  e2e/
    owner-view.spec.ts             オーナー画面スモーク（Plan 3 で追加・必要最小限）
```

各 `src/lib/` のファイルは 1 責務。`src/lib/notify.ts` がチャネル別アダプタ（`line.ts`/`email.ts`）と DB 層（`db/notifications.ts`）を統合する。Cron ルートは認証ヘッダーチェックの後、既存のデータ層 + `notify.ts` を呼ぶだけにする。

---

## Task 1: migration 0005 — notifications_log polish

Plan 1 review 持ち越し: `notifications_log.status` を CHECK 制約で値を絞り、検索用索引を追加する。本タスクは通知実装の前提。

**Files:**
- Create: `supabase/migrations/0005_notifications_polish.sql`

- [ ] **Step 1: マイグレーション SQL を作成**

`supabase/migrations/0005_notifications_polish.sql`:
```sql
-- 民泊清掃管理アプリ migration 0005: notifications_log の整合性と索引
-- Plan 1 code review 持ち越し。Plan 3 通知実装の前提。
-- 0001〜0004 は改変しない。

-- status の値域を固定。実装側 (Plan 3 notify.ts) も同じ値しか書かない。
alter table notifications_log
  add constraint chk_notifications_status check (
    status in ('queued', 'sent', 'failed', 'skipped')
  );

-- 冪等性チェック用の索引（同一 kind + recipient + 直近で送信済みかを引きやすくする）。
create index idx_notifications_kind_recipient_sent
  on notifications_log(kind, recipient, sent_at desc);

-- 送信失敗の管理画面表示・再送判断用（status='failed' を時刻順で引きやすくする）。
create index idx_notifications_failed on notifications_log(sent_at desc)
  where status = 'failed';
```

- [ ] **Step 2: マイグレーションを適用**

```bash
cd outputs/clients/minpaku-cleaning/app
npx supabase db reset
```
0001→0002→0003→0004→0005 が適用される。エラーなく完了することを確認。

- [ ] **Step 3: 適用結果を確認**

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "\d notifications_log" | grep -E "chk_notifications_status|idx_notifications_kind_recipient_sent|idx_notifications_failed"
```
Expected: 3つの制約・索引が表示される。

- [ ] **Step 4: Commit**

```bash
cd outputs/clients/minpaku-cleaning
git add app/supabase/migrations/0005_notifications_polish.sql
git commit -m "feat: migration 0005 — notifications_log の status 値域と索引"
```

---

## Task 2: notifications_log データアクセス（db/notifications.ts）

通知ログの記録と冪等性チェック。`logNotification` で記録し、`hasSentToday(kind, recipient)` で当日重複を防ぐ。

**Files:**
- Create: `src/lib/db/notifications.ts`
- Test: `tests/db/notifications.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

`tests/db/notifications.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from "vitest";
import {
  logNotification,
  hasSentToday,
  type NotificationChannel,
  type NotificationStatus,
} from "@/lib/db/notifications";
import { createServiceClient } from "@/lib/supabase-server";
import { resetDb } from "../helpers/reset-db";

const db = createServiceClient();

beforeEach(async () => {
  await resetDb();
  await db.from("notifications_log").delete().not("id", "is", null);
});

describe("notifications_log データアクセス", () => {
  it("logNotification は status='sent' で行を作成する", async () => {
    const row = await logNotification({
      channel: "email",
      recipient: "a@example.com",
      kind: "request_created",
      payload: { requestId: "req-1" },
      status: "sent",
    });
    expect(row.id).toBeTruthy();
    expect(row.status).toBe("sent");
  });

  it("logNotification は status='failed' でも記録する", async () => {
    const row = await logNotification({
      channel: "line",
      recipient: "U123",
      kind: "request_created",
      payload: { error: "rate_limit" },
      status: "failed",
    });
    expect(row.status).toBe("failed");
  });

  it("hasSentToday は同日内の sent を true にする", async () => {
    await logNotification({
      channel: "email",
      recipient: "a@example.com",
      kind: "reminder",
      payload: { date: "2026-06-01" },
      status: "sent",
    });
    expect(await hasSentToday("reminder", "a@example.com")).toBe(true);
  });

  it("hasSentToday は status='failed' は重複扱いにしない", async () => {
    await logNotification({
      channel: "email",
      recipient: "a@example.com",
      kind: "reminder",
      payload: {},
      status: "failed",
    });
    expect(await hasSentToday("reminder", "a@example.com")).toBe(false);
  });

  it("hasSentToday は別 recipient は別カウント", async () => {
    await logNotification({
      channel: "email",
      recipient: "a@example.com",
      kind: "reminder",
      payload: {},
      status: "sent",
    });
    expect(await hasSentToday("reminder", "b@example.com")).toBe(false);
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npm test -- notifications`
Expected: FAIL（`@/lib/db/notifications` が存在しない）

- [ ] **Step 3: データアクセスを実装**

`src/lib/db/notifications.ts`:
```typescript
import "server-only";
import { createServiceClient } from "@/lib/supabase-server";

export type NotificationChannel = "line" | "email";
export type NotificationStatus = "queued" | "sent" | "failed" | "skipped";

export type NotificationKind =
  | "request_created"     // 依頼作成 → スタッフ
  | "report_submitted"    // 完了報告 → 管理者
  | "request_confirmed"   // 確認完了 → オーナー
  | "supply_requested"    // 備品補充 → 管理者・オーナー
  | "reminder"            // 前日17:00 リマインド → スタッフ
  | "unassigned_alert";   // 24h 未割当 → 管理者・オーナー

export type LogNotificationInput = {
  channel: NotificationChannel;
  recipient: string;
  kind: NotificationKind;
  payload: Record<string, unknown>;
  status: NotificationStatus;
};

export type NotificationLog = {
  id: string;
  channel: NotificationChannel;
  recipient: string;
  kind: string;
  payload: Record<string, unknown> | null;
  status: NotificationStatus;
  sent_at: string;
};

// 通知ログを1行記録する。送信成功・失敗・スキップいずれも記録する。
export async function logNotification(
  input: LogNotificationInput,
): Promise<NotificationLog> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("notifications_log")
    .insert({
      channel: input.channel,
      recipient: input.recipient,
      kind: input.kind,
      payload: input.payload,
      status: input.status,
    })
    .select()
    .single();
  if (error) throw error;
  return data as NotificationLog;
}

// 同一 kind+recipient で当日中に status='sent' のログがあるか。
// 冪等性: Cron 系の繰り返し送信（リマインド・アラート）の重複を防ぐ。
export async function hasSentToday(
  kind: NotificationKind,
  recipient: string,
): Promise<boolean> {
  const db = createServiceClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { data, error } = await db
    .from("notifications_log")
    .select("id")
    .eq("kind", kind)
    .eq("recipient", recipient)
    .eq("status", "sent")
    .gte("sent_at", today.toISOString())
    .limit(1);
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npm test -- notifications`
Expected: PASS（5 passed）

- [ ] **Step 5: Commit**

```bash
cd outputs/clients/minpaku-cleaning
git add app/src/lib/db/notifications.ts app/tests/db/notifications.test.ts
git commit -m "feat: notifications_log データアクセス（記録と冪等性チェック）"
```

---

## Task 3: LINE Messaging API アダプタ（lib/line.ts）

LINE Messaging API への push 送信。チャネルトークンは環境変数。本実装では `@line/bot-sdk` を使う。送信エラーは throw し、呼び出し側（notify.ts）が status='failed' でログする。

**Files:**
- Create: `src/lib/line.ts`
- Modify: `package.json`（`@line/bot-sdk` を追加）
- Modify: `.env.local.example`（`LINE_CHANNEL_ACCESS_TOKEN` を追記）

- [ ] **Step 1: 依存を追加**

```bash
cd outputs/clients/minpaku-cleaning/app
npm install @line/bot-sdk
```

- [ ] **Step 2: .env.local.example に追記**

`.env.local.example` の末尾に追加:
```
# LINE Messaging API（Plan 3 通知）
LINE_CHANNEL_ACCESS_TOKEN=
```
ローカル開発では空のままで OK。空の場合 `pushLineMessage` は throw し、`notify.ts` が status='skipped' で記録する。

- [ ] **Step 3: lib/line.ts を実装**

`src/lib/line.ts`:
```typescript
import "server-only";
import { Client } from "@line/bot-sdk";

// LINE Messaging API push。lineUserId / message のみのシンプルなテキスト push。
// LINE_CHANNEL_ACCESS_TOKEN が未設定なら例外を投げる（notify.ts が status='skipped' で扱う）。
export async function pushLineMessage(
  lineUserId: string,
  message: string,
): Promise<void> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    throw new Error("LINE_CHANNEL_ACCESS_TOKEN が未設定です");
  }
  const client = new Client({ channelAccessToken: token });
  await client.pushMessage(lineUserId, {
    type: "text",
    text: message,
  });
}
```

- [ ] **Step 4: 動作確認**

`npm run build` がエラーなく通ることだけ確認する（実 push のユニットテストはモックの複雑さに見合わない・E2E 範囲外）。

Run: `npm run build`
Expected: ビルド成功。

- [ ] **Step 5: Commit**

```bash
cd outputs/clients/minpaku-cleaning
git add app/src/lib/line.ts app/package.json app/package-lock.json app/.env.local.example
git commit -m "feat: LINE Messaging API アダプタ（pushLineMessage）"
```

---

## Task 4: Email/Resend アダプタ（lib/email.ts）

メール送信。Resend を使う（無料枠想定・設計書7章）。API キーは環境変数。送信元は `MINPAKU_FROM_EMAIL`（デフォルト `onboarding@resend.dev`、Resend の動作確認用 from）。

**Files:**
- Create: `src/lib/email.ts`
- Modify: `package.json`（`resend` を追加）
- Modify: `.env.local.example`（`RESEND_API_KEY`、`MINPAKU_FROM_EMAIL` 追記）

- [ ] **Step 1: 依存を追加**

```bash
cd outputs/clients/minpaku-cleaning/app
npm install resend
```

- [ ] **Step 2: .env.local.example に追記**

`.env.local.example` の末尾に追加:
```
# Resend（Plan 3 通知）
RESEND_API_KEY=
MINPAKU_FROM_EMAIL=onboarding@resend.dev
```

- [ ] **Step 3: lib/email.ts を実装**

`src/lib/email.ts`:
```typescript
import "server-only";
import { Resend } from "resend";

// Resend で plain text メールを送る。RESEND_API_KEY 未設定時は throw。
export async function sendMail(
  to: string,
  subject: string,
  text: string,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY が未設定です");
  }
  const from = process.env.MINPAKU_FROM_EMAIL ?? "onboarding@resend.dev";
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({ from, to, subject, text });
  if (error) {
    throw new Error(`Resend send failed: ${error.message ?? error.name}`);
  }
}
```

- [ ] **Step 4: 動作確認** — Run: `npm run build` — Expected: ビルド成功。

- [ ] **Step 5: Commit**

```bash
cd outputs/clients/minpaku-cleaning
git add app/src/lib/email.ts app/package.json app/package-lock.json app/.env.local.example
git commit -m "feat: Resend メール送信アダプタ（sendMail）"
```

---

## Task 5: 通知ディスパッチャ（lib/notify.ts）

LINE 優先＋メールフォールバックの送信ロジック、受信者解決ヘルパー、冪等性チェックを統合する。本タスクの実装で `notify(kind, recipients, message, payload, opts)` が API/cron から1関数で呼べる状態になる。

**Files:**
- Create: `src/lib/notify.ts`
- Test: `tests/lib/notify.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

`tests/lib/notify.test.ts`:
```typescript
import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

// 外部 IO は完全モック
vi.mock("@/lib/line", () => ({ pushLineMessage: vi.fn() }));
vi.mock("@/lib/email", () => ({ sendMail: vi.fn() }));

import { notify } from "@/lib/notify";
import { pushLineMessage } from "@/lib/line";
import { sendMail } from "@/lib/email";
import { createServiceClient } from "@/lib/supabase-server";
import { resetDb } from "../helpers/reset-db";

const db = createServiceClient();
const pushLineMock = pushLineMessage as unknown as Mock;
const sendMailMock = sendMail as unknown as Mock;

beforeEach(async () => {
  await resetDb();
  await db.from("notifications_log").delete().not("id", "is", null);
  pushLineMock.mockReset();
  sendMailMock.mockReset();
});

describe("notify", () => {
  it("kind が request_created（LINE 対象）かつ line_user_id があれば LINE で送信する", async () => {
    pushLineMock.mockResolvedValue(undefined);
    await notify(
      "request_created",
      [{ line_user_id: "U1", email: "x@example.com", key: "staff:s1" }],
      { subject: "新規依頼", text: "..." },
      { requestId: "r1" },
    );
    expect(pushLineMock).toHaveBeenCalledTimes(1);
    expect(sendMailMock).not.toHaveBeenCalled();
    const { data: logs } = await db.from("notifications_log").select("*");
    expect(logs).toHaveLength(1);
    expect(logs![0].channel).toBe("line");
    expect(logs![0].status).toBe("sent");
  });

  it("kind が LINE 対象外（reminder）なら line_user_id があってもメール直行", async () => {
    sendMailMock.mockResolvedValue(undefined);
    await notify(
      "reminder",
      [{ line_user_id: "U1", email: "x@example.com", key: "staff:s1" }],
      { subject: "明日の予定", text: "..." },
      {},
    );
    expect(pushLineMock).not.toHaveBeenCalled();
    expect(sendMailMock).toHaveBeenCalledTimes(1);
    const { data: logs } = await db.from("notifications_log").select("*");
    expect(logs).toHaveLength(1);
    expect(logs![0].channel).toBe("email");
    expect(logs![0].status).toBe("sent");
  });

  it("request_created で LINE 失敗時はメールにフォールバックする", async () => {
    pushLineMock.mockRejectedValue(new Error("LINE rate limit"));
    sendMailMock.mockResolvedValue(undefined);
    await notify(
      "request_created",
      [{ line_user_id: "U1", email: "x@example.com", key: "staff:s1" }],
      { subject: "S", text: "T" },
      {},
    );
    expect(pushLineMock).toHaveBeenCalledTimes(1);
    expect(sendMailMock).toHaveBeenCalledTimes(1);
    const { data: logs } = await db
      .from("notifications_log").select("*").order("sent_at", { ascending: true });
    expect(logs).toHaveLength(2);
    expect(logs![0].status).toBe("failed");
    expect(logs![0].channel).toBe("line");
    expect(logs![1].status).toBe("sent");
    expect(logs![1].channel).toBe("email");
  });

  it("LINE も email も無ければ skipped を記録する", async () => {
    await notify(
      "request_created",
      [{ line_user_id: null, email: null, key: "staff:s1" }],
      { subject: "S", text: "T" },
      {},
    );
    expect(pushLineMock).not.toHaveBeenCalled();
    expect(sendMailMock).not.toHaveBeenCalled();
    const { data: logs } = await db.from("notifications_log").select("*");
    expect(logs).toHaveLength(1);
    expect(logs![0].status).toBe("skipped");
  });

  it("dedupeToday=true は同日内の同 kind+recipient 重複を抑制する", async () => {
    sendMailMock.mockResolvedValue(undefined);
    // dedupe テストは LINE 対象外の reminder（=メール経路）で行う
    await notify(
      "reminder",
      [{ line_user_id: null, email: "x@example.com", key: "staff:s1" }],
      { subject: "明日の予定", text: "..." },
      {},
      { dedupeToday: true },
    );
    await notify(
      "reminder",
      [{ line_user_id: null, email: "x@example.com", key: "staff:s1" }],
      { subject: "明日の予定", text: "..." },
      {},
      { dedupeToday: true },
    );
    expect(sendMailMock).toHaveBeenCalledTimes(1);
    const { data: logs } = await db
      .from("notifications_log").select("status").order("sent_at", { ascending: true });
    expect(logs?.map((l) => l.status)).toEqual(["sent", "skipped"]);
  });

  it("複数受信者を並行に処理する（request_created で1人 LINE 失敗が他に影響しない）", async () => {
    pushLineMock
      .mockRejectedValueOnce(new Error("rate limit"))
      .mockResolvedValueOnce(undefined);
    sendMailMock.mockResolvedValue(undefined);
    await notify(
      "request_created",
      [
        { line_user_id: "U1", email: "a@example.com", key: "staff:1" },
        { line_user_id: "U2", email: "b@example.com", key: "staff:2" },
      ],
      { subject: "S", text: "T" },
      {},
    );
    // 1人目: LINE失敗→email成功（ログ2件）、2人目: LINE成功（ログ1件）= 計3件
    const { data: logs } = await db.from("notifications_log").select("*");
    expect(logs).toHaveLength(3);
    const sent = logs!.filter((l) => l.status === "sent");
    expect(sent).toHaveLength(2);
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npm test -- notify`
Expected: FAIL（`@/lib/notify` が存在しない）

- [ ] **Step 3: ディスパッチャを実装**

`src/lib/notify.ts`:
```typescript
import "server-only";
import { createServiceClient } from "@/lib/supabase-server";
import { pushLineMessage } from "@/lib/line";
import { sendMail } from "@/lib/email";
import {
  logNotification,
  hasSentToday,
  type NotificationKind,
} from "@/lib/db/notifications";

export type NotifyRecipient = {
  line_user_id: string | null;
  email: string | null;
  // 冪等性・ログのための安定キー（例: "staff:<uuid>" / "admin:<uuid>" / "owner:<uuid>"）
  key: string;
};

export type NotifyMessage = { subject: string; text: string };

// LINE で送る kind を絞る（LINE 無料枠 200通/月 維持のため）。
// request_created のみ LINE 対象（依頼作成 → 担当スタッフへの即時通知。
// 納品先業務で「調整時間」がボトルネックのため即時性を投資する）。
// 他は line_user_id があってもメールに直行する。
const LINE_ENABLED_KINDS = new Set<NotificationKind>(["request_created"]);

// 1名に LINE→Email の優先順で送信。LINE 失敗時はメールにフォールバックする。
// kind が LINE 対象外 (LINE_ENABLED_KINDS 外) のときは LINE をスキップして即メール。
// dedupeToday=true なら同 kind+recipient.key の status='sent' が当日内にあれば skipped で記録する。
async function notifyOne(
  kind: NotificationKind,
  recipient: NotifyRecipient,
  message: NotifyMessage,
  payload: Record<string, unknown>,
  dedupeToday: boolean,
): Promise<void> {
  if (dedupeToday && (await hasSentToday(kind, recipient.key))) {
    await logNotification({
      channel: recipient.line_user_id ? "line" : "email",
      recipient: recipient.key,
      kind,
      payload: { ...payload, skipped_reason: "duplicate_today" },
      status: "skipped",
    });
    return;
  }

  if (recipient.line_user_id && LINE_ENABLED_KINDS.has(kind)) {
    try {
      await pushLineMessage(
        recipient.line_user_id,
        `${message.subject}\n${message.text}`,
      );
      await logNotification({
        channel: "line",
        recipient: recipient.key,
        kind,
        payload,
        status: "sent",
      });
      return;
    } catch (e) {
      await logNotification({
        channel: "line",
        recipient: recipient.key,
        kind,
        payload: { ...payload, error: (e as Error).message },
        status: "failed",
      });
      // メールにフォールバック
    }
  }

  if (recipient.email) {
    try {
      await sendMail(recipient.email, message.subject, message.text);
      await logNotification({
        channel: "email",
        recipient: recipient.key,
        kind,
        payload,
        status: "sent",
      });
      return;
    } catch (e) {
      await logNotification({
        channel: "email",
        recipient: recipient.key,
        kind,
        payload: { ...payload, error: (e as Error).message },
        status: "failed",
      });
      return;
    }
  }

  // LINE も email も未登録
  await logNotification({
    channel: "email",
    recipient: recipient.key,
    kind,
    payload: { ...payload, skipped_reason: "no_contact" },
    status: "skipped",
  });
}

// 複数受信者に並行送信。1人の失敗が他に波及しない（Promise.allSettled）。
export async function notify(
  kind: NotificationKind,
  recipients: NotifyRecipient[],
  message: NotifyMessage,
  payload: Record<string, unknown> = {},
  opts: { dedupeToday?: boolean } = {},
): Promise<void> {
  await Promise.allSettled(
    recipients.map((r) =>
      notifyOne(kind, r, message, payload, opts.dedupeToday ?? false),
    ),
  );
}

// ---- 受信者解決ヘルパー ----

// 指定された staff ID 群を受信者形式で取得。
export async function resolveStaffRecipients(
  staffIds: string[],
): Promise<NotifyRecipient[]> {
  if (staffIds.length === 0) return [];
  const db = createServiceClient();
  const { data, error } = await db
    .from("staff")
    .select("id, line_user_id, email")
    .in("id", staffIds);
  if (error) throw error;
  return (data ?? []).map((s) => ({
    line_user_id: s.line_user_id,
    email: s.email,
    key: `staff:${s.id}`,
  }));
}

// 全管理者を受信者形式で取得（管理者は LINE 不使用、email のみ）。
export async function resolveAllAdmins(): Promise<NotifyRecipient[]> {
  const db = createServiceClient();
  const { data, error } = await db.from("admins").select("id, email");
  if (error) throw error;
  return (data ?? []).map((a) => ({
    line_user_id: null,
    email: a.email,
    key: `admin:${a.id}`,
  }));
}

// 物件のオーナーを受信者形式で取得（オーナーは LINE/Email 両方あり得る）。
export async function resolveOwnerForProperty(
  propertyId: string,
): Promise<NotifyRecipient | null> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("properties")
    .select("owner_id, owners(id, line_user_id, email)")
    .eq("id", propertyId)
    .maybeSingle();
  if (error) throw error;
  const owner = (data?.owners as unknown) as
    | { id: string; line_user_id: string | null; email: string | null }
    | null;
  if (!owner) return null;
  return {
    line_user_id: owner.line_user_id,
    email: owner.email,
    key: `owner:${owner.id}`,
  };
}

// 物件の担当スタッフ全員を受信者形式で取得。
export async function resolveStaffForProperty(
  propertyId: string,
): Promise<NotifyRecipient[]> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("staff_assignments")
    .select("staff:staff_id(id, line_user_id, email)")
    .eq("property_id", propertyId);
  if (error) throw error;
  return (data ?? [])
    .map(
      (row) =>
        row.staff as unknown as {
          id: string;
          line_user_id: string | null;
          email: string | null;
        } | null,
    )
    .filter(
      (s): s is { id: string; line_user_id: string | null; email: string | null } =>
        s !== null,
    )
    .map((s) => ({
      line_user_id: s.line_user_id,
      email: s.email,
      key: `staff:${s.id}`,
    }));
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npm test -- notify`
Expected: PASS（6 passed）

- [ ] **Step 5: Commit**

```bash
cd outputs/clients/minpaku-cleaning
git add app/src/lib/notify.ts app/tests/lib/notify.test.ts
git commit -m "feat: 通知ディスパッチャ（LINE/Email 優先順序・冪等性・並行送信）"
```

---

## Task 6: 通知の配線（既存トリガー点に notify を埋め込む）

Plan 2 で `// TODO(Plan 3): 通知` を残した4箇所に実通知呼び出しを入れる。即時通知（依頼作成・完了報告・確認完了・備品補充）の dedupeToday は false（イベント駆動なので重複は元々起きない）。

**Files:**
- Modify: `src/lib/db/requests.ts`（`createRequest`、`confirmRequest`）
- Modify: `src/lib/db/reports.ts`（`submitReport`）
- Modify: `src/lib/db/supplies.ts`（`createSupplyRequest`）

- [ ] **Step 1: requests.ts — createRequest に通知を組み込む**

`src/lib/db/requests.ts` の `createRequest` 末尾、`// TODO(Plan 3): 依頼作成時に担当スタッフへ通知` をその下のロジックに置き換える。最終的な末尾の `return data as CleaningRequest;` の直前にこのブロックを入れる:

まずファイル先頭の import に追加:
```typescript
import { notify, resolveStaffForProperty } from "@/lib/notify";
```

`createRequest` の `// TODO(Plan 3): 依頼作成時に担当スタッフへ通知` 行を以下に差し替える:
```typescript
  // 担当スタッフ全員に依頼作成を通知（失敗は notifications_log に記録され処理は止めない）
  const staff = await resolveStaffForProperty(input.property_id);
  await notify(
    "request_created",
    staff,
    {
      subject: "新しい清掃依頼があります",
      text: `${input.checkin_date}〜${input.checkout_date}（${input.guest_count}名）の清掃依頼が登録されました。`,
    },
    { request_id: data.id, property_id: input.property_id },
  );
```

- [ ] **Step 2: requests.ts — confirmRequest に通知を組み込む**

`src/lib/db/requests.ts` の `confirmRequest` 内、`// TODO(Plan 3): 確認完了時に物件オーナーへ通知` 行を以下に差し替える。`confirmRequest` の引数に `requestId` があるが property_id は別途取得が必要。改修済みのこの関数の冒頭 status 取得を property_id も取るように `select("status, property_id")` に変える。

まず import に `resolveOwnerForProperty` を追加（既に Step 1 で notify を import している場合は同じ行に追記）:
```typescript
import { notify, resolveStaffForProperty, resolveOwnerForProperty } from "@/lib/notify";
```

`confirmRequest` 内、現状:
```typescript
  const { data: req } = await db
    .from("cleaning_requests")
    .select("status")
    .eq("id", requestId)
    .maybeSingle();
```
を以下に変える（`property_id` を一緒に取得）:
```typescript
  const { data: req } = await db
    .from("cleaning_requests")
    .select("status, property_id")
    .eq("id", requestId)
    .maybeSingle();
```

そして `// TODO(Plan 3): 確認完了時に物件オーナーへ通知` 行を以下に差し替える:
```typescript
  // 物件オーナーに確認完了を通知
  const owner = await resolveOwnerForProperty(req.property_id);
  if (owner) {
    await notify(
      "request_confirmed",
      [owner],
      {
        subject: "清掃が完了しました",
        text: "管理者により清掃の確認が完了しました。詳細はオーナーURLからご覧ください。",
      },
      { request_id: requestId, property_id: req.property_id },
    );
  }
```

- [ ] **Step 3: reports.ts — submitReport に通知を組み込む**

`src/lib/db/reports.ts` の import に追加:
```typescript
import { notify, resolveAllAdmins } from "@/lib/notify";
```

`submitReport` 内、`// TODO(Plan 3): 完了報告時に管理者へ通知` 行を以下に差し替える:
```typescript
  // 管理者全員に完了報告を通知
  const admins = await resolveAllAdmins();
  await notify(
    "report_submitted",
    admins,
    {
      subject: "完了報告が提出されました",
      text: "スタッフから清掃の完了報告が提出されました。管理画面で内容をご確認ください。",
    },
    { request_id: requestId, report_id: report.id },
  );
```

- [ ] **Step 4: supplies.ts — createSupplyRequest に通知を組み込む**

`src/lib/db/supplies.ts` の import に追加:
```typescript
import { notify, resolveAllAdmins, resolveOwnerForProperty } from "@/lib/notify";
```

`createSupplyRequest` 内、`// TODO(Plan 3): 備品補充依頼時に管理者＋オーナーへ通知` 行を以下に差し替える:
```typescript
  // 管理者＋オーナーに備品補充依頼を通知
  const admins = await resolveAllAdmins();
  const owner = await resolveOwnerForProperty(input.property_id);
  const recipients = owner ? [...admins, owner] : admins;
  await notify(
    "supply_requested",
    recipients,
    {
      subject: "備品補充の依頼があります",
      text: `スタッフから備品補充の依頼がありました: ${input.items}`,
    },
    { supply_request_id: data.id, property_id: input.property_id },
  );
```

- [ ] **Step 5: テストが通ることを確認（既存テストへの影響を確認）**

Run: `npm test`
Expected: 全テスト PASS。既存の requests/reports/supplies テストは notify を呼ぶことになるが、テスト環境では LINE/Resend キーが未設定なので skipped 扱いで（status='skipped'）notifications_log に行が増えるだけ。テストの assertion は変えない前提なので影響なし。ただし notifications_log を読む新規テストで「skipped 行が予期せず増える」可能性に注意。`resetDb` で notifications_log は消されない（Plan 2 リセット対象外）ので、各テストファイルの beforeEach で `await db.from("notifications_log").delete().not("id", "is", null);` を最初から書いていれば影響なし。Plan 3 で書く notifications.test.ts / notify.test.ts はそれを既にやっているので OK。

> 注: `tests/helpers/reset-db.ts` の `resetDb()` に `notifications_log` も追加してもよいが、これは Plan 3 で初めて使うテーブルなので Plan 1 の helper を後追いで触らずに各テストの beforeEach で個別削除する方針とする（テスト分離が悪化したら helper に追加することを `Plan 3 review 持ち越し` に書く）。

- [ ] **Step 6: ビルドが通ることを確認**

Run: `npm run build`
Expected: ビルド成功。

- [ ] **Step 7: Commit**

```bash
cd outputs/clients/minpaku-cleaning
git add app/src/lib/db/requests.ts app/src/lib/db/reports.ts app/src/lib/db/supplies.ts
git commit -m "feat: 既存トリガー4箇所に通知配線を追加（TODO 解消）"
```

---

## Task 7: Cron 認証ヘルパー＋前日17:00 リマインド Cron

Vercel Cron は `Authorization: Bearer <CRON_SECRET>` ヘッダー付きで GET を叩く。共通の認証ヘルパーを作り、最初の Cron として「翌日の `assigned` 依頼の担当スタッフへ前日リマインド」を実装する。

**Files:**
- Create: `src/lib/cron-auth.ts`
- Create: `src/app/api/cron/remind/route.ts`
- Modify: `.env.local.example`（`CRON_SECRET` を追記）

- [ ] **Step 1: .env.local.example に追記**

`.env.local.example` の末尾に追加:
```
# Vercel Cron 認証
CRON_SECRET=
```

ローカル開発では `openssl rand -hex 32` 等で生成した値を `.env.local` に入れる。空のままだと cron API は 401 を返すので手動でも叩けない（テスト時は CRON_SECRET を明示）。

- [ ] **Step 2: cron-auth.ts を実装**

`src/lib/cron-auth.ts`:
```typescript
import "server-only";
import type { NextRequest } from "next/server";

// Vercel Cron からの呼び出しを Authorization: Bearer <CRON_SECRET> で検証する。
// CRON_SECRET 未設定時は false を返す（誤って公開エンドポイントにしないため）。
export function isCronAuthenticated(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization");
  return header === `Bearer ${secret}`;
}
```

- [ ] **Step 3: 前日17:00 リマインド Cron を実装**

`src/app/api/cron/remind/route.ts`:
```typescript
import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { isCronAuthenticated } from "@/lib/cron-auth";
import { notify, resolveStaffRecipients } from "@/lib/notify";

// 翌日の YYYY-MM-DD（JST 想定 / Node ランタイムローカルタイム）
function tomorrowDateStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

// 前日17:00 に Vercel Cron で呼ばれ、翌日チェックインの assigned 依頼の担当スタッフへ
// リマインドを送る。dedupeToday=true で重複起動を防御する。
export async function GET(req: NextRequest) {
  if (!isCronAuthenticated(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = createServiceClient();
  const tomorrow = tomorrowDateStr();
  const { data: requests, error } = await db
    .from("cleaning_requests")
    .select("id, property_id, checkin_date, checkout_date, assigned_staff_id, properties(name)")
    .eq("checkin_date", tomorrow)
    .eq("status", "assigned")
    .not("assigned_staff_id", "is", null);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const list = (requests ?? []) as Array<{
    id: string;
    property_id: string;
    checkin_date: string;
    checkout_date: string;
    assigned_staff_id: string;
    properties: { name: string } | null;
  }>;

  let sent = 0;
  for (const r of list) {
    const staff = await resolveStaffRecipients([r.assigned_staff_id]);
    await notify(
      "reminder",
      staff,
      {
        subject: "明日の清掃リマインド",
        text: `明日 ${r.checkin_date} は ${r.properties?.name ?? "物件"} の清掃です（チェックアウト: ${r.checkout_date}）。`,
      },
      { request_id: r.id, date: r.checkin_date },
      { dedupeToday: true },
    );
    sent += 1;
  }
  return NextResponse.json({ ok: true, processed: list.length, sent });
}
```

- [ ] **Step 4: ビルドが通ることを確認**

Run: `npm run build`
Expected: ビルド成功。ルート表に `/api/cron/remind` が出る。

- [ ] **Step 5: Commit**

```bash
cd outputs/clients/minpaku-cleaning
git add app/src/lib/cron-auth.ts app/src/app/api/cron/remind/route.ts app/.env.local.example
git commit -m "feat: Vercel Cron 認証ヘルパー + 前日17:00 リマインド cron"
```

---

## Task 8: 24h 未割当アラート Cron

`assignment_deadline` を過ぎても `status='unassigned'` の依頼を管理者＋オーナーにアラート通知。1時間ごとに Vercel Cron が叩く。dedupeToday=true で1日1回に絞る。

**Files:**
- Create: `src/app/api/cron/unassigned-alerts/route.ts`

- [ ] **Step 1: Cron ルートを実装**

`src/app/api/cron/unassigned-alerts/route.ts`:
```typescript
import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { isCronAuthenticated } from "@/lib/cron-auth";
import {
  notify,
  resolveAllAdmins,
  resolveOwnerForProperty,
} from "@/lib/notify";

// 1時間ごとに走り、assignment_deadline（送信+24h）を過ぎてもまだ status='unassigned'
// の依頼を管理者＋オーナーにアラート通知する。dedupeToday=true で1日1回に絞る。
export async function GET(req: NextRequest) {
  if (!isCronAuthenticated(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = createServiceClient();
  const now = new Date().toISOString();
  const { data: requests, error } = await db
    .from("cleaning_requests")
    .select("id, property_id, checkin_date, checkout_date, assignment_deadline, properties(name)")
    .eq("status", "unassigned")
    .lt("assignment_deadline", now);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const list = (requests ?? []) as Array<{
    id: string;
    property_id: string;
    checkin_date: string;
    checkout_date: string;
    properties: { name: string } | null;
  }>;

  const admins = await resolveAllAdmins();
  let processed = 0;
  for (const r of list) {
    const owner = await resolveOwnerForProperty(r.property_id);
    const recipients = owner ? [...admins, owner] : admins;
    await notify(
      "unassigned_alert",
      recipients,
      {
        subject: "未割当の清掃依頼があります",
        text: `${r.properties?.name ?? "物件"} の依頼（${r.checkin_date}〜${r.checkout_date}）が24時間を経過しても未割当です。手動割当を検討してください。`,
      },
      { request_id: r.id, property_id: r.property_id },
      { dedupeToday: true },
    );
    processed += 1;
  }
  return NextResponse.json({ ok: true, processed });
}
```

- [ ] **Step 2: ビルドが通ることを確認**

Run: `npm run build`
Expected: ビルド成功。ルート表に `/api/cron/unassigned-alerts` が出る。

- [ ] **Step 3: Commit**

```bash
cd outputs/clients/minpaku-cleaning
git add app/src/app/api/cron/unassigned-alerts/route.ts
git commit -m "feat: 24h 未割当アラート cron（管理者＋オーナー、dedupeToday）"
```

---

## Task 9: 写真期限切れ削除 Cron

`report_photos.expires_at < now()` の行を対象に、Storage の実体と DB 行の両方を削除する。Plan 2 で `storage.ts` の `deletePhoto` を idempotent に作ってあるので、それを使う。

**Files:**
- Create: `src/app/api/cron/cleanup-photos/route.ts`

- [ ] **Step 1: Cron ルートを実装**

`src/app/api/cron/cleanup-photos/route.ts`:
```typescript
import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { isCronAuthenticated } from "@/lib/cron-auth";
import { deletePhoto } from "@/lib/storage";

// 毎日1回呼ばれ、expires_at を過ぎた report_photos の Storage 実体と DB 行を削除する。
export async function GET(req: NextRequest) {
  if (!isCronAuthenticated(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = createServiceClient();
  const now = new Date().toISOString();
  const { data: expired, error } = await db
    .from("report_photos")
    .select("id, storage_path")
    .lt("expires_at", now);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const list = (expired ?? []) as Array<{ id: string; storage_path: string }>;

  let storageDeleted = 0;
  let dbDeleted = 0;
  for (const p of list) {
    try {
      await deletePhoto(p.storage_path);
      storageDeleted += 1;
    } catch {
      // 個別の Storage 削除エラーは無視（次の DB 削除は続行）。一覧は次回 cron でも再試行される。
    }
    const { error: delErr } = await db.from("report_photos").delete().eq("id", p.id);
    if (!delErr) dbDeleted += 1;
  }
  return NextResponse.json({
    ok: true,
    candidates: list.length,
    storageDeleted,
    dbDeleted,
  });
}
```

- [ ] **Step 2: ビルドが通ることを確認**

Run: `npm run build`
Expected: ビルド成功。ルート表に `/api/cron/cleanup-photos` が出る。

- [ ] **Step 3: Commit**

```bash
cd outputs/clients/minpaku-cleaning
git add app/src/app/api/cron/cleanup-photos/route.ts
git commit -m "feat: 写真期限切れ削除 cron（Storage + DB 行の両方を削除）"
```

---

## Task 10: 管理者ダッシュボード（カレンダー）

設計書5章の `/admin`「ダッシュボード（カレンダー＋一覧・全物件）」を実装。Plan 1 の `/admin/page.tsx` は仮置きだったので、当月のカレンダー＋当日以降の依頼一覧に差し替える。カレンダーは依存ライブラリを足さず、Date ベースの自前グリッドで素朴に組む（設計書スコープに収まる）。

**Files:**
- Modify: `src/app/admin/page.tsx`

- [ ] **Step 1: ダッシュボードを差し替え**

`src/app/admin/page.tsx`（全文差し替え）:
```tsx
import { resolveAdminActor } from "@/lib/supabase-auth";
import { listRequests } from "@/lib/db/requests";
import { listProperties } from "@/lib/db/properties";
import { redirect } from "next/navigation";
import Link from "next/link";

const STATUS_LABEL: Record<string, string> = {
  unassigned: "未割当",
  assigned: "割当済み",
  in_progress: "清掃中",
  reported: "報告済み",
  confirmed: "確認済み",
  cancelled: "キャンセル",
};

// 当月のカレンダーグリッドを返す。weeks[week][day] = YYYY-MM-DD or null（前月/翌月の埋め）。
function monthGrid(year: number, month: number): (string | null)[][] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startDow = first.getDay(); // 日曜=0
  const totalDays = last.getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) {
    const m = String(month + 1).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    cells.push(`${year}-${m}-${dd}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export default async function AdminDashboard() {
  const actor = await resolveAdminActor();
  if (!actor) redirect("/admin/login");
  const [requests, properties] = await Promise.all([
    listRequests(actor),
    listProperties(actor),
  ]);
  const nameById = new Map(properties.map((p) => [p.id, p.name]));

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const weeks = monthGrid(year, month);

  // 当月の依頼を日付ごとにまとめる（checkin_date 基準）。
  const byDate = new Map<string, typeof requests>();
  for (const r of requests) {
    if (!byDate.has(r.checkin_date)) byDate.set(r.checkin_date, []);
    byDate.get(r.checkin_date)!.push(r);
  }

  const todayStr = now.toISOString().slice(0, 10);
  const upcoming = requests
    .filter((r) => r.checkin_date >= todayStr && r.status !== "cancelled")
    .slice(0, 10);

  return (
    <main className="space-y-6 max-w-4xl">
      <h1 className="text-xl font-bold">
        ダッシュボード（{year}年{month + 1}月）
      </h1>

      <section className="border rounded p-3">
        <div className="grid grid-cols-7 gap-1 text-xs">
          {["日", "月", "火", "水", "木", "金", "土"].map((w) => (
            <div key={w} className="text-center text-gray-500">{w}</div>
          ))}
          {weeks.flat().map((d, i) => (
            <div
              key={i}
              className={`min-h-16 border rounded p-1 ${d ? "" : "bg-gray-50"}`}
            >
              {d && (
                <>
                  <div className="text-[10px] text-gray-500">
                    {Number(d.slice(-2))}
                  </div>
                  {(byDate.get(d) ?? []).map((r) => (
                    <Link
                      key={r.id}
                      href={`/admin/requests/${r.id}`}
                      className="block truncate underline text-[10px]"
                      title={`${nameById.get(r.property_id) ?? "?"} — ${STATUS_LABEL[r.status] ?? r.status}`}
                    >
                      {nameById.get(r.property_id) ?? "?"}
                    </Link>
                  ))}
                </>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-bold text-sm">今後の依頼（最大10件）</h2>
        <ul className="divide-y border rounded">
          {upcoming.map((r) => (
            <li key={r.id} className="px-3 py-2 text-sm flex justify-between">
              <Link href={`/admin/requests/${r.id}`} className="underline">
                {nameById.get(r.property_id) ?? "?"} / {r.checkin_date}〜{r.checkout_date}
              </Link>
              <span className="text-gray-500">
                {STATUS_LABEL[r.status] ?? r.status}
              </span>
            </li>
          ))}
          {upcoming.length === 0 && (
            <li className="px-3 py-2 text-sm text-gray-500">
              今後の依頼はありません。
            </li>
          )}
        </ul>
      </section>
    </main>
  );
}
```

- [ ] **Step 2: ビルドが通ることを確認**

Run: `npm run build`
Expected: ビルド成功。`/admin` が依然ルート表に存在する。

- [ ] **Step 3: Commit**

```bash
cd outputs/clients/minpaku-cleaning
git add app/src/app/admin/page.tsx
git commit -m "feat: 管理者ダッシュボードを当月カレンダー＋今後の依頼に差し替え"
```

---

## Task 11: 物件オーナー閲覧画面（/property/[token]）

設計書5章: 「担当物件のステータス・カレンダー・清掃履歴・完了写真/チェックリスト・備品補充依頼履歴」を1ページに集約。閲覧専用（操作なし）。トークン検証はレイアウトで（無効なら専用エラー）。

**Files:**
- Create: `src/app/property/[token]/layout.tsx`
- Create: `src/app/property/[token]/page.tsx`

- [ ] **Step 1: オーナー認証ガードのレイアウトを実装**

`src/app/property/[token]/layout.tsx`:
```tsx
import { resolveActorByToken } from "@/lib/auth";

export default async function OwnerLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const actor = await resolveActorByToken(token);
  if (!actor || actor.role !== "owner") {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-sm text-center space-y-2">
          <h1 className="text-lg font-bold">このURLは無効です</h1>
          <p className="text-sm text-gray-500">
            URLが正しいかご確認のうえ、管理者にお問い合わせください。
          </p>
        </div>
      </main>
    );
  }
  return (
    <div className="min-h-screen">
      <header className="border-b px-4 py-3">
        <span className="text-sm font-bold">物件オーナー閲覧画面</span>
      </header>
      <div className="p-4">{children}</div>
    </div>
  );
}
```

- [ ] **Step 2: オーナー閲覧画面を実装**

`src/app/property/[token]/page.tsx`:
```tsx
import { resolveActorByToken } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase-server";
import { getPhotoSignedUrl } from "@/lib/storage";
import { notFound } from "next/navigation";

const STATUS_LABEL: Record<string, string> = {
  unassigned: "未割当",
  assigned: "割当済み",
  in_progress: "清掃中",
  reported: "報告済み",
  confirmed: "確認済み",
  cancelled: "キャンセル",
};

// オーナーの propertyId に紐づく履歴データをまとめて取得し、
// 写真は署名URLにする。閲覧専用なので action なし。
export default async function OwnerPropertyPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const actor = await resolveActorByToken(token);
  if (!actor || actor.role !== "owner") return null; // layout でガード済み

  const db = createServiceClient();
  const propertyId = actor.propertyId;

  // 物件情報
  const { data: property } = await db
    .from("properties")
    .select("id, name, address")
    .eq("id", propertyId)
    .maybeSingle();
  if (!property) notFound();

  // 依頼一覧（cancelled も含めて履歴として見せる）
  const { data: requests } = await db
    .from("cleaning_requests")
    .select("*")
    .eq("property_id", propertyId)
    .order("checkin_date", { ascending: false });
  const list = requests ?? [];

  // 各 reported/confirmed 依頼に紐づく完了報告と写真
  const reportedIds = list
    .filter((r) => r.status === "reported" || r.status === "confirmed")
    .map((r) => r.id);
  const reportsByRequest = new Map<
    string,
    {
      report: { id: string; checklist_result: { label: string; checked: boolean; note?: string }[]; submitted_at: string };
      photoUrls: string[];
    }
  >();
  if (reportedIds.length > 0) {
    const { data: reports } = await db
      .from("cleaning_reports")
      .select("id, request_id, checklist_result, submitted_at")
      .in("request_id", reportedIds);
    const reportList = (reports ?? []) as Array<{
      id: string;
      request_id: string;
      checklist_result: { label: string; checked: boolean; note?: string }[];
      submitted_at: string;
    }>;
    for (const r of reportList) {
      const { data: photos } = await db
        .from("report_photos")
        .select("storage_path")
        .eq("report_id", r.id);
      const photoUrls = await Promise.all(
        ((photos ?? []) as { storage_path: string }[]).map((p) =>
          getPhotoSignedUrl(p.storage_path),
        ),
      );
      reportsByRequest.set(r.request_id, { report: r, photoUrls });
    }
  }

  // 備品補充依頼の履歴
  const { data: supplies } = await db
    .from("supply_requests")
    .select("id, items, created_at")
    .eq("property_id", propertyId)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <main className="space-y-6 max-w-2xl">
      <h1 className="text-xl font-bold">
        {property.name}
        {property.address && (
          <span className="block text-sm font-normal text-gray-500">
            {property.address}
          </span>
        )}
      </h1>

      <section className="space-y-2">
        <h2 className="font-bold text-sm">清掃履歴</h2>
        <ul className="space-y-2">
          {list.map((r) => {
            const rep = reportsByRequest.get(r.id);
            return (
              <li key={r.id} className="border rounded p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>{r.checkin_date}〜{r.checkout_date}（{r.guest_count}名）</span>
                  <span className="text-gray-500">
                    {STATUS_LABEL[r.status as string] ?? r.status}
                  </span>
                </div>
                {rep && (
                  <>
                    <ul className="text-xs space-y-1">
                      {rep.report.checklist_result.map((item, i) => (
                        <li key={i}>
                          {item.checked ? "☑" : "☐"} {item.label}
                          {item.note ? ` — ${item.note}` : ""}
                        </li>
                      ))}
                    </ul>
                    {rep.photoUrls.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {rep.photoUrls.map((url, i) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={i}
                            src={url}
                            alt={`完了写真 ${i + 1}`}
                            className="w-24 h-24 object-cover rounded border"
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </li>
            );
          })}
          {list.length === 0 && (
            <li className="border rounded p-3 text-sm text-gray-500">
              依頼の履歴はまだありません。
            </li>
          )}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-bold text-sm">備品補充依頼の履歴</h2>
        <ul className="divide-y border rounded">
          {(supplies ?? []).map((s) => (
            <li key={s.id} className="px-3 py-2 text-sm">
              <div className="text-gray-500 text-xs">
                {new Date(s.created_at).toLocaleDateString("ja-JP")}
              </div>
              {s.items}
            </li>
          ))}
          {(supplies ?? []).length === 0 && (
            <li className="px-3 py-2 text-sm text-gray-500">
              備品補充依頼の履歴はまだありません。
            </li>
          )}
        </ul>
      </section>
    </main>
  );
}
```

- [ ] **Step 3: ビルドが通ることを確認**

Run: `npm run build`
Expected: ビルド成功。`/property/[token]` がルート表に出る。

- [ ] **Step 4: Commit**

```bash
cd outputs/clients/minpaku-cleaning
git add app/src/app/property/[token]/layout.tsx app/src/app/property/[token]/page.tsx
git commit -m "feat: 物件オーナー閲覧画面（履歴・完了写真・備品履歴）"
```

---

## Task 12: 管理者管理画面（/admin/admins）

管理者を追加・削除・権限レベル変更する画面。設計書5章。`role_level`（int、デフォルト1）は数値で扱う。新規追加は Supabase Auth でユーザを作成して admins に紐付ける。

**Files:**
- Create: `src/lib/db/admins.ts`
- Create: `src/app/api/admin/admins/route.ts`
- Create: `src/app/admin/admins/page.tsx`
- Create: `src/app/admin/admins/AdminForm.tsx`
- Modify: `src/app/admin/layout.tsx`（ナビに「管理者」を追加）
- Test: `tests/db/admins.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

`tests/db/admins.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from "vitest";
import {
  listAdmins,
  createAdmin,
  updateAdminRoleLevel,
  deleteAdmin,
} from "@/lib/db/admins";
import { createServiceClient } from "@/lib/supabase-server";
import { resetDb } from "../helpers/reset-db";
import type { Actor } from "@/lib/auth";

const db = createServiceClient();
const admin: Actor = { role: "admin", adminId: "a1", roleLevel: 1 };
const staff: Actor = { role: "staff", staffId: "s1" };

// テスト用の email をユニーク化
const SUFFIX = "admin-test";

beforeEach(async () => {
  await resetDb();
  // テスト admin/auth users を掃除
  const { data: existing } = await db
    .from("admins")
    .select("id, email")
    .like("email", `%${SUFFIX}%`);
  for (const a of existing ?? []) {
    await db.auth.admin.deleteUser(a.id);
  }
});

describe("admins データアクセス", () => {
  it("管理者は新規管理者を追加できる", async () => {
    const created = await createAdmin(admin, {
      email: `new-${SUFFIX}@example.com`,
      name: "新規管理者",
      role_level: 1,
      password: "TestPass1234!",
    });
    expect(created.email).toBe(`new-${SUFFIX}@example.com`);
    expect(created.role_level).toBe(1);
  });

  it("管理者以外は追加できない", async () => {
    await expect(
      createAdmin(staff, {
        email: `x-${SUFFIX}@example.com`,
        name: "X",
        role_level: 1,
        password: "TestPass1234!",
      }),
    ).rejects.toThrow("管理者権限が必要です");
  });

  it("一覧と権限レベル変更ができる", async () => {
    const created = await createAdmin(admin, {
      email: `lvl-${SUFFIX}@example.com`,
      name: "Level Admin",
      role_level: 1,
      password: "TestPass1234!",
    });
    await updateAdminRoleLevel(admin, created.id, 2);
    const list = await listAdmins(admin);
    const found = list.find((a) => a.id === created.id);
    expect(found?.role_level).toBe(2);
  });

  it("削除すると admins と auth.users から消える", async () => {
    const created = await createAdmin(admin, {
      email: `del-${SUFFIX}@example.com`,
      name: "Del",
      role_level: 1,
      password: "TestPass1234!",
    });
    await deleteAdmin(admin, created.id);
    const list = await listAdmins(admin);
    expect(list.find((a) => a.id === created.id)).toBeUndefined();
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npm test -- admins`
Expected: FAIL（`@/lib/db/admins` が存在しない）

- [ ] **Step 3: データアクセスを実装**

`src/lib/db/admins.ts`:
```typescript
import "server-only";
import { createServiceClient } from "@/lib/supabase-server";
import { assertAdmin } from "@/lib/db/scope";
import type { Actor } from "@/lib/auth";

export type Admin = {
  id: string;
  email: string;
  name: string;
  role_level: number;
  created_at: string;
};

export type CreateAdminInput = {
  email: string;
  name: string;
  role_level: number;
  password: string;
};

export async function listAdmins(actor: Actor): Promise<Admin[]> {
  assertAdmin(actor);
  const db = createServiceClient();
  const { data, error } = await db
    .from("admins")
    .select("id, email, name, role_level, created_at")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data as Admin[];
}

// 管理者を追加: auth.users を作って admins 行を紐付ける。
// auth.users 作成失敗時は admins への insert もせず例外を投げる。
export async function createAdmin(
  actor: Actor,
  input: CreateAdminInput,
): Promise<Admin> {
  assertAdmin(actor);
  const db = createServiceClient();
  const { data: created, error: userError } = await db.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
  });
  if (userError || !created.user) {
    throw new Error(`auth user 作成失敗: ${userError?.message ?? "unknown"}`);
  }
  const { data, error } = await db
    .from("admins")
    .insert({
      id: created.user.id,
      email: input.email,
      name: input.name,
      role_level: input.role_level,
    })
    .select("id, email, name, role_level, created_at")
    .single();
  if (error) {
    // admins 失敗時は auth user もロールバックする
    await db.auth.admin.deleteUser(created.user.id);
    throw error;
  }
  return data as Admin;
}

export async function updateAdminRoleLevel(
  actor: Actor,
  id: string,
  role_level: number,
): Promise<void> {
  assertAdmin(actor);
  const db = createServiceClient();
  const { error } = await db
    .from("admins")
    .update({ role_level })
    .eq("id", id);
  if (error) throw error;
}

// 削除: auth.users を消すと admins は ON DELETE CASCADE で消える。
export async function deleteAdmin(actor: Actor, id: string): Promise<void> {
  assertAdmin(actor);
  const db = createServiceClient();
  const { error } = await db.auth.admin.deleteUser(id);
  if (error) throw error;
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npm test -- admins`
Expected: PASS（4 passed）

- [ ] **Step 5: API ルートを実装**

`src/app/api/admin/admins/route.ts`:
```typescript
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { resolveAdminActor } from "@/lib/supabase-auth";
import {
  listAdmins,
  createAdmin,
  updateAdminRoleLevel,
  deleteAdmin,
} from "@/lib/db/admins";
import { AuthorizationError } from "@/lib/db/scope";

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role_level: z.number().int().min(1),
  password: z.string().min(8),
});
const updateSchema = z.object({
  id: z.string().uuid(),
  role_level: z.number().int().min(1),
});

export async function GET() {
  const actor = await resolveAdminActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await listAdmins(actor));
  } catch (e) {
    if (e instanceof AuthorizationError)
      return NextResponse.json({ error: e.message }, { status: 403 });
    throw e;
  }
}

export async function POST(req: NextRequest) {
  const actor = await resolveAdminActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  try {
    return NextResponse.json(await createAdmin(actor, parsed.data));
  } catch (e) {
    if (e instanceof AuthorizationError)
      return NextResponse.json({ error: e.message }, { status: 403 });
    if (e instanceof Error)
      return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}

export async function PATCH(req: NextRequest) {
  const actor = await resolveAdminActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  try {
    await updateAdminRoleLevel(actor, parsed.data.id, parsed.data.role_level);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthorizationError)
      return NextResponse.json({ error: e.message }, { status: 403 });
    if (e instanceof Error)
      return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}

export async function DELETE(req: NextRequest) {
  const actor = await resolveAdminActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  try {
    await deleteAdmin(actor, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthorizationError)
      return NextResponse.json({ error: e.message }, { status: 403 });
    if (e instanceof Error)
      return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
```

- [ ] **Step 6: 管理者追加フォームを実装**

`src/app/admin/admins/AdminForm.tsx`:
```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [roleLevel, setRoleLevel] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await fetch("/api/admin/admins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, password, role_level: roleLevel }),
    });
    setBusy(false);
    if (!res.ok) {
      const b = await res.json().catch(() => null);
      setError(typeof b?.error === "string" ? b.error : "追加に失敗しました");
      return;
    }
    setEmail("");
    setName("");
    setPassword("");
    setRoleLevel(1);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-2 border rounded p-3">
      <input value={name} onChange={(e) => setName(e.target.value)} required
        placeholder="氏名" className="w-full border rounded px-2 py-1" />
      <input value={email} onChange={(e) => setEmail(e.target.value)} required
        type="email" placeholder="メールアドレス"
        className="w-full border rounded px-2 py-1" />
      <input value={password} onChange={(e) => setPassword(e.target.value)} required
        type="password" placeholder="初期パスワード（8文字以上）"
        className="w-full border rounded px-2 py-1" />
      <label className="block text-sm">
        権限レベル
        <input type="number" min={1} value={roleLevel}
          onChange={(e) => setRoleLevel(Number(e.target.value))}
          className="w-full border rounded px-2 py-1" />
      </label>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button type="submit" disabled={busy}
        className="bg-black text-white rounded px-3 py-1 text-sm disabled:opacity-50">
        管理者を追加
      </button>
    </form>
  );
}
```

- [ ] **Step 7: 管理者一覧画面を実装**

`src/app/admin/admins/page.tsx`:
```tsx
import { resolveAdminActor } from "@/lib/supabase-auth";
import { listAdmins } from "@/lib/db/admins";
import { redirect } from "next/navigation";
import { AdminForm } from "./AdminForm";

export default async function AdminsPage() {
  const actor = await resolveAdminActor();
  if (!actor) redirect("/admin/login");
  const admins = await listAdmins(actor);
  return (
    <main className="space-y-4 max-w-2xl">
      <h1 className="text-xl font-bold">管理者管理</h1>
      <AdminForm />
      <ul className="divide-y border rounded">
        {admins.map((a) => (
          <li key={a.id} className="px-3 py-2 text-sm flex justify-between">
            <div>
              {a.name} <span className="text-gray-500">— {a.email}</span>
            </div>
            <div className="text-gray-500 text-xs">権限 {a.role_level}</div>
          </li>
        ))}
      </ul>
      <p className="text-xs text-gray-500">
        権限レベルの変更・削除は当面 API 経由（Plan 3 仕上げ段階の暫定 UI）。
      </p>
    </main>
  );
}
```

> 注: 権限レベル変更・削除の UI は本タスクではフォームに含めない（基本の追加/一覧で十分とし、編集 UI が必要になった時点で追加）。API ルートは PATCH/DELETE を備えているので curl 等で操作可能。

- [ ] **Step 8: 管理者レイアウトのナビに「管理者」を追加**

`src/app/admin/layout.tsx` の `<nav>` 内、既存の6リンクの末尾に `Link href="/admin/admins">管理者</Link>` を追加して7リンクにする（他の要素は変えない）:
```tsx
      <nav className="border-b px-4 py-3 flex gap-4 text-sm">
        <Link href="/admin">ダッシュボード</Link>
        <Link href="/admin/requests">依頼</Link>
        <Link href="/admin/properties">物件</Link>
        <Link href="/admin/owners">オーナー</Link>
        <Link href="/admin/staff">スタッフ</Link>
        <Link href="/admin/supplies">備品</Link>
        <Link href="/admin/admins">管理者</Link>
      </nav>
```

- [ ] **Step 9: ビルドが通ることを確認**

Run: `npm run build && npm test`
Expected: ビルド成功、全テスト PASS。

- [ ] **Step 10: Commit**

```bash
cd outputs/clients/minpaku-cleaning
git add app/src/lib/db/admins.ts app/tests/db/admins.test.ts app/src/app/api/admin/admins/route.ts app/src/app/admin/admins app/src/app/admin/layout.tsx
git commit -m "feat: 管理者管理画面（追加・一覧）+ API（PATCH/DELETE 同梱）"
```

---

## Task 13: 写真のリサイズ・圧縮（lib/image.ts + storage.ts への組み込み）

Plan 2 持ち越し: スマホ写真がそのまま上がると Storage が肥大化するため、アップロード時に長辺 1600px に縮小し JPEG 品質 80 に圧縮する。`sharp` を使う。`uploadReportPhoto` の前処理として組み込む。

**Files:**
- Create: `src/lib/image.ts`
- Modify: `src/lib/storage.ts`（`uploadReportPhoto` で `resizeForUpload` を呼ぶ）
- Modify: `package.json`（`sharp` を追加）

- [ ] **Step 1: 依存を追加**

```bash
cd outputs/clients/minpaku-cleaning/app
npm install sharp
```

- [ ] **Step 2: image.ts を実装**

`src/lib/image.ts`:
```typescript
import "server-only";
import sharp from "sharp";

// アップロード前にリサイズ・圧縮する。長辺 1600px に縮小し JPEG 品質 80 で出力。
// PNG は透過を保つため PNG のまま（圧縮レベル 8）出力する。
// 戻り値は { buffer, contentType }: Storage への upload にそのまま渡せる形。
export async function resizeForUpload(
  input: ArrayBuffer | Buffer,
  inputContentType: string,
): Promise<{ buffer: Buffer; contentType: string }> {
  const src = input instanceof Buffer ? input : Buffer.from(input);
  const img = sharp(src, { failOn: "none" }).rotate(); // EXIF 回転を保持
  const meta = await img.metadata();
  const longSide = Math.max(meta.width ?? 0, meta.height ?? 0);
  const needsResize = longSide > 1600;
  if (inputContentType === "image/png") {
    const buffer = await (
      needsResize
        ? img.resize({ width: 1600, height: 1600, fit: "inside" })
        : img
    )
      .png({ compressionLevel: 8 })
      .toBuffer();
    return { buffer, contentType: "image/png" };
  }
  // それ以外（jpeg/webp/heic 含む）は jpeg 80 に正規化する
  const buffer = await (
    needsResize
      ? img.resize({ width: 1600, height: 1600, fit: "inside" })
      : img
  )
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer();
  return { buffer, contentType: "image/jpeg" };
}
```

- [ ] **Step 3: storage.ts に組み込む**

`src/lib/storage.ts` の `uploadReportPhoto` 内、`db.storage.from(BUCKET).upload(path, file, { contentType })` の手前で `resizeForUpload` を通す。最終的な関数は以下:
```typescript
import "server-only";
import { randomBytes } from "crypto";
import { createServiceClient } from "@/lib/supabase-server";
import { resizeForUpload } from "@/lib/image";

const BUCKET = "report-photos";

export async function uploadReportPhoto(
  requestId: string,
  file: ArrayBuffer | Buffer,
  contentType: string,
): Promise<string> {
  const db = createServiceClient();
  // Plan 3: アップロード前にリサイズ・圧縮する（長辺1600px / JPEG q80 or PNG）
  const { buffer, contentType: outType } = await resizeForUpload(file, contentType);
  const ext = outType === "image/png" ? "png" : "jpg";
  const path = `${requestId}/${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;
  const { error } = await db.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: outType });
  if (error) throw error;
  return path;
}
```

（`getPhotoSignedUrl` と `deletePhoto` は変更なし。）

- [ ] **Step 4: 既存テストへの影響を確認**

`tests/lib/storage.test.ts` は 4 バイトの JPEG マジックバイトを使っており、sharp はこれを画像として処理しようとして失敗する可能性がある。テストを最小の有効 1×1 PNG（または 1×1 JPEG）に差し替える:

`tests/lib/storage.test.ts` 内の `Buffer.from([0xff, 0xd8, 0xff, 0xd9])` 2箇所を、有効な 1×1 PNG バイト列に差し替える:
```typescript
// 最小の有効 1×1 PNG（赤）。sharp で正規化可能。
const buf = Buffer.from(
  "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c63f8cfc0c000000003000100" +
    "1ae6c1830000000049454e44ae426082",
  "hex",
);
```
（テスト2件とも同じ差し替え。`Buffer.from([...])` の行を上記 `Buffer.from(...hex..., "hex")` で置き換える。assertion は変えない: パスが `req-test/...jpg` または `.png` に match する正規表現は `/^req-test\/.+\.(jpg|png)$/` に緩める方が安全。）

具体的に `tests/lib/storage.test.ts` の正規表現を以下に変更:
- `expect(path).toMatch(/^req-test\/.+\.jpg$/);` → `expect(path).toMatch(/^req-test\/.+\.(jpg|png)$/);`

- [ ] **Step 5: テスト・ビルドが通ることを確認**

Run: `npm test -- storage`
Expected: PASS（2 passed）

Run: `npm run build`
Expected: ビルド成功（sharp はネイティブモジュールで Vercel ビルドでも問題なく動く実績あり）。

- [ ] **Step 6: Commit**

```bash
cd outputs/clients/minpaku-cleaning
git add app/src/lib/image.ts app/src/lib/storage.ts app/tests/lib/storage.test.ts app/package.json app/package-lock.json
git commit -m "feat: アップロード時の画像リサイズ・圧縮（sharp、長辺1600px・JPEG q80）"
```

---

## Task 14: submitReport の RPC トランザクション化 + StaffOnlyError 403 マッピング

Plan 2 review 持ち越し2件をまとめて対処:
1. `submitReport` の多段書き込み（report insert → photos insert → status update）を Postgres RPC で1トランザクションにする。
2. スタッフ API ルートの catch に `StaffOnlyError → 403` を追加。

**Files:**
- Create: `supabase/migrations/0006_submit_report_rpc.sql`
- Modify: `src/lib/db/reports.ts`
- Modify: `src/app/api/staff/requests/[id]/route.ts`
- Modify: `src/app/api/staff/photos/route.ts`
- Modify: `src/app/api/staff/supplies/route.ts`

- [ ] **Step 1: RPC を migration で定義**

`supabase/migrations/0006_submit_report_rpc.sql`:
```sql
-- 民泊清掃管理アプリ migration 0006: submitReport のトランザクション化
-- Plan 2 code review 持ち越し。3段書き込み (reports → photos → status) を1関数で実行する。
-- 認可はアプリ層で済んでいる前提（service role からのみ呼ばれる）。

create or replace function public.submit_cleaning_report(
  p_request_id uuid,
  p_staff_id uuid,
  p_checklist jsonb,
  p_photo_paths text[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report_id uuid;
  v_expires_at timestamptz := now() + interval '90 days';
  v_path text;
begin
  -- cleaning_reports 作成
  insert into cleaning_reports(request_id, staff_id, checklist_result)
  values (p_request_id, p_staff_id, p_checklist)
  returning id into v_report_id;

  -- report_photos 行を一括作成
  if array_length(p_photo_paths, 1) is not null then
    foreach v_path in array p_photo_paths loop
      insert into report_photos(report_id, storage_path, expires_at)
      values (v_report_id, v_path, v_expires_at);
    end loop;
  end if;

  -- 依頼ステータスを reported に遷移
  update cleaning_requests
     set status = 'reported', updated_at = now()
   where id = p_request_id;

  return v_report_id;
end;
$$;
```

- [ ] **Step 2: マイグレーション適用**

```bash
cd outputs/clients/minpaku-cleaning/app
npx supabase db reset
```
0001〜0006 が適用される。

- [ ] **Step 3: reports.ts を RPC 呼び出しに変える**

`src/lib/db/reports.ts` の `submitReport` 内、`cleaning_reports` insert・`report_photos` insert・status update の3段書き込みを RPC 呼び出し1回に置き換える。アプリ層の認可（role/assigned_staff/status チェック）は維持する。

`submitReport` の本体（assertTransition の後）を以下に差し替え:
```typescript
  // Plan 3: 3段書き込みを RPC で1トランザクションにまとめる
  const { data: reportId, error: rpcError } = await db.rpc(
    "submit_cleaning_report",
    {
      p_request_id: requestId,
      p_staff_id: actor.staffId,
      p_checklist: checklistResult,
      p_photo_paths: photoPaths,
    },
  );
  if (rpcError) throw rpcError;

  // 作成された report を返却するために再取得
  const { data: report, error: fetchError } = await db
    .from("cleaning_reports")
    .select("*")
    .eq("id", reportId)
    .single();
  if (fetchError) throw fetchError;

  // 管理者全員に完了報告を通知（Task 6 で配線済み）
  const admins = await resolveAllAdmins();
  await notify(
    "report_submitted",
    admins,
    {
      subject: "完了報告が提出されました",
      text: "スタッフから清掃の完了報告が提出されました。管理画面で内容をご確認ください。",
    },
    { request_id: requestId, report_id: report.id },
  );

  return report as CleaningReport;
```
（authorize / not-found / not-assigned / assertTransition の前段はそのまま残す。古い `cleaning_reports` insert・`report_photos` insert・`cleaning_requests` status update の3ブロックを上記1ブロックに置き換える。）

- [ ] **Step 4: StaffOnlyError 403 マッピングをスタッフ API ルートに追加**

3つのスタッフ API ルートそれぞれの catch に `if (e instanceof StaffOnlyError) return ... 403` を追加する。

**`src/app/api/staff/requests/[id]/route.ts`:**
- import に追加: `import { StaffOnlyError } from "@/lib/db/scope";`
- PATCH の catch、`if (e instanceof RequestAlreadyClaimedError || e instanceof InvalidTransitionError)` の手前に:
  ```typescript
      if (e instanceof StaffOnlyError)
        return NextResponse.json({ error: e.message }, { status: 403 });
  ```
- POST の catch、`if (e instanceof InvalidTransitionError)` の手前に同様の StaffOnlyError 分岐を追加。

**`src/app/api/staff/photos/route.ts`:**
- import に追加: `import { StaffOnlyError } from "@/lib/db/scope";`
- catch の `if (e instanceof Error)` の手前に StaffOnlyError 分岐を追加。

**`src/app/api/staff/supplies/route.ts`:**
- import に追加: `import { StaffOnlyError } from "@/lib/db/scope";`
- catch の `if (e instanceof Error)` の手前に StaffOnlyError 分岐を追加。

- [ ] **Step 5: テスト・ビルドが通ることを確認**

Run: `npm test -- reports`
Expected: PASS（6 passed。RPC ベースでも振る舞いは同等のはず）

Run: `npm test`
Expected: 全テスト PASS。

Run: `npm run build`
Expected: ビルド成功。

- [ ] **Step 6: Commit**

```bash
cd outputs/clients/minpaku-cleaning
git add app/supabase/migrations/0006_submit_report_rpc.sql app/src/lib/db/reports.ts app/src/app/api/staff/requests app/src/app/api/staff/photos app/src/app/api/staff/supplies
git commit -m "refactor: submitReport を RPC トランザクション化 + StaffOnlyError→403"
```

---

## Task 15: 連続予約警告（割当時の UI 警告）

Plan 2 持ち越し: 設計書6章「翌日割当時、同物件に連続予約があれば警告表示（ブロックはしない）」。管理者の依頼詳細画面の `RequestActions` で、対象依頼と前後で日付が連続している依頼があれば警告メッセージを出す。サーバ側で隣接予約を取得し、props で渡す。

**Files:**
- Modify: `src/app/admin/requests/[id]/page.tsx`
- Modify: `src/app/admin/requests/[id]/RequestActions.tsx`

- [ ] **Step 1: page.tsx で隣接予約を取得して渡す**

`src/app/admin/requests/[id]/page.tsx` の `request` 取得直後（`const propertyName = ...` の後）に以下を追加:
```typescript
  // 連続予約（前後1日以内）を検索（同物件・cancelled以外）
  const { createServiceClient } = await import("@/lib/supabase-server");
  const db = createServiceClient();
  const { data: adjacent } = await db
    .from("cleaning_requests")
    .select("id, checkin_date, checkout_date, status")
    .eq("property_id", request.property_id)
    .neq("id", request.id)
    .neq("status", "cancelled");
  const adjacentRequests = (adjacent ?? []).filter((other) => {
    // 前後1日以内に他予約のチェックイン/アウトが接しているか
    return (
      other.checkin_date === request.checkout_date ||
      other.checkout_date === request.checkin_date
    );
  });
```
そして `<RequestActions ... />` に `adjacentRequests={adjacentRequests}` を追加して渡す。

> 注: page.tsx の冒頭 import 群はそのままで、`createServiceClient` の動的 import は煩雑なので、ファイル先頭に `import { createServiceClient } from "@/lib/supabase-server";` を追加して動的 import 行を削除しても OK。実装者は通常 import に置き換えること。

- [ ] **Step 2: RequestActions.tsx で警告を表示**

`src/app/admin/requests/[id]/RequestActions.tsx` の `Props` 型に追加:
```typescript
type Props = {
  requestId: string;
  status: string;
  assignedStaffId: string | null;
  staff: Staff[];
  adjacentRequests: { id: string; checkin_date: string; checkout_date: string }[];
};
```
そして関数引数にも `adjacentRequests` を追加し、デフォルト値は空配列に。

JSX の `{canAssign && (...)} ` の **上**（同じ階層）に警告セクションを追加:
```tsx
      {adjacentRequests.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-300 rounded p-2 text-xs text-yellow-900">
          ⚠ 同物件に連続予約があります（{adjacentRequests
            .map((a) => `${a.checkin_date}〜${a.checkout_date}`)
            .join(", ")}）。割り当て時はスタッフの稼働状況にご注意ください。
        </div>
      )}
```

- [ ] **Step 3: ビルドが通ることを確認**

Run: `npm run build`
Expected: ビルド成功。

- [ ] **Step 4: Commit**

```bash
cd outputs/clients/minpaku-cleaning
git add app/src/app/admin/requests/[id]/page.tsx app/src/app/admin/requests/[id]/RequestActions.tsx
git commit -m "feat: 管理者依頼詳細に連続予約警告を表示（設計書6章）"
```

---

## Task 16: vercel.json — Vercel Cron スケジュール定義

3つの Cron ルートを Vercel に登録する。設計書7章の頻度に合わせる:
- 前日17:00 リマインド: 毎日 17:00（JST → UTC で 08:00）
- 24h 未割当アラート: 1時間ごと
- 写真期限切れ削除: 毎日 03:00（JST → UTC で 18:00 の前日扱い、ここでは UTC 18:00 で運用）

**Files:**
- Create: `vercel.json`（app ディレクトリ直下）

- [ ] **Step 1: vercel.json を作成**

`outputs/clients/minpaku-cleaning/app/vercel.json`:
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "crons": [
    {
      "path": "/api/cron/remind",
      "schedule": "0 8 * * *"
    },
    {
      "path": "/api/cron/unassigned-alerts",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/cleanup-photos",
      "schedule": "0 18 * * *"
    }
  ]
}
```
（schedule は UTC の cron expression。`0 8 * * *` = UTC 08:00 = JST 17:00。`0 18 * * *` = UTC 18:00 = JST 翌03:00。`0 * * * *` = 毎時0分。）

- [ ] **Step 2: ビルドが通ることを確認**

Run: `npm run build`
Expected: ビルド成功（vercel.json は ビルド時には影響しない・Vercel デプロイ時のみ参照される）。

- [ ] **Step 3: Commit**

```bash
cd outputs/clients/minpaku-cleaning
git add app/vercel.json
git commit -m "feat: vercel.json で3つの Cron スケジュールを登録"
```

> 注: 実環境での Cron 起動確認はデプロイ後の Vercel ダッシュボードで行う（本計画スコープ外）。Vercel 側で `CRON_SECRET` を Environment Variables に設定する必要がある（納品時の手順書で別途案内）。

---

## Task 17: E2E オーナー画面スモーク

`/property/[token]` の閲覧フローを Playwright で確認する。Plan 2 のメイン E2E（依頼作成→承認→開始→提出→確認）と独立した小さな spec として追加する。

**Files:**
- Create: `e2e/owner-view.spec.ts`

- [ ] **Step 1: E2E スペックを作成**

`e2e/owner-view.spec.ts`:
```typescript
import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

function dateStr(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

test("オーナーはトークンURLで物件情報と履歴を閲覧できる", async ({ page }) => {
  // クリーンアップ
  await db.from("report_photos").delete().not("id", "is", null);
  await db.from("cleaning_reports").delete().not("id", "is", null);
  await db.from("cleaning_requests").delete().not("id", "is", null);
  await db.from("access_tokens").delete().not("id", "is", null);
  await db.from("properties").delete().not("id", "is", null);
  await db.from("owners").delete().not("id", "is", null);

  // オーナー・物件・履歴データを投入
  const { data: owner } = await db
    .from("owners")
    .insert({ name: "オーナー閲覧テスト" })
    .select()
    .single();
  const { data: property } = await db
    .from("properties")
    .insert({ owner_id: owner!.id, name: "閲覧物件" })
    .select()
    .single();
  await db.from("cleaning_requests").insert({
    property_id: property!.id,
    checkin_date: dateStr(-30),
    checkout_date: dateStr(-28),
    guest_count: 2,
    status: "confirmed",
  });
  const ownerToken = randomBytes(32).toString("base64url");
  await db.from("access_tokens").insert({
    token: ownerToken,
    type: "owner",
    property_id: property!.id,
  });

  // オーナー画面アクセス
  await page.goto(`/property/${ownerToken}`);
  await expect(page.locator("h1", { hasText: "閲覧物件" })).toBeVisible();
  await expect(page.locator("text=清掃履歴").first()).toBeVisible();
  await expect(page.locator("text=確認済み").first()).toBeVisible();
});

test("無効なトークンには専用エラーが表示される", async ({ page }) => {
  await page.goto(`/property/${"invalid-token-string"}`);
  await expect(
    page.locator("h1", { hasText: "このURLは無効です" }),
  ).toBeVisible();
});
```

- [ ] **Step 2: E2E を実行**

Run: `npm run test:e2e`
Expected: 主要フロー（Plan 2 の `request-flow.spec.ts`）+ owner-view の 2 spec 計3テストが通る。

> 注: タイミングの問題でテストが不安定なら `expect(...).toBeVisible()` の前後に `waitForLoadState("networkidle")` を入れて調整。テストの意図は変えないこと。

- [ ] **Step 3: Commit**

```bash
cd outputs/clients/minpaku-cleaning
git add app/e2e/owner-view.spec.ts
git commit -m "test: E2E オーナー画面スモーク（履歴閲覧・無効トークン専用エラー）"
```

---

## 完了条件（Plan 3）

- [ ] migrations 0005（notifications_log 整合性）と 0006（submitReport RPC）が `supabase db reset` で適用できる
- [ ] LINE/メール通知が4箇所のトリガー（依頼作成 / 完了報告 / 確認完了 / 備品補充）から発火し、`notifications_log` に記録される
- [ ] LINE で実送信される kind は `request_created` のみ（`LINE_ENABLED_KINDS` ホワイトリスト）。他の kind は line_user_id があってもメール直行
- [ ] Cron 3本（前日リマインド / 24h未割当アラート / 写真期限切れ削除）が `CRON_SECRET` 認証付きで稼働し、`vercel.json` でスケジュール登録されている
- [ ] 管理者ダッシュボード（`/admin`）が当月カレンダー＋今後の依頼一覧を表示する
- [ ] 物件オーナーがトークンURL（`/property/[token]`）から履歴・写真・備品履歴を閲覧でき、無効トークンは専用エラーが出る
- [ ] 管理者管理画面（`/admin/admins`）で管理者の追加・一覧ができる（API では PATCH/DELETE も可）
- [ ] アップロード写真が長辺1600px・JPEG q80 にリサイズ・圧縮される
- [ ] `submitReport` が単一の Postgres RPC でトランザクション実行される
- [ ] スタッフ API の `StaffOnlyError` が 403 で返る
- [ ] 連続予約警告が管理者の依頼詳細画面で表示される
- [ ] `npm test` が全 PASS、`npm run build` が成功する
- [ ] `npm run test:e2e` の主要フロー + オーナー閲覧の計3 spec が PASS

## Plan 3 持ち越し（次フェーズ向け申し送り）

設計書1〜9章は本フェーズで完結する想定。以下は本納品スコープ外（設計書10章）として明示的に Plan 3 では実装しない:

- 会計機能（スタッフ時給・物件清掃目安時間・交通費/手当・月別報酬算出・月末締め・時給変更時の過去データ保全）
- OTA自動連携（Airbnb iCal からの予約自動取得・未割り当て予約一覧・手動入力との重複消し込み）

本計画内の品質面の小さな繰り越し（必要に応じて納品後の保守で対応）:

- `notifications_log` テーブルを `resetDb()` ヘルパーに追加する（現状は Plan 3 で追加した個別テストの beforeEach で都度削除している。テスト数が増えたら helper に追加すると整理しやすい）
- 管理者管理画面の権限レベル変更・削除 UI（現状は追加・一覧のみ。API では PATCH/DELETE は実装済み）
- Vercel 本番デプロイ後の Cron 動作確認手順書（Environment Variables 設定・Vercel ダッシュボードでの実行ログ確認）

## 設計書1〜9章充足チェック

- 1章 背景・前提: Plan 1 で構成、Plan 3 でロール3種（管理者/オーナー/スタッフ）の全画面が揃う
- 2章 技術スタック: Next.js / Supabase / Storage / Vercel Cron / LINE / Resend / sharp すべて採用
- 3章 データモデル: Plan 1 で 11 テーブル + Plan 2-3 で必要な制約・索引追加
- 4章 認証・認可: Plan 1-2 で `resolveActor` 系完成、本計画で Cron 認証も追加
- 5章 画面構成: 全ルート実装完了
- 6章 ステータスフロー・早い者勝ち: Plan 2 で完了、本計画で連続予約警告を追加
- 7章 通知: 本計画で全7トリガー実装
- 8章 写真ストレージ: Plan 2 で保存・閲覧、本計画でリサイズ・圧縮・期限切れ削除
- 9章 エラー処理・テスト: 認可ロジック・早い者勝ち・状態機械・通知冪等性・E2E すべてテスト完備



