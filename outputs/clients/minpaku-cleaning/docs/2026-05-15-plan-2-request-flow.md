# 民泊清掃管理アプリ Plan 2: 清掃依頼コアフロー 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 管理者が清掃依頼を作成・編集・割当・確認でき、スタッフがトークンURLから承認・開始・チェックリスト/写真付き完了報告・備品補充依頼を行える、清掃依頼ライフサイクル一式を構築する。

**Architecture:** Plan 1 の基盤（service role 経由のDBアクセス・`assertActor` 系の認可・admin/staff のトークン解決）の上に、清掃依頼の状態機械（`status-machine.ts`、純粋ロジック）と各エンティティのデータアクセス（`requests.ts` / `reports.ts` / `supplies.ts` / `storage.ts`）を載せる。ステータス遷移はサーバ側状態機械で検証し、「早い者勝ち」承認は `WHERE status='unassigned'` の条件付きUPDATEで排他する。HTTP境界（API ルート）が actor 解決とバリデーションを担い、画面は表示と入力のみ。

**Tech Stack:** Next.js 16（App Router, TypeScript）/ Supabase（Postgres, Storage, CLI ローカル開発）/ Tailwind CSS / Vitest / Playwright（E2E）

設計書: `outputs/clients/minpaku-cleaning/docs/2026-05-14-design.md`
Plan 1 計画書: `outputs/clients/minpaku-cleaning/docs/2026-05-14-plan-1-foundation.md`
アプリのルート: `outputs/clients/minpaku-cleaning/app/`（以下、パスはこのディレクトリ基準）

**Plan 2 のスコープ外（Plan 3）:** LINE/メール通知、Vercel Cron（リマインド・未割当アラート・写真自動削除）、カレンダービュー、物件オーナー閲覧画面（`/property/[token]`）、管理者管理画面（`/admin/admins`）。本計画では通知の発火点にコメント `// TODO(Plan 3): 通知` を残すのみとし、通知コードは書かない。

---

## Plan 1 からの前提（実装済み・変更しない）

- `src/lib/supabase-server.ts` — `createServiceClient()`（service role）
- `src/lib/auth.ts` — `Actor` 型（`{role:"admin";adminId;roleLevel} | {role:"owner";ownerId;propertyId} | {role:"staff";staffId}`）、`resolveActorByToken(token)`
- `src/lib/supabase-auth.ts` — `resolveAdminActor()`、`createAuthClient()`
- `src/lib/db/scope.ts` — `assertAdmin(actor)`、`AuthorizationError`
- `src/lib/db/properties.ts` / `owners.ts` / `staff.ts` / `tokens.ts` — 各エンティティのデータアクセス
- `src/app/admin/layout.tsx` — 認証ガード（`x-pathname` ベース）、`src/proxy.ts` — `x-pathname` 付与ミドルウェア
- `src/app/admin/{login,properties,owners,staff}` — 管理画面、`src/app/admin/TokenControls.tsx`
- テスト基盤: `tests/helpers/reset-db.ts` の `resetDb()`（FK順の全テーブルリセット）、`vitest.config.ts` の `fileParallelism: false`、`tests/__mocks__/server-only.ts`
- DBスキーマ: `supabase/migrations/0001_initial_schema.sql`（11テーブル。`cleaning_requests` / `cleaning_reports` / `report_photos` / `supply_requests` / `notifications_log` は本計画で本格利用開始）

**重要な設計判断（本計画で確定）:** 設計書の `cleaning_status` enum は5値（unassigned/assigned/in_progress/reported/confirmed）だが、管理者の「依頼キャンセル」を状態機械の枠内で扱い、かつ「次回予約人数」の参照（同物件の次依頼の `guest_count`）のために依頼レコードを物理削除したくない。よって migration 0002 で `cancelled` を enum に追加し、キャンセル = `cancelled` への遷移とする（物理削除しない）。

---

## ファイル構成

```
outputs/clients/minpaku-cleaning/app/
  supabase/migrations/
    0002_request_constraints.sql   cancelled追加・整合性制約・索引・access_tokens部分unique
    0004_storage_bucket.sql        report-photos バケット作成
  src/lib/
    status-machine.ts              清掃依頼ステータスの遷移ルール（純粋ロジック）
    storage.ts                     Supabase Storage（写真アップロード・署名URL・削除）
    db/
      requests.ts                  cleaning_requests のデータアクセス（CRUD・遷移・スタッフ向けクエリ）
      reports.ts                   cleaning_reports / report_photos のデータアクセス
      supplies.ts                  supply_requests のデータアクセス
  src/app/
    admin/
      requests/page.tsx            依頼一覧（作成フォーム＋一覧）
      requests/RequestForm.tsx     依頼作成フォーム
      requests/[id]/page.tsx       依頼詳細（割当・完了報告閲覧・確認）
      requests/[id]/RequestActions.tsx  割当/確認/キャンセル操作
      supplies/page.tsx            備品補充依頼一覧（管理者）
    staff/
      [token]/layout.tsx           スタッフ認証ガード（無効トークンは専用エラー表示）
      [token]/page.tsx             担当依頼一覧
      [token]/RequestList.tsx      依頼一覧＋承認ボタン（client）
      [token]/requests/[id]/page.tsx        依頼詳細
      [token]/requests/[id]/StaffRequestPanel.tsx  開始/チェックリスト/写真/備品（client）
    api/
      admin/requests/route.ts      GET一覧 / POST作成 / PATCH編集
      admin/requests/[id]/route.ts PATCH（assign/confirm/cancel）
      staff/requests/[id]/route.ts PATCH（claim/start）/ POST（完了報告）
      staff/photos/route.ts        POST（写真アップロード）
      staff/supplies/route.ts      POST（備品補充依頼）
  tests/
    lib/status-machine.test.ts
    lib/storage.test.ts
    db/requests.test.ts
    db/reports.test.ts
    db/supplies.test.ts
  e2e/
    request-flow.spec.ts           主要フロー1本（依頼作成→承認→開始→提出→確認）
  playwright.config.ts
```

各 `src/lib/db/*` はデータアクセスのみ（認可は関数内で `assertAdmin` / actor.role チェック）。`src/app/api/*` は HTTP 境界（actor 解決・zod バリデーション・エラー→HTTPステータス変換）。画面コンポーネントは表示と入力のみ。

---

## Task 1: migration 0002 — スキーマ拡張

**Files:**
- Create: `supabase/migrations/0002_request_constraints.sql`

- [ ] **Step 1: マイグレーション SQL を作成**

`supabase/migrations/0002_request_constraints.sql`:
```sql
-- 民泊清掃管理アプリ migration 0002: 清掃依頼フロー向けスキーマ拡張
-- Plan 1 の code review 持ち越し事項 + Plan 2 で必要な制約・索引。
-- 0001 は改変しない。

-- 管理者による依頼キャンセルを状態機械の枠内で扱うため cancelled を追加。
-- PostgreSQL 12+ は ADD VALUE をトランザクション内で実行可（同一txn内で値を使わなければ可）。
alter type cleaning_status add value if not exists 'cancelled';

-- cleaning_requests の整合性制約
alter table cleaning_requests
  add constraint chk_guest_count_positive check (guest_count > 0);
alter table cleaning_requests
  add constraint chk_checkout_after_checkin check (checkout_date > checkin_date);

-- 割当スタッフでの検索用インデックス
create index idx_requests_assigned_staff on cleaning_requests(assigned_staff_id);

-- access_tokens: 1対象に有効（revoked_at is null）なトークンは1つだけ。
-- Plan 1 Task 12 review 由来。アプリ層ガードに加えDB制約で重複アクティブを排除する。
create unique index uq_active_owner_token on access_tokens(property_id)
  where type = 'owner' and revoked_at is null;
create unique index uq_active_staff_token on access_tokens(staff_id)
  where type = 'staff' and revoked_at is null;
```

> 注: `notifications_log` 関連の索引・status enum 化（Plan 1 持ち越しリスト）は通知を実装する Plan 3 の migration に回す。Plan 2 では `notifications_log` に書き込まないため。

- [ ] **Step 2: マイグレーションを適用**

```bash
cd outputs/clients/minpaku-cleaning/app
npx supabase db reset
```
`db reset` がローカルDBを作り直し全マイグレーション（0001→0002）を適用する。エラーなく完了することを確認。

- [ ] **Step 3: 適用結果を確認**

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select enum_range(null::cleaning_status);"
```
Expected: `{unassigned,assigned,in_progress,reported,confirmed,cancelled}`

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "\d cleaning_requests" | grep -E "chk_|idx_requests_assigned"
```
Expected: `chk_guest_count_positive`、`chk_checkout_after_checkin`、`idx_requests_assigned_staff` が表示される。

- [ ] **Step 4: Commit**

```bash
cd outputs/clients/minpaku-cleaning
git add app/supabase/migrations/0002_request_constraints.sql
git commit -m "feat: migration 0002 — cancelled status・依頼整合性制約・access_tokens部分unique"
```

---

## Task 2: ステータス状態機械（status-machine.ts）

清掃依頼のステータス遷移ルールを純粋ロジックとして1ファイルに閉じ込める。DBアクセスなし、完全にユニットテスト可能。

**Files:**
- Create: `src/lib/status-machine.ts`
- Test: `tests/lib/status-machine.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

`tests/lib/status-machine.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import {
  canTransition,
  assertTransition,
  InvalidTransitionError,
} from "@/lib/status-machine";

describe("canTransition", () => {
  it("正規フローの遷移を許可する", () => {
    expect(canTransition("unassigned", "assigned")).toBe(true);
    expect(canTransition("assigned", "in_progress")).toBe(true);
    expect(canTransition("in_progress", "reported")).toBe(true);
    expect(canTransition("reported", "confirmed")).toBe(true);
  });

  it("キャンセル遷移を許可する（confirmed/cancelled 以外から）", () => {
    expect(canTransition("unassigned", "cancelled")).toBe(true);
    expect(canTransition("assigned", "cancelled")).toBe(true);
    expect(canTransition("in_progress", "cancelled")).toBe(true);
  });

  it("assigned から unassigned への割当解除を許可する", () => {
    expect(canTransition("assigned", "unassigned")).toBe(true);
  });

  it("不正な遷移を拒否する", () => {
    expect(canTransition("unassigned", "in_progress")).toBe(false);
    expect(canTransition("reported", "in_progress")).toBe(false);
    expect(canTransition("confirmed", "cancelled")).toBe(false);
    expect(canTransition("cancelled", "assigned")).toBe(false);
    expect(canTransition("confirmed", "reported")).toBe(false);
  });
});

describe("assertTransition", () => {
  it("許可された遷移では例外を投げない", () => {
    expect(() => assertTransition("in_progress", "reported")).not.toThrow();
  });

  it("不正な遷移で InvalidTransitionError を投げる", () => {
    expect(() => assertTransition("unassigned", "confirmed")).toThrow(
      InvalidTransitionError,
    );
    expect(() => assertTransition("unassigned", "confirmed")).toThrow(
      "unassigned から confirmed へは遷移できません",
    );
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npm test -- status-machine`
Expected: FAIL（`@/lib/status-machine` が存在しない）

- [ ] **Step 3: 実装を書く**

`src/lib/status-machine.ts`:
```typescript
// 清掃依頼のステータスと、許可される遷移を定義する純粋ロジック。
// DBアクセスなし。全てのステータス変更はこの状態機械で検証する。

export type CleaningStatus =
  | "unassigned"
  | "assigned"
  | "in_progress"
  | "reported"
  | "confirmed"
  | "cancelled";

// from → 許可される to の一覧。confirmed / cancelled は終端。
const ALLOWED: Record<CleaningStatus, CleaningStatus[]> = {
  unassigned: ["assigned", "cancelled"],
  assigned: ["in_progress", "unassigned", "cancelled"],
  in_progress: ["reported", "cancelled"],
  reported: ["confirmed"],
  confirmed: [],
  cancelled: [],
};

export class InvalidTransitionError extends Error {}

export function canTransition(from: CleaningStatus, to: CleaningStatus): boolean {
  return ALLOWED[from]?.includes(to) ?? false;
}

export function assertTransition(from: CleaningStatus, to: CleaningStatus): void {
  if (!canTransition(from, to)) {
    throw new InvalidTransitionError(`${from} から ${to} へは遷移できません`);
  }
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npm test -- status-machine`
Expected: PASS（2 describe / 6 test 程度、全 PASS）

- [ ] **Step 5: Commit**

```bash
cd outputs/clients/minpaku-cleaning
git add app/src/lib/status-machine.ts app/tests/lib/status-machine.test.ts
git commit -m "feat: 清掃依頼ステータス状態機械"
```

---

## Task 3: 清掃依頼データアクセス — 管理者CRUD（requests.ts）

`cleaning_requests` の管理者向けデータアクセス。型定義・日付バリデーション・一覧/取得/作成/編集/キャンセルを実装する。割当・進行遷移とスタッフ向けクエリは Task 4 で同ファイルに追加する。

**Files:**
- Create: `src/lib/db/requests.ts`
- Test: `tests/db/requests.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

`tests/db/requests.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from "vitest";
import {
  listRequests,
  getRequest,
  createRequest,
  updateRequest,
  cancelRequest,
} from "@/lib/db/requests";
import { createServiceClient } from "@/lib/supabase-server";
import { resetDb } from "../helpers/reset-db";
import type { Actor } from "@/lib/auth";

const db = createServiceClient();
const admin: Actor = { role: "admin", adminId: "a1", roleLevel: 1 };
const staff: Actor = { role: "staff", staffId: "s1" };

let propertyId: string;

// 翌日以降の YYYY-MM-DD を返すヘルパー（当日割り当て不可の検証用）
function dateStr(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

beforeEach(async () => {
  await resetDb();
  const { data: owner } = await db.from("owners").insert({ name: "オーナーA" }).select().single();
  const { data: property } = await db
    .from("properties").insert({ owner_id: owner!.id, name: "物件A" }).select().single();
  propertyId = property!.id;
});

describe("cleaning_requests データアクセス（管理者CRUD）", () => {
  it("管理者は依頼を作成・取得できる", async () => {
    const created = await createRequest(admin, {
      property_id: propertyId,
      checkin_date: dateStr(3),
      checkout_date: dateStr(5),
      guest_count: 2,
    });
    expect(created.status).toBe("unassigned");
    expect(created.assignment_deadline).toBeTruthy();
    const list = await listRequests(admin);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(created.id);
  });

  it("管理者以外は作成できない", async () => {
    await expect(
      createRequest(staff, {
        property_id: propertyId,
        checkin_date: dateStr(3),
        checkout_date: dateStr(5),
        guest_count: 2,
      }),
    ).rejects.toThrow("管理者権限が必要です");
  });

  it("チェックイン日が当日以前なら拒否する", async () => {
    await expect(
      createRequest(admin, {
        property_id: propertyId,
        checkin_date: dateStr(0),
        checkout_date: dateStr(2),
        guest_count: 2,
      }),
    ).rejects.toThrow("チェックイン日は翌日以降");
  });

  it("チェックアウトがチェックイン以前なら拒否する", async () => {
    await expect(
      createRequest(admin, {
        property_id: propertyId,
        checkin_date: dateStr(5),
        checkout_date: dateStr(3),
        guest_count: 2,
      }),
    ).rejects.toThrow("チェックアウト日はチェックイン日より後");
  });

  it("依頼を編集できる", async () => {
    const created = await createRequest(admin, {
      property_id: propertyId,
      checkin_date: dateStr(3),
      checkout_date: dateStr(5),
      guest_count: 2,
    });
    await updateRequest(admin, created.id, { guest_count: 4 });
    const fetched = await getRequest(admin, created.id);
    expect(fetched?.guest_count).toBe(4);
  });

  it("cancelRequest は status を cancelled にする", async () => {
    const created = await createRequest(admin, {
      property_id: propertyId,
      checkin_date: dateStr(3),
      checkout_date: dateStr(5),
      guest_count: 2,
    });
    await cancelRequest(admin, created.id);
    const fetched = await getRequest(admin, created.id);
    expect(fetched?.status).toBe("cancelled");
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npm test -- requests`
Expected: FAIL（`@/lib/db/requests` が存在しない）

- [ ] **Step 3: データアクセスを実装**

`src/lib/db/requests.ts`:
```typescript
import "server-only";
import { createServiceClient } from "@/lib/supabase-server";
import { assertAdmin } from "@/lib/db/scope";
import { assertTransition, type CleaningStatus } from "@/lib/status-machine";
import type { Actor } from "@/lib/auth";

export type CleaningRequestInput = {
  property_id: string;
  checkin_date: string; // YYYY-MM-DD
  checkout_date: string; // YYYY-MM-DD
  guest_count: number;
  option_memo?: string;
};

export type CleaningRequest = {
  id: string;
  property_id: string;
  checkin_date: string;
  checkout_date: string;
  guest_count: number;
  option_memo: string | null;
  status: CleaningStatus;
  assigned_staff_id: string | null;
  assignment_deadline: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

// 当日割り当て不可: checkin は翌日以降。checkout > checkin。guest_count > 0。
// current_date を使う CHECK 制約は immutable でないため不可 → アプリ層で検証する。
function validateRequestFields(input: {
  checkin_date: string;
  checkout_date: string;
  guest_count: number;
}): void {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkin = new Date(input.checkin_date + "T00:00:00");
  const checkout = new Date(input.checkout_date + "T00:00:00");
  if (checkin <= today) {
    throw new Error("チェックイン日は翌日以降にしてください");
  }
  if (checkout <= checkin) {
    throw new Error("チェックアウト日はチェックイン日より後にしてください");
  }
  if (input.guest_count <= 0) {
    throw new Error("人数は1以上にしてください");
  }
}

export async function listRequests(actor: Actor): Promise<CleaningRequest[]> {
  assertAdmin(actor);
  const db = createServiceClient();
  const { data, error } = await db
    .from("cleaning_requests")
    .select("*")
    .order("checkin_date", { ascending: true });
  if (error) throw error;
  return data as CleaningRequest[];
}

export async function getRequest(
  actor: Actor,
  id: string,
): Promise<CleaningRequest | null> {
  assertAdmin(actor);
  const db = createServiceClient();
  const { data, error } = await db
    .from("cleaning_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as CleaningRequest | null;
}

export async function createRequest(
  actor: Actor,
  input: CleaningRequestInput,
): Promise<CleaningRequest> {
  assertAdmin(actor);
  validateRequestFields(input);
  const db = createServiceClient();
  // 24h 有効期限（設計書 6章: assignment_deadline = 送信 + 24h）
  const deadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await db
    .from("cleaning_requests")
    .insert({
      property_id: input.property_id,
      checkin_date: input.checkin_date,
      checkout_date: input.checkout_date,
      guest_count: input.guest_count,
      option_memo: input.option_memo ?? null,
      status: "unassigned",
      assignment_deadline: deadline,
      created_by: actor.adminId,
    })
    .select()
    .single();
  if (error) throw error;
  // TODO(Plan 3): 依頼作成時に担当スタッフへ通知
  return data as CleaningRequest;
}

// 編集可能フィールド: checkin/checkout/guest_count/option_memo。property_id は変更不可。
export type CleaningRequestPatch = Partial<
  Omit<CleaningRequestInput, "property_id">
>;

export async function updateRequest(
  actor: Actor,
  id: string,
  patch: CleaningRequestPatch,
): Promise<void> {
  assertAdmin(actor);
  // 日付/人数を触る場合は現行値とマージして検証する
  if (
    patch.checkin_date !== undefined ||
    patch.checkout_date !== undefined ||
    patch.guest_count !== undefined
  ) {
    const current = await getRequest(actor, id);
    if (!current) throw new Error("依頼が見つかりません");
    validateRequestFields({
      checkin_date: patch.checkin_date ?? current.checkin_date,
      checkout_date: patch.checkout_date ?? current.checkout_date,
      guest_count: patch.guest_count ?? current.guest_count,
    });
  }
  const db = createServiceClient();
  const { error } = await db
    .from("cleaning_requests")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

// 管理者による依頼キャンセル（cancelled へ遷移。物理削除しない）。
export async function cancelRequest(actor: Actor, id: string): Promise<void> {
  assertAdmin(actor);
  const db = createServiceClient();
  const { data: req, error: readError } = await db
    .from("cleaning_requests")
    .select("status")
    .eq("id", id)
    .maybeSingle();
  if (readError) throw readError;
  if (!req) throw new Error("依頼が見つかりません");
  assertTransition(req.status as CleaningStatus, "cancelled");
  const { error } = await db
    .from("cleaning_requests")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npm test -- requests`
Expected: PASS（6 passed）

- [ ] **Step 5: Commit**

```bash
cd outputs/clients/minpaku-cleaning
git add app/src/lib/db/requests.ts app/tests/db/requests.test.ts
git commit -m "feat: 清掃依頼データアクセス（管理者CRUD）"
```

---

## Task 4: 清掃依頼データアクセス — 割当・進行遷移＋スタッフ向けクエリ（requests.ts）

Task 3 の `requests.ts` に、早い者勝ち承認・管理者手動割当・清掃開始・完了確認の遷移関数と、スタッフ向けの一覧/取得クエリを追加する。

**Files:**
- Modify: `src/lib/db/requests.ts`
- Modify: `tests/db/requests.test.ts`

- [ ] **Step 1: 失敗するテストを追加**

`tests/db/requests.test.ts` の import に追加（既存 import 文を以下に差し替え）:
```typescript
import {
  listRequests,
  getRequest,
  createRequest,
  updateRequest,
  cancelRequest,
  claimRequest,
  assignRequest,
  startRequest,
  confirmRequest,
  listRequestsForStaff,
  getRequestForStaff,
  RequestAlreadyClaimedError,
} from "@/lib/db/requests";
```

`tests/db/requests.test.ts` の末尾（最後の `});` の後）に追加:
```typescript
describe("cleaning_requests 割当・進行遷移", () => {
  // 担当スタッフ付きの依頼を1件作るヘルパー
  async function seedAssignedStaffAndRequest() {
    const { data: st } = await db.from("staff").insert({ name: "スタッフX" }).select().single();
    await db.from("staff_assignments").insert({ staff_id: st!.id, property_id: propertyId });
    const req = await createRequest(admin, {
      property_id: propertyId,
      checkin_date: dateStr(3),
      checkout_date: dateStr(5),
      guest_count: 2,
    });
    return { staffId: st!.id as string, requestId: req.id };
  }

  it("担当スタッフは未割当の依頼を承認できる（early claim）", async () => {
    const { staffId, requestId } = await seedAssignedStaffAndRequest();
    const staffActor: Actor = { role: "staff", staffId };
    await claimRequest(staffActor, requestId);
    const req = await getRequest(admin, requestId);
    expect(req?.status).toBe("assigned");
    expect(req?.assigned_staff_id).toBe(staffId);
  });

  it("既に割当済みの依頼を承認すると RequestAlreadyClaimedError", async () => {
    const { staffId, requestId } = await seedAssignedStaffAndRequest();
    const staffActor: Actor = { role: "staff", staffId };
    await claimRequest(staffActor, requestId);
    // 別スタッフも同物件担当にして二重承認を試みる
    const { data: st2 } = await db.from("staff").insert({ name: "スタッフY" }).select().single();
    await db.from("staff_assignments").insert({ staff_id: st2!.id, property_id: propertyId });
    await expect(
      claimRequest({ role: "staff", staffId: st2!.id }, requestId),
    ).rejects.toThrow(RequestAlreadyClaimedError);
  });

  it("担当外スタッフは承認できない", async () => {
    const { requestId } = await seedAssignedStaffAndRequest();
    const { data: outsider } = await db.from("staff").insert({ name: "担当外" }).select().single();
    await expect(
      claimRequest({ role: "staff", staffId: outsider!.id }, requestId),
    ).rejects.toThrow("この物件の担当ではありません");
  });

  it("管理者は手動でスタッフを割り当てられる", async () => {
    const { staffId, requestId } = await seedAssignedStaffAndRequest();
    await assignRequest(admin, requestId, staffId);
    const req = await getRequest(admin, requestId);
    expect(req?.status).toBe("assigned");
    expect(req?.assigned_staff_id).toBe(staffId);
  });

  it("割当→開始→報告（startRequest）の遷移", async () => {
    const { staffId, requestId } = await seedAssignedStaffAndRequest();
    const staffActor: Actor = { role: "staff", staffId };
    await claimRequest(staffActor, requestId);
    await startRequest(staffActor, requestId);
    const req = await getRequest(admin, requestId);
    expect(req?.status).toBe("in_progress");
  });

  it("未割当の依頼は開始できない（状態機械で拒否）", async () => {
    const { staffId, requestId } = await seedAssignedStaffAndRequest();
    await expect(
      startRequest({ role: "staff", staffId }, requestId),
    ).rejects.toThrow("自分が担当する依頼ではありません");
  });

  it("confirmRequest は reported → confirmed に遷移する", async () => {
    const { staffId, requestId } = await seedAssignedStaffAndRequest();
    // reported まで進める
    await db
      .from("cleaning_requests")
      .update({ status: "reported", assigned_staff_id: staffId })
      .eq("id", requestId);
    await confirmRequest(admin, requestId);
    const req = await getRequest(admin, requestId);
    expect(req?.status).toBe("confirmed");
  });

  it("listRequestsForStaff は担当物件の未割当＋自分の割当分を物件名付きで返す", async () => {
    const { staffId, requestId } = await seedAssignedStaffAndRequest();
    const staffActor: Actor = { role: "staff", staffId };
    const list = await listRequestsForStaff(staffActor);
    const found = list.find((r) => r.id === requestId);
    expect(found).toBeTruthy();
    expect(found?.property_name).toBe("物件A");
  });

  it("getRequestForStaff は担当物件の依頼を物件名・チェックリスト付きで返す", async () => {
    const { staffId, requestId } = await seedAssignedStaffAndRequest();
    const result = await getRequestForStaff({ role: "staff", staffId }, requestId);
    expect(result?.id).toBe(requestId);
    expect(result?.property.name).toBe("物件A");
    expect(Array.isArray(result?.property.checklist_template)).toBe(true);
  });

  it("getRequestForStaff は担当外物件の依頼に null を返す", async () => {
    const { requestId } = await seedAssignedStaffAndRequest();
    const { data: outsider } = await db.from("staff").insert({ name: "担当外2" }).select().single();
    const result = await getRequestForStaff({ role: "staff", staffId: outsider!.id }, requestId);
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npm test -- requests`
Expected: FAIL（`claimRequest` 等がエクスポートされていない）

- [ ] **Step 3: 遷移関数とスタッフ向けクエリを追加**

`src/lib/db/requests.ts` の末尾に追加:
```typescript
// ---- 割当・進行遷移 ----

export class RequestAlreadyClaimedError extends Error {}

// スタッフが対象依頼の物件を担当しているか確認する。担当外なら例外。
async function assertStaffAssignedToRequestProperty(
  db: ReturnType<typeof createServiceClient>,
  staffId: string,
  requestId: string,
): Promise<void> {
  const { data: req } = await db
    .from("cleaning_requests")
    .select("property_id")
    .eq("id", requestId)
    .maybeSingle();
  if (!req) throw new Error("依頼が見つかりません");
  const { data: assignment } = await db
    .from("staff_assignments")
    .select("property_id")
    .eq("staff_id", staffId)
    .eq("property_id", req.property_id)
    .maybeSingle();
  if (!assignment) throw new Error("この物件の担当ではありません");
}

// 早い者勝ち承認: status='unassigned' の条件付きUPDATEで排他する。
// 影響行数1 → 承認確定 / 0 → 既に他スタッフが取得済み。
export async function claimRequest(
  actor: Actor,
  requestId: string,
): Promise<void> {
  if (actor.role !== "staff") throw new Error("スタッフ専用の操作です");
  const db = createServiceClient();
  await assertStaffAssignedToRequestProperty(db, actor.staffId, requestId);
  const { data, error } = await db
    .from("cleaning_requests")
    .update({
      status: "assigned",
      assigned_staff_id: actor.staffId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("status", "unassigned")
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new RequestAlreadyClaimedError("この依頼は既に他のスタッフが承認しました");
  }
}

// 管理者による手動割当（unassigned / assigned のどちらからも可・再割当含む）。
export async function assignRequest(
  actor: Actor,
  requestId: string,
  staffId: string,
): Promise<void> {
  assertAdmin(actor);
  const db = createServiceClient();
  const { data: req } = await db
    .from("cleaning_requests")
    .select("status")
    .eq("id", requestId)
    .maybeSingle();
  if (!req) throw new Error("依頼が見つかりません");
  if (req.status !== "unassigned" && req.status !== "assigned") {
    throw new Error(`${req.status} の依頼は割り当てを変更できません`);
  }
  const { error } = await db
    .from("cleaning_requests")
    .update({
      status: "assigned",
      assigned_staff_id: staffId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId);
  if (error) throw error;
}

// スタッフが清掃を開始する（assigned → in_progress）。担当本人のみ。
export async function startRequest(
  actor: Actor,
  requestId: string,
): Promise<void> {
  if (actor.role !== "staff") throw new Error("スタッフ専用の操作です");
  const db = createServiceClient();
  const { data: req } = await db
    .from("cleaning_requests")
    .select("status, assigned_staff_id")
    .eq("id", requestId)
    .maybeSingle();
  if (!req) throw new Error("依頼が見つかりません");
  if (req.assigned_staff_id !== actor.staffId) {
    throw new Error("自分が担当する依頼ではありません");
  }
  assertTransition(req.status as CleaningStatus, "in_progress");
  const { error } = await db
    .from("cleaning_requests")
    .update({ status: "in_progress", updated_at: new Date().toISOString() })
    .eq("id", requestId);
  if (error) throw error;
}

// 管理者が完了報告を確認する（reported → confirmed）。
export async function confirmRequest(
  actor: Actor,
  requestId: string,
): Promise<void> {
  assertAdmin(actor);
  const db = createServiceClient();
  const { data: req } = await db
    .from("cleaning_requests")
    .select("status")
    .eq("id", requestId)
    .maybeSingle();
  if (!req) throw new Error("依頼が見つかりません");
  assertTransition(req.status as CleaningStatus, "confirmed");
  const { error } = await db
    .from("cleaning_requests")
    .update({ status: "confirmed", updated_at: new Date().toISOString() })
    .eq("id", requestId);
  if (error) throw error;
  // TODO(Plan 3): 確認完了時に物件オーナーへ通知
}

// ---- スタッフ向けクエリ ----

export type StaffRequestListItem = CleaningRequest & { property_name: string };

// スタッフの担当物件の「未割当（承認可能）」依頼 + 「自分に割当済み」依頼。
// 一覧表示用に物件名を同梱する。
export async function listRequestsForStaff(
  actor: Actor,
): Promise<StaffRequestListItem[]> {
  if (actor.role !== "staff") throw new Error("スタッフ専用の操作です");
  const db = createServiceClient();
  const { data: assignments } = await db
    .from("staff_assignments")
    .select("property_id")
    .eq("staff_id", actor.staffId);
  const propertyIds = (assignments ?? []).map((a) => a.property_id);
  if (propertyIds.length === 0) return [];
  const { data, error } = await db
    .from("cleaning_requests")
    .select("*, properties(name)")
    .in("property_id", propertyIds)
    .or(`status.eq.unassigned,assigned_staff_id.eq.${actor.staffId}`)
    .order("checkin_date", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row: Record<string, unknown>) => {
    const { properties, ...request } = row as Record<string, unknown> & {
      properties: { name: string } | null;
    };
    return {
      ...(request as unknown as CleaningRequest),
      property_name: properties?.name ?? "?",
    };
  });
}

export type StaffRequestDetail = CleaningRequest & {
  property: { name: string; checklist_template: unknown[] };
};

// スタッフ向けの依頼詳細。担当外物件の依頼は null。物件名・チェックリストテンプレ同梱。
export async function getRequestForStaff(
  actor: Actor,
  requestId: string,
): Promise<StaffRequestDetail | null> {
  if (actor.role !== "staff") throw new Error("スタッフ専用の操作です");
  const db = createServiceClient();
  const { data, error } = await db
    .from("cleaning_requests")
    .select("*, properties(name, checklist_template)")
    .eq("id", requestId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { data: assignment } = await db
    .from("staff_assignments")
    .select("property_id")
    .eq("staff_id", actor.staffId)
    .eq("property_id", data.property_id)
    .maybeSingle();
  if (!assignment) return null;
  const { properties, ...request } = data as Record<string, unknown> & {
    properties: { name: string; checklist_template: unknown[] };
  };
  return {
    ...(request as unknown as CleaningRequest),
    property: {
      name: properties.name,
      checklist_template: properties.checklist_template ?? [],
    },
  };
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npm test -- requests`
Expected: PASS（Task 3 の6件 + 本タスクの10件 = 16 passed）

- [ ] **Step 5: Commit**

```bash
cd outputs/clients/minpaku-cleaning
git add app/src/lib/db/requests.ts app/tests/db/requests.test.ts
git commit -m "feat: 清掃依頼の割当・進行遷移とスタッフ向けクエリ"
```

---

## Task 5: 完了報告データアクセス（reports.ts）

`cleaning_reports` と `report_photos` のデータアクセス。スタッフによる完了報告の提出（チェックリスト結果＋写真パス、`in_progress → reported` 遷移）と、管理者向けの報告取得を実装する。写真の実体アップロードは Task 6 の `storage.ts` が担い、本タスクは `report_photos` の行管理のみ。

**Files:**
- Create: `src/lib/db/reports.ts`
- Test: `tests/db/reports.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

`tests/db/reports.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { submitReport, getReportForRequest } from "@/lib/db/reports";
import { createServiceClient } from "@/lib/supabase-server";
import { resetDb } from "../helpers/reset-db";
import type { Actor } from "@/lib/auth";

const db = createServiceClient();
const admin: Actor = { role: "admin", adminId: "a1", roleLevel: 1 };

let propertyId: string;
let staffId: string;
let requestId: string;
let staffActor: Actor;

function dateStr(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

beforeEach(async () => {
  await resetDb();
  const { data: owner } = await db.from("owners").insert({ name: "オーナーA" }).select().single();
  const { data: property } = await db
    .from("properties").insert({ owner_id: owner!.id, name: "物件A" }).select().single();
  propertyId = property!.id;
  const { data: st } = await db.from("staff").insert({ name: "スタッフX" }).select().single();
  staffId = st!.id;
  staffActor = { role: "staff", staffId };
  await db.from("staff_assignments").insert({ staff_id: staffId, property_id: propertyId });
  // in_progress かつ自分担当の依頼を用意
  const { data: req } = await db
    .from("cleaning_requests")
    .insert({
      property_id: propertyId,
      checkin_date: dateStr(3),
      checkout_date: dateStr(5),
      guest_count: 2,
      status: "in_progress",
      assigned_staff_id: staffId,
    })
    .select()
    .single();
  requestId = req!.id;
});

describe("cleaning_reports データアクセス", () => {
  it("担当スタッフは完了報告を提出でき、依頼が reported になる", async () => {
    const report = await submitReport(
      staffActor,
      requestId,
      [{ label: "浴室清掃", checked: true }],
      [],
    );
    expect(report.request_id).toBe(requestId);
    const { data: req } = await db
      .from("cleaning_requests").select("status").eq("id", requestId).maybeSingle();
    expect(req?.status).toBe("reported");
  });

  it("写真パス付きで提出すると report_photos 行が作られる", async () => {
    const report = await submitReport(
      staffActor,
      requestId,
      [{ label: "浴室清掃", checked: true }],
      ["req/photo-1.jpg", "req/photo-2.jpg"],
    );
    const { data: photos } = await db
      .from("report_photos").select("*").eq("report_id", report.id);
    expect(photos).toHaveLength(2);
    expect(photos![0].expires_at).toBeTruthy();
  });

  it("in_progress でない依頼には提出できない", async () => {
    await db.from("cleaning_requests").update({ status: "assigned" }).eq("id", requestId);
    await expect(
      submitReport(staffActor, requestId, [], []),
    ).rejects.toThrow("清掃中の依頼のみ完了報告");
  });

  it("担当外スタッフは提出できない", async () => {
    const { data: other } = await db.from("staff").insert({ name: "別人" }).select().single();
    await expect(
      submitReport({ role: "staff", staffId: other!.id }, requestId, [], []),
    ).rejects.toThrow("自分が担当する依頼ではありません");
  });

  it("getReportForRequest は管理者に報告と写真を返す", async () => {
    const report = await submitReport(
      staffActor,
      requestId,
      [{ label: "浴室清掃", checked: true }],
      ["req/photo-1.jpg"],
    );
    const result = await getReportForRequest(admin, requestId);
    expect(result?.report.id).toBe(report.id);
    expect(result?.photos).toHaveLength(1);
  });

  it("getReportForRequest は報告がなければ null", async () => {
    expect(await getReportForRequest(admin, requestId)).toBeNull();
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npm test -- reports`
Expected: FAIL（`@/lib/db/reports` が存在しない）

- [ ] **Step 3: データアクセスを実装**

`src/lib/db/reports.ts`:
```typescript
import "server-only";
import { createServiceClient } from "@/lib/supabase-server";
import { assertAdmin } from "@/lib/db/scope";
import type { Actor } from "@/lib/auth";

// チェックリスト1項目の提出結果。label は properties.checklist_template から、
// checked/note はスタッフが記入する。
export type ChecklistResultItem = {
  label: string;
  checked: boolean;
  note?: string;
};

export type CleaningReport = {
  id: string;
  request_id: string;
  staff_id: string;
  checklist_result: ChecklistResultItem[];
  submitted_at: string;
};

export type ReportPhoto = {
  id: string;
  report_id: string;
  storage_path: string;
  uploaded_at: string;
  expires_at: string;
};

// スタッフが完了報告を提出する。cleaning_reports を作成し、写真パスがあれば
// report_photos 行を作り、依頼を in_progress → reported に遷移させる。
// photoPaths は Task 6 の storage.ts で事前にアップロード済みの保存パス。
export async function submitReport(
  actor: Actor,
  requestId: string,
  checklistResult: ChecklistResultItem[],
  photoPaths: string[],
): Promise<CleaningReport> {
  if (actor.role !== "staff") throw new Error("スタッフ専用の操作です");
  const db = createServiceClient();
  const { data: req, error: readError } = await db
    .from("cleaning_requests")
    .select("status, assigned_staff_id")
    .eq("id", requestId)
    .maybeSingle();
  if (readError) throw readError;
  if (!req) throw new Error("依頼が見つかりません");
  if (req.assigned_staff_id !== actor.staffId) {
    throw new Error("自分が担当する依頼ではありません");
  }
  if (req.status !== "in_progress") {
    throw new Error("清掃中の依頼のみ完了報告できます");
  }

  const { data: report, error } = await db
    .from("cleaning_reports")
    .insert({
      request_id: requestId,
      staff_id: actor.staffId,
      checklist_result: checklistResult,
    })
    .select()
    .single();
  if (error) throw error;

  if (photoPaths.length > 0) {
    // 設計書 8章: expires_at = uploaded_at + 3ヶ月
    const expiresAt = new Date(
      Date.now() + 90 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const { error: photoError } = await db.from("report_photos").insert(
      photoPaths.map((p) => ({
        report_id: report.id,
        storage_path: p,
        expires_at: expiresAt,
      })),
    );
    if (photoError) throw photoError;
  }

  const { error: statusError } = await db
    .from("cleaning_requests")
    .update({ status: "reported", updated_at: new Date().toISOString() })
    .eq("id", requestId);
  if (statusError) throw statusError;
  // TODO(Plan 3): 完了報告時に管理者へ通知

  return report as CleaningReport;
}

// 管理者向け: 依頼に紐づく完了報告と写真行を取得する。
export async function getReportForRequest(
  actor: Actor,
  requestId: string,
): Promise<{ report: CleaningReport; photos: ReportPhoto[] } | null> {
  assertAdmin(actor);
  const db = createServiceClient();
  const { data: report, error } = await db
    .from("cleaning_reports")
    .select("*")
    .eq("request_id", requestId)
    .maybeSingle();
  if (error) throw error;
  if (!report) return null;
  const { data: photos, error: photoError } = await db
    .from("report_photos")
    .select("*")
    .eq("report_id", report.id)
    .order("uploaded_at", { ascending: true });
  if (photoError) throw photoError;
  return {
    report: report as CleaningReport,
    photos: (photos ?? []) as ReportPhoto[],
  };
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npm test -- reports`
Expected: PASS（6 passed）

- [ ] **Step 5: Commit**

```bash
cd outputs/clients/minpaku-cleaning
git add app/src/lib/db/reports.ts app/tests/db/reports.test.ts
git commit -m "feat: 完了報告データアクセス（cleaning_reports / report_photos）"
```

---

## Task 6: Supabase Storage — バケット migration + storage.ts

完了写真の保存先 Storage バケットを作成し、アップロード・署名URL発行・削除のヘルパーを実装する。

**Files:**
- Create: `supabase/migrations/0004_storage_bucket.sql`
- Create: `src/lib/storage.ts`
- Test: `tests/lib/storage.test.ts`

- [ ] **Step 1: バケット作成 migration を書く**

`supabase/migrations/0004_storage_bucket.sql`:
```sql
-- 民泊清掃管理アプリ migration 0004: 完了写真用 Storage バケット
-- 非公開バケット。閲覧は service role 経由の短期署名URLのみ（設計書 8章）。
insert into storage.buckets (id, name, public)
values ('report-photos', 'report-photos', false)
on conflict (id) do nothing;
```

> 注: migration 0003 は Task 5 の code review で追加した `cleaning_reports.request_id` の UNIQUE 制約（`0003_report_unique.sql`）。本タスクの Storage バケットは 0004。

- [ ] **Step 2: migration を適用**

```bash
cd outputs/clients/minpaku-cleaning/app
npx supabase db reset
```
0001→0002→0003→0004 が適用される。エラーなく完了することを確認。

- [ ] **Step 3: 失敗するテストを書く**

`tests/lib/storage.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import {
  uploadReportPhoto,
  getPhotoSignedUrl,
  deletePhoto,
} from "@/lib/storage";

describe("storage（report-photos バケット）", () => {
  it("アップロードすると保存パスを返し、署名URLを発行できる", async () => {
    const buf = Buffer.from([0xff, 0xd8, 0xff, 0xd9]); // 最小のJPEGっぽいバイト列
    const path = await uploadReportPhoto("req-test", buf, "image/jpeg");
    expect(path).toMatch(/^req-test\/.+\.jpg$/);

    const url = await getPhotoSignedUrl(path);
    expect(url).toContain("report-photos");
    expect(url).toContain("token=");

    // 後始末
    await deletePhoto(path);
  });

  it("削除した写真はもう署名URLを発行しても実体がない", async () => {
    const buf = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
    const path = await uploadReportPhoto("req-test2", buf, "image/jpeg");
    await deletePhoto(path);
    // 署名URL自体は発行できる（存在チェックはしない）が、再削除はエラーにならない
    await expect(deletePhoto(path)).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 4: テストが失敗することを確認**

Run: `npm test -- storage`
Expected: FAIL（`@/lib/storage` が存在しない）

- [ ] **Step 5: storage.ts を実装**

`src/lib/storage.ts`:
```typescript
import "server-only";
import { randomBytes } from "crypto";
import { createServiceClient } from "@/lib/supabase-server";

const BUCKET = "report-photos";

// 完了写真を Storage にアップロードし、保存パスを返す。
// パスは requestId/タイムスタンプ-ランダム.拡張子 で衝突を避ける。
export async function uploadReportPhoto(
  requestId: string,
  file: ArrayBuffer | Buffer,
  contentType: string,
): Promise<string> {
  const db = createServiceClient();
  const ext = contentType === "image/png" ? "png" : "jpg";
  const path = `${requestId}/${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;
  const { error } = await db.storage
    .from(BUCKET)
    .upload(path, file, { contentType });
  if (error) throw error;
  return path;
}

// 保存パスから短期署名付きURLを発行する（閲覧用・デフォルト5分）。
export async function getPhotoSignedUrl(
  path: string,
  expiresInSec = 300,
): Promise<string> {
  const db = createServiceClient();
  const { data, error } = await db.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresInSec);
  if (error) throw error;
  return data.signedUrl;
}

// Storage から写真を削除する（Plan 3 の期限切れ削除 cron が利用予定）。
// 存在しないパスを渡してもエラーにしない（冪等）。
export async function deletePhoto(path: string): Promise<void> {
  const db = createServiceClient();
  const { error } = await db.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}
```

- [ ] **Step 6: テストが通ることを確認**

Run: `npm test -- storage`
Expected: PASS（2 passed）

- [ ] **Step 7: Commit**

```bash
cd outputs/clients/minpaku-cleaning
git add app/supabase/migrations/0004_storage_bucket.sql app/src/lib/storage.ts app/tests/lib/storage.test.ts
git commit -m "feat: 完了写真用 Storage バケットとアップロードヘルパー"
```

---

## Task 7: 備品補充依頼データアクセス（supplies.ts）

`supply_requests` のデータアクセス。スタッフによる作成（担当物件のみ）と管理者向け一覧。

**Files:**
- Create: `src/lib/db/supplies.ts`
- Test: `tests/db/supplies.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

`tests/db/supplies.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { createSupplyRequest, listSupplyRequests } from "@/lib/db/supplies";
import { createServiceClient } from "@/lib/supabase-server";
import { resetDb } from "../helpers/reset-db";
import type { Actor } from "@/lib/auth";

const db = createServiceClient();
const admin: Actor = { role: "admin", adminId: "a1", roleLevel: 1 };

let propertyId: string;
let staffId: string;
let staffActor: Actor;

beforeEach(async () => {
  await resetDb();
  const { data: owner } = await db.from("owners").insert({ name: "オーナーA" }).select().single();
  const { data: property } = await db
    .from("properties").insert({ owner_id: owner!.id, name: "物件A" }).select().single();
  propertyId = property!.id;
  const { data: st } = await db.from("staff").insert({ name: "スタッフX" }).select().single();
  staffId = st!.id;
  staffActor = { role: "staff", staffId };
  await db.from("staff_assignments").insert({ staff_id: staffId, property_id: propertyId });
});

describe("supply_requests データアクセス", () => {
  it("担当スタッフは備品補充依頼を作成できる", async () => {
    const created = await createSupplyRequest(staffActor, {
      property_id: propertyId,
      items: "トイレットペーパー 6ロール、ハンドソープ 2本",
    });
    expect(created.items).toContain("トイレットペーパー");
    expect(created.staff_id).toBe(staffId);
  });

  it("担当外物件には備品補充依頼を作成できない", async () => {
    const { data: owner2 } = await db.from("owners").insert({ name: "オーナーB" }).select().single();
    const { data: prop2 } = await db
      .from("properties").insert({ owner_id: owner2!.id, name: "物件B" }).select().single();
    await expect(
      createSupplyRequest(staffActor, { property_id: prop2!.id, items: "x" }),
    ).rejects.toThrow("この物件の担当ではありません");
  });

  it("管理者以外は一覧を取得できない", async () => {
    await expect(listSupplyRequests(staffActor)).rejects.toThrow(
      "管理者権限が必要です",
    );
  });

  it("管理者は全備品補充依頼を新しい順に取得できる", async () => {
    await createSupplyRequest(staffActor, { property_id: propertyId, items: "A" });
    await createSupplyRequest(staffActor, { property_id: propertyId, items: "B" });
    const list = await listSupplyRequests(admin);
    expect(list).toHaveLength(2);
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npm test -- supplies`
Expected: FAIL（`@/lib/db/supplies` が存在しない）

- [ ] **Step 3: データアクセスを実装**

`src/lib/db/supplies.ts`:
```typescript
import "server-only";
import { createServiceClient } from "@/lib/supabase-server";
import { assertAdmin } from "@/lib/db/scope";
import type { Actor } from "@/lib/auth";

export type SupplyRequestInput = {
  property_id: string;
  request_id?: string;
  items: string;
};

export type SupplyRequest = {
  id: string;
  property_id: string;
  request_id: string | null;
  staff_id: string;
  items: string;
  created_at: string;
};

// スタッフが備品補充依頼を作成する。担当物件のみ。
export async function createSupplyRequest(
  actor: Actor,
  input: SupplyRequestInput,
): Promise<SupplyRequest> {
  if (actor.role !== "staff") throw new Error("スタッフ専用の操作です");
  const db = createServiceClient();
  const { data: assignment } = await db
    .from("staff_assignments")
    .select("property_id")
    .eq("staff_id", actor.staffId)
    .eq("property_id", input.property_id)
    .maybeSingle();
  if (!assignment) throw new Error("この物件の担当ではありません");
  const { data, error } = await db
    .from("supply_requests")
    .insert({
      property_id: input.property_id,
      request_id: input.request_id ?? null,
      staff_id: actor.staffId,
      items: input.items,
    })
    .select()
    .single();
  if (error) throw error;
  // TODO(Plan 3): 備品補充依頼時に管理者＋オーナーへ通知
  return data as SupplyRequest;
}

// 管理者向け: 全備品補充依頼を新しい順に取得する。
export async function listSupplyRequests(
  actor: Actor,
): Promise<SupplyRequest[]> {
  assertAdmin(actor);
  const db = createServiceClient();
  const { data, error } = await db
    .from("supply_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as SupplyRequest[];
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npm test -- supplies`
Expected: PASS（4 passed）

- [ ] **Step 5: Commit**

```bash
cd outputs/clients/minpaku-cleaning
git add app/src/lib/db/supplies.ts app/tests/db/supplies.test.ts
git commit -m "feat: 備品補充依頼データアクセス"
```

---

## Task 8: 管理者 依頼 API ルート

管理者の依頼 CRUD と単一依頼への操作（割当/確認/キャンセル）の HTTP 境界。Plan 1 の API ルートと同じパターン: `resolveAdminActor()` で401ガード → zod バリデーション → データ層呼び出しを `try/catch` で包み `AuthorizationError`→403。

**Files:**
- Create: `src/app/api/admin/requests/route.ts`
- Create: `src/app/api/admin/requests/[id]/route.ts`

- [ ] **Step 1: 依頼コレクションのルートを実装**

`src/app/api/admin/requests/route.ts`:
```typescript
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { resolveAdminActor } from "@/lib/supabase-auth";
import {
  listRequests,
  createRequest,
  updateRequest,
} from "@/lib/db/requests";
import { AuthorizationError } from "@/lib/db/scope";

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 形式で指定してください");

const createSchema = z.object({
  property_id: z.string().uuid(),
  checkin_date: dateStr,
  checkout_date: dateStr,
  guest_count: z.number().int().positive(),
  option_memo: z.string().optional(),
});
// 編集スキーマ: property_id は変更不可
const updateSchema = z
  .object({ id: z.string().uuid() })
  .and(createSchema.omit({ property_id: true }).partial());

export async function GET() {
  const actor = await resolveAdminActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await listRequests(actor));
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
    return NextResponse.json(await createRequest(actor, parsed.data));
  } catch (e) {
    if (e instanceof AuthorizationError)
      return NextResponse.json({ error: e.message }, { status: 403 });
    // 日付・人数バリデーションエラーは 400 として返す
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
  const { id, ...patch } = parsed.data;
  try {
    await updateRequest(actor, id, patch);
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

- [ ] **Step 2: 単一依頼への操作ルートを実装**

`src/app/api/admin/requests/[id]/route.ts`:
```typescript
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { resolveAdminActor } from "@/lib/supabase-auth";
import {
  assignRequest,
  confirmRequest,
  cancelRequest,
} from "@/lib/db/requests";
import { AuthorizationError } from "@/lib/db/scope";
import { InvalidTransitionError } from "@/lib/status-machine";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("assign"), staffId: z.string().uuid() }),
  z.object({ action: z.literal("confirm") }),
  z.object({ action: z.literal("cancel") }),
]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await resolveAdminActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = actionSchema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  try {
    if (parsed.data.action === "assign") {
      await assignRequest(actor, id, parsed.data.staffId);
    } else if (parsed.data.action === "confirm") {
      await confirmRequest(actor, id);
    } else {
      await cancelRequest(actor, id);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthorizationError)
      return NextResponse.json({ error: e.message }, { status: 403 });
    // 状態機械違反・割当不可は 409（競合）として返す
    if (e instanceof InvalidTransitionError)
      return NextResponse.json({ error: e.message }, { status: 409 });
    if (e instanceof Error)
      return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
```

- [ ] **Step 3: ビルドが通ることを確認**

Run: `npm run build`
Expected: ビルド成功。ルート表に `/api/admin/requests` と `/api/admin/requests/[id]` が出る。

> 注: API ルートは Plan 1 同様ユニットテストを書かない（データ層がテスト済み、HTTP境界の挙動は Task 14 の E2E で担保）。

- [ ] **Step 4: Commit**

```bash
cd outputs/clients/minpaku-cleaning
git add app/src/app/api/admin/requests
git commit -m "feat: 管理者 依頼 API ルート（CRUD・割当・確認・キャンセル）"
```

---

## Task 9: スタッフ API ルート（承認/開始/報告/写真/備品）

スタッフのトークンURL操作の HTTP 境界。スタッフは Supabase Auth セッションを持たないため、トークンをリクエストボディ（写真アップロードは multipart のフィールド）で受け取り `resolveActorByToken` で解決する。role が staff でなければ 401。

**Files:**
- Create: `src/app/api/staff/requests/[id]/route.ts`
- Create: `src/app/api/staff/photos/route.ts`
- Create: `src/app/api/staff/supplies/route.ts`

- [ ] **Step 1: 依頼操作（承認/開始/完了報告）のルートを実装**

`src/app/api/staff/requests/[id]/route.ts`:
```typescript
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { resolveActorByToken } from "@/lib/auth";
import {
  claimRequest,
  startRequest,
  RequestAlreadyClaimedError,
} from "@/lib/db/requests";
import { submitReport } from "@/lib/db/reports";
import { InvalidTransitionError } from "@/lib/status-machine";

// PATCH: ステータス操作（claim / start）
const patchSchema = z.object({
  token: z.string().min(1),
  action: z.enum(["claim", "start"]),
});

// POST: 完了報告の提出
const reportSchema = z.object({
  token: z.string().min(1),
  checklistResult: z.array(
    z.object({
      label: z.string(),
      checked: z.boolean(),
      note: z.string().optional(),
    }),
  ),
  photoPaths: z.array(z.string()).default([]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const actor = await resolveActorByToken(parsed.data.token);
  if (!actor || actor.role !== "staff")
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    if (parsed.data.action === "claim") {
      await claimRequest(actor, id);
    } else {
      await startRequest(actor, id);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    // 早い者勝ち負け・状態機械違反は 409（競合）
    if (
      e instanceof RequestAlreadyClaimedError ||
      e instanceof InvalidTransitionError
    )
      return NextResponse.json({ error: e.message }, { status: 409 });
    if (e instanceof Error)
      return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const parsed = reportSchema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const actor = await resolveActorByToken(parsed.data.token);
  if (!actor || actor.role !== "staff")
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const report = await submitReport(
      actor,
      id,
      parsed.data.checklistResult,
      parsed.data.photoPaths,
    );
    return NextResponse.json(report);
  } catch (e) {
    if (e instanceof Error)
      return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
```

- [ ] **Step 2: 写真アップロードのルートを実装**

`src/app/api/staff/photos/route.ts`:
```typescript
import { NextResponse, type NextRequest } from "next/server";
import { resolveActorByToken } from "@/lib/auth";
import { uploadReportPhoto } from "@/lib/storage";

// multipart/form-data: token / requestId / file（画像）。
// アップロード成功で { storagePath } を返す。完了報告の photoPaths にこの値を載せる。
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const token = form.get("token");
  const requestId = form.get("requestId");
  const file = form.get("file");
  if (typeof token !== "string" || typeof requestId !== "string")
    return NextResponse.json({ error: "token と requestId は必須です" }, { status: 400 });
  if (!(file instanceof File))
    return NextResponse.json({ error: "file は必須です" }, { status: 400 });
  const actor = await resolveActorByToken(token);
  if (!actor || actor.role !== "staff")
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const contentType =
    file.type === "image/png" ? "image/png" : "image/jpeg";
  try {
    const storagePath = await uploadReportPhoto(
      requestId,
      await file.arrayBuffer(),
      contentType,
    );
    return NextResponse.json({ storagePath });
  } catch (e) {
    if (e instanceof Error)
      return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
```

- [ ] **Step 3: 備品補充依頼のルートを実装**

`src/app/api/staff/supplies/route.ts`:
```typescript
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { resolveActorByToken } from "@/lib/auth";
import { createSupplyRequest } from "@/lib/db/supplies";

const schema = z.object({
  token: z.string().min(1),
  property_id: z.string().uuid(),
  request_id: z.string().uuid().optional(),
  items: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { token, ...input } = parsed.data;
  const actor = await resolveActorByToken(token);
  if (!actor || actor.role !== "staff")
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await createSupplyRequest(actor, input));
  } catch (e) {
    if (e instanceof Error)
      return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
```

- [ ] **Step 4: ビルドが通ることを確認**

Run: `npm run build`
Expected: ビルド成功。ルート表に `/api/staff/requests/[id]`・`/api/staff/photos`・`/api/staff/supplies` が出る。

- [ ] **Step 5: Commit**

```bash
cd outputs/clients/minpaku-cleaning
git add app/src/app/api/staff
git commit -m "feat: スタッフ API ルート（承認/開始/完了報告/写真/備品補充）"
```

---

## Task 10: 管理者 依頼一覧画面

`/admin/requests` — 依頼の作成フォームと一覧。管理者ナビに「依頼」「備品」リンクを追加する。

**Files:**
- Modify: `src/app/admin/layout.tsx`
- Create: `src/app/admin/requests/page.tsx`
- Create: `src/app/admin/requests/RequestForm.tsx`
- Create: `src/app/admin/supplies/page.tsx`

- [ ] **Step 1: 管理者レイアウトのナビにリンクを追加**

`src/app/admin/layout.tsx` の `<nav>` 内、既存の4リンクを以下6リンクに差し替える（`<nav>` 要素の中身のみ変更、他は変えない）:
```tsx
      <nav className="border-b px-4 py-3 flex gap-4 text-sm">
        <Link href="/admin">ダッシュボード</Link>
        <Link href="/admin/requests">依頼</Link>
        <Link href="/admin/properties">物件</Link>
        <Link href="/admin/owners">オーナー</Link>
        <Link href="/admin/staff">スタッフ</Link>
        <Link href="/admin/supplies">備品</Link>
      </nav>
```

- [ ] **Step 2: 依頼作成フォームコンポーネントを実装**

`src/app/admin/requests/RequestForm.tsx`:
```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Property = { id: string; name: string };

export function RequestForm({ properties }: { properties: Property[] }) {
  const router = useRouter();
  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? "");
  const [checkin, setCheckin] = useState("");
  const [checkout, setCheckout] = useState("");
  const [guestCount, setGuestCount] = useState(1);
  const [memo, setMemo] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/admin/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        property_id: propertyId,
        checkin_date: checkin,
        checkout_date: checkout,
        guest_count: guestCount,
        option_memo: memo || undefined,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(
        typeof body?.error === "string" ? body.error : "登録に失敗しました",
      );
      return;
    }
    setCheckin("");
    setCheckout("");
    setGuestCount(1);
    setMemo("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-2 border rounded p-3">
      <select
        value={propertyId}
        onChange={(e) => setPropertyId(e.target.value)}
        className="w-full border rounded px-2 py-1"
      >
        {properties.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <label className="flex-1 text-sm">
          チェックイン
          <input
            type="date"
            value={checkin}
            onChange={(e) => setCheckin(e.target.value)}
            required
            className="w-full border rounded px-2 py-1"
          />
        </label>
        <label className="flex-1 text-sm">
          チェックアウト
          <input
            type="date"
            value={checkout}
            onChange={(e) => setCheckout(e.target.value)}
            required
            className="w-full border rounded px-2 py-1"
          />
        </label>
      </div>
      <label className="block text-sm">
        人数
        <input
          type="number"
          min={1}
          value={guestCount}
          onChange={(e) => setGuestCount(Number(e.target.value))}
          required
          className="w-full border rounded px-2 py-1"
        />
      </label>
      <input
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        placeholder="オプションメモ（任意）"
        className="w-full border rounded px-2 py-1"
      />
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button
        type="submit"
        className="bg-black text-white rounded px-3 py-1 text-sm"
      >
        依頼を作成
      </button>
    </form>
  );
}
```

- [ ] **Step 3: 依頼一覧画面を実装**

`src/app/admin/requests/page.tsx`:
```tsx
import { resolveAdminActor } from "@/lib/supabase-auth";
import { listRequests } from "@/lib/db/requests";
import { listProperties } from "@/lib/db/properties";
import { redirect } from "next/navigation";
import Link from "next/link";
import { RequestForm } from "./RequestForm";

const STATUS_LABEL: Record<string, string> = {
  unassigned: "未割当",
  assigned: "割当済み",
  in_progress: "清掃中",
  reported: "報告済み",
  confirmed: "確認済み",
  cancelled: "キャンセル",
};

export default async function RequestsPage() {
  const actor = await resolveAdminActor();
  if (!actor) redirect("/admin/login");
  const [requests, properties] = await Promise.all([
    listRequests(actor),
    listProperties(actor),
  ]);
  const nameById = new Map(properties.map((p) => [p.id, p.name]));
  return (
    <main className="space-y-4 max-w-3xl">
      <h1 className="text-xl font-bold">清掃依頼</h1>
      {properties.length === 0 ? (
        <p className="text-sm text-gray-500">先に物件を登録してください。</p>
      ) : (
        <RequestForm properties={properties} />
      )}
      <ul className="divide-y border rounded">
        {requests.map((r) => (
          <li key={r.id} className="px-3 py-2 text-sm flex justify-between">
            <Link href={`/admin/requests/${r.id}`} className="underline">
              {nameById.get(r.property_id) ?? "?"} / {r.checkin_date}〜
              {r.checkout_date}
            </Link>
            <span className="text-gray-500">
              {STATUS_LABEL[r.status] ?? r.status}
            </span>
          </li>
        ))}
        {requests.length === 0 && (
          <li className="px-3 py-2 text-sm text-gray-500">依頼はまだありません。</li>
        )}
      </ul>
    </main>
  );
}
```

- [ ] **Step 4: 備品補充依頼一覧画面を実装**

`src/app/admin/supplies/page.tsx`:
```tsx
import { resolveAdminActor } from "@/lib/supabase-auth";
import { listSupplyRequests } from "@/lib/db/supplies";
import { listProperties } from "@/lib/db/properties";
import { redirect } from "next/navigation";

export default async function SuppliesPage() {
  const actor = await resolveAdminActor();
  if (!actor) redirect("/admin/login");
  const [supplies, properties] = await Promise.all([
    listSupplyRequests(actor),
    listProperties(actor),
  ]);
  const nameById = new Map(properties.map((p) => [p.id, p.name]));
  return (
    <main className="space-y-4 max-w-2xl">
      <h1 className="text-xl font-bold">備品補充依頼</h1>
      <ul className="divide-y border rounded">
        {supplies.map((s) => (
          <li key={s.id} className="px-3 py-2 text-sm space-y-1">
            <div className="text-gray-500">
              {nameById.get(s.property_id) ?? "?"} —{" "}
              {new Date(s.created_at).toLocaleDateString("ja-JP")}
            </div>
            <div>{s.items}</div>
          </li>
        ))}
        {supplies.length === 0 && (
          <li className="px-3 py-2 text-sm text-gray-500">
            備品補充依頼はまだありません。
          </li>
        )}
      </ul>
    </main>
  );
}
```

- [ ] **Step 5: ビルドが通ることを確認**

Run: `npm run build`
Expected: ビルド成功。`/admin/requests`・`/admin/supplies` がルート表に出る。

- [ ] **Step 6: Commit**

```bash
cd outputs/clients/minpaku-cleaning
git add app/src/app/admin/layout.tsx app/src/app/admin/requests/page.tsx app/src/app/admin/requests/RequestForm.tsx app/src/app/admin/supplies/page.tsx
git commit -m "feat: 管理者 依頼一覧・備品補充一覧画面"
```

---

## Task 11: 管理者 依頼詳細画面

`/admin/requests/[id]` — 依頼の詳細、スタッフ割当、完了報告の閲覧（チェックリスト・写真）、「内容確認済み」操作、キャンセル操作。

**Files:**
- Create: `src/app/admin/requests/[id]/page.tsx`
- Create: `src/app/admin/requests/[id]/RequestActions.tsx`

- [ ] **Step 1: 操作コンポーネントを実装**

`src/app/admin/requests/[id]/RequestActions.tsx`:
```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Staff = { id: string; name: string };

type Props = {
  requestId: string;
  status: string;
  assignedStaffId: string | null;
  staff: Staff[];
};

export function RequestActions({
  requestId,
  status,
  assignedStaffId,
  staff,
}: Props) {
  const router = useRouter();
  const [staffId, setStaffId] = useState(assignedStaffId ?? staff[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/requests/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!res.ok) {
      const b = await res.json().catch(() => null);
      setError(typeof b?.error === "string" ? b.error : "操作に失敗しました");
      return;
    }
    router.refresh();
  }

  const canAssign = status === "unassigned" || status === "assigned";
  const canConfirm = status === "reported";
  const canCancel = status !== "confirmed" && status !== "cancelled";

  return (
    <div className="space-y-2 border rounded p-3">
      {canAssign && (
        <div className="flex items-center gap-2">
          <select
            value={staffId}
            onChange={(e) => setStaffId(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          >
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => patch({ action: "assign", staffId })}
            disabled={busy || !staffId}
            className="text-sm underline disabled:opacity-50"
          >
            スタッフを割り当て
          </button>
        </div>
      )}
      {canConfirm && (
        <button
          onClick={() => patch({ action: "confirm" })}
          disabled={busy}
          className="bg-black text-white rounded px-3 py-1 text-sm disabled:opacity-50"
        >
          内容を確認済みにする
        </button>
      )}
      {canCancel && (
        <button
          onClick={() => patch({ action: "cancel" })}
          disabled={busy}
          className="text-sm underline text-red-600 disabled:opacity-50"
        >
          この依頼をキャンセル
        </button>
      )}
      {error && <p className="text-red-600 text-sm">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: 依頼詳細画面を実装**

`src/app/admin/requests/[id]/page.tsx`:
```tsx
import { resolveAdminActor } from "@/lib/supabase-auth";
import { getRequest } from "@/lib/db/requests";
import { getReportForRequest } from "@/lib/db/reports";
import { listProperties } from "@/lib/db/properties";
import { listStaff } from "@/lib/db/staff";
import { getPhotoSignedUrl } from "@/lib/storage";
import { redirect, notFound } from "next/navigation";
import { RequestActions } from "./RequestActions";

const STATUS_LABEL: Record<string, string> = {
  unassigned: "未割当",
  assigned: "割当済み",
  in_progress: "清掃中",
  reported: "報告済み",
  confirmed: "確認済み",
  cancelled: "キャンセル",
};

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await resolveAdminActor();
  if (!actor) redirect("/admin/login");
  const { id } = await params;
  const request = await getRequest(actor, id);
  if (!request) notFound();

  const [properties, staff] = await Promise.all([
    listProperties(actor),
    listStaff(actor),
  ]);
  const propertyName =
    properties.find((p) => p.id === request.property_id)?.name ?? "?";
  const staffName =
    staff.find((s) => s.id === request.assigned_staff_id)?.name ?? null;

  // reported / confirmed なら完了報告と写真を取得し、写真は署名URLにする
  const reportData =
    request.status === "reported" || request.status === "confirmed"
      ? await getReportForRequest(actor, id)
      : null;
  const photoUrls = reportData
    ? await Promise.all(
        reportData.photos.map((p) => getPhotoSignedUrl(p.storage_path)),
      )
    : [];

  return (
    <main className="space-y-4 max-w-2xl">
      <h1 className="text-xl font-bold">
        {propertyName} / {request.checkin_date}〜{request.checkout_date}
      </h1>
      <dl className="text-sm space-y-1 border rounded p-3">
        <div>ステータス: {STATUS_LABEL[request.status] ?? request.status}</div>
        <div>人数: {request.guest_count}名</div>
        <div>担当スタッフ: {staffName ?? "未割当"}</div>
        {request.option_memo && <div>メモ: {request.option_memo}</div>}
      </dl>

      <RequestActions
        requestId={request.id}
        status={request.status}
        assignedStaffId={request.assigned_staff_id}
        staff={staff}
      />

      {reportData && (
        <section className="space-y-2 border rounded p-3">
          <h2 className="font-bold text-sm">完了報告</h2>
          <ul className="text-sm space-y-1">
            {reportData.report.checklist_result.map((item, i) => (
              <li key={i}>
                {item.checked ? "☑" : "☐"} {item.label}
                {item.note ? ` — ${item.note}` : ""}
              </li>
            ))}
          </ul>
          {photoUrls.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {photoUrls.map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={url}
                  alt={`完了写真 ${i + 1}`}
                  className="w-32 h-32 object-cover rounded border"
                />
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
```

- [ ] **Step 3: ビルドが通ることを確認**

Run: `npm run build`
Expected: ビルド成功。`/admin/requests/[id]` がルート表に出る。

- [ ] **Step 4: Commit**

```bash
cd outputs/clients/minpaku-cleaning
git add app/src/app/admin/requests/[id]
git commit -m "feat: 管理者 依頼詳細画面（割当・完了報告閲覧・確認・キャンセル）"
```

---

## Task 12: スタッフ トークン画面 — レイアウト・依頼一覧・無効トークン

`/staff/[token]` — トークンURLでアクセスするスタッフ画面。レイアウトでトークンを検証し、無効・revoke 済みなら専用エラー表示（設計書 9章）。有効なら担当依頼一覧を表示し、未割当依頼は承認できる。

**Files:**
- Create: `src/app/staff/[token]/layout.tsx`
- Create: `src/app/staff/[token]/page.tsx`
- Create: `src/app/staff/[token]/RequestList.tsx`

- [ ] **Step 1: スタッフ認証ガードのレイアウトを実装**

`src/app/staff/[token]/layout.tsx`:
```tsx
import { resolveActorByToken } from "@/lib/auth";

export default async function StaffLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const actor = await resolveActorByToken(token);
  // 無効・revoke 済み・スタッフ以外のトークンは専用エラー表示
  if (!actor || actor.role !== "staff") {
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
        <span className="text-sm font-bold">清掃スタッフ画面</span>
      </header>
      <div className="p-4">{children}</div>
    </div>
  );
}
```

- [ ] **Step 2: 依頼一覧のクライアントコンポーネントを実装**

`src/app/staff/[token]/RequestList.tsx`:
```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Request = {
  id: string;
  property_name: string;
  checkin_date: string;
  checkout_date: string;
  status: string;
  assigned_staff_id: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  unassigned: "未割当",
  assigned: "割当済み",
  in_progress: "清掃中",
  reported: "報告済み",
  confirmed: "確認済み",
  cancelled: "キャンセル",
};

export function RequestList({
  token,
  requests,
}: {
  token: string;
  requests: Request[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function claim(id: string) {
    setBusyId(id);
    setError(null);
    const res = await fetch(`/api/staff/requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, action: "claim" }),
    });
    setBusyId(null);
    if (!res.ok) {
      const b = await res.json().catch(() => null);
      setError(typeof b?.error === "string" ? b.error : "承認に失敗しました");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <ul className="divide-y border rounded">
        {requests.map((r) => (
          <li key={r.id} className="px-3 py-2 text-sm space-y-1">
            <div className="flex justify-between">
              <Link
                href={`/staff/${token}/requests/${r.id}`}
                className="underline"
              >
                {r.property_name} / {r.checkin_date}〜{r.checkout_date}
              </Link>
              <span className="text-gray-500">
                {STATUS_LABEL[r.status] ?? r.status}
              </span>
            </div>
            {r.status === "unassigned" && (
              <button
                onClick={() => claim(r.id)}
                disabled={busyId === r.id}
                className="bg-black text-white rounded px-3 py-1 text-xs disabled:opacity-50"
              >
                この依頼を承認する
              </button>
            )}
          </li>
        ))}
        {requests.length === 0 && (
          <li className="px-3 py-2 text-sm text-gray-500">
            担当の依頼はありません。
          </li>
        )}
      </ul>
    </div>
  );
}
```

- [ ] **Step 3: 依頼一覧ページを実装**

`src/app/staff/[token]/page.tsx`:
```tsx
import { resolveActorByToken } from "@/lib/auth";
import { listRequestsForStaff } from "@/lib/db/requests";
import { RequestList } from "./RequestList";

export default async function StaffRequestsPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  // layout でトークン検証済み。ここでは staff actor 前提で再解決する。
  const actor = await resolveActorByToken(token);
  // layout がガード済みなので actor は staff だが、型のため null チェック
  if (!actor || actor.role !== "staff") return null;
  const requests = await listRequestsForStaff(actor);
  return (
    <main className="space-y-4 max-w-2xl">
      <h1 className="text-xl font-bold">担当の清掃依頼</h1>
      <RequestList token={token} requests={requests} />
    </main>
  );
}
```

- [ ] **Step 4: ビルドが通ることを確認**

Run: `npm run build`
Expected: ビルド成功。`/staff/[token]` がルート表に出る。

- [ ] **Step 5: Commit**

```bash
cd outputs/clients/minpaku-cleaning
git add app/src/app/staff/[token]/layout.tsx app/src/app/staff/[token]/page.tsx app/src/app/staff/[token]/RequestList.tsx
git commit -m "feat: スタッフ トークン画面（レイアウト・依頼一覧・無効トークン表示）"
```

---

## Task 13: スタッフ 依頼詳細画面（承認/開始/チェックリスト/写真/備品）

`/staff/[token]/requests/[id]` — 依頼詳細。割当済みなら「開始」、清掃中ならチェックリスト記入・写真アップロード・完了報告提出、備品補充依頼。

**Files:**
- Create: `src/app/staff/[token]/requests/[id]/page.tsx`
- Create: `src/app/staff/[token]/requests/[id]/StaffRequestPanel.tsx`

- [ ] **Step 1: スタッフ操作パネルのクライアントコンポーネントを実装**

`src/app/staff/[token]/requests/[id]/StaffRequestPanel.tsx`:
```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type ChecklistTemplateItem = { label: string; type?: string };

type Props = {
  token: string;
  requestId: string;
  propertyId: string;
  status: string;
  checklistTemplate: ChecklistTemplateItem[];
};

export function StaffRequestPanel({
  token,
  requestId,
  propertyId,
  status,
  checklistTemplate,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // チェックリスト記入状態
  const [checks, setChecks] = useState<boolean[]>(
    checklistTemplate.map(() => false),
  );
  // アップロード済み写真の保存パス
  const [photoPaths, setPhotoPaths] = useState<string[]>([]);
  const [supplyItems, setSupplyItems] = useState("");
  const [supplyDone, setSupplyDone] = useState(false);

  async function start() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/staff/requests/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, action: "start" }),
    });
    setBusy(false);
    if (!res.ok) {
      const b = await res.json().catch(() => null);
      setError(typeof b?.error === "string" ? b.error : "開始に失敗しました");
      return;
    }
    router.refresh();
  }

  async function uploadPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.set("token", token);
    form.set("requestId", requestId);
    form.set("file", file);
    const res = await fetch("/api/staff/photos", { method: "POST", body: form });
    setBusy(false);
    e.target.value = "";
    if (!res.ok) {
      const b = await res.json().catch(() => null);
      setError(
        typeof b?.error === "string" ? b.error : "写真アップロードに失敗しました",
      );
      return;
    }
    const { storagePath } = await res.json();
    setPhotoPaths((prev) => [...prev, storagePath]);
  }

  async function submitReport() {
    setBusy(true);
    setError(null);
    const checklistResult = checklistTemplate.map((item, i) => ({
      label: item.label,
      checked: checks[i],
    }));
    const res = await fetch(`/api/staff/requests/${requestId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, checklistResult, photoPaths }),
    });
    setBusy(false);
    if (!res.ok) {
      const b = await res.json().catch(() => null);
      setError(typeof b?.error === "string" ? b.error : "提出に失敗しました");
      return;
    }
    router.refresh();
  }

  async function submitSupply() {
    if (!supplyItems.trim()) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/staff/supplies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        property_id: propertyId,
        request_id: requestId,
        items: supplyItems,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const b = await res.json().catch(() => null);
      setError(typeof b?.error === "string" ? b.error : "送信に失敗しました");
      return;
    }
    setSupplyItems("");
    setSupplyDone(true);
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-red-600 text-sm">{error}</p>}

      {status === "assigned" && (
        <button
          onClick={start}
          disabled={busy}
          className="bg-black text-white rounded px-3 py-1 text-sm disabled:opacity-50"
        >
          清掃を開始する
        </button>
      )}

      {status === "in_progress" && (
        <section className="space-y-3 border rounded p-3">
          <h2 className="font-bold text-sm">チェックリスト</h2>
          <ul className="space-y-1">
            {checklistTemplate.map((item, i) => (
              <li key={i}>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={checks[i]}
                    onChange={() =>
                      setChecks((prev) =>
                        prev.map((c, j) => (j === i ? !c : c)),
                      )
                    }
                  />
                  {item.label}
                </label>
              </li>
            ))}
            {checklistTemplate.length === 0 && (
              <li className="text-sm text-gray-500">
                チェックリストは設定されていません。
              </li>
            )}
          </ul>
          <div className="space-y-1">
            <label className="block text-sm">
              完了写真を追加
              <input
                type="file"
                accept="image/*"
                onChange={uploadPhoto}
                disabled={busy}
                className="block text-sm"
              />
            </label>
            <p className="text-xs text-gray-500">
              アップロード済み: {photoPaths.length}枚
            </p>
          </div>
          <button
            onClick={submitReport}
            disabled={busy}
            className="bg-black text-white rounded px-3 py-1 text-sm disabled:opacity-50"
          >
            完了報告を提出する
          </button>
        </section>
      )}

      <section className="space-y-2 border rounded p-3">
        <h2 className="font-bold text-sm">備品補充依頼</h2>
        {supplyDone && (
          <p className="text-sm text-green-700">送信しました。</p>
        )}
        <textarea
          value={supplyItems}
          onChange={(e) => setSupplyItems(e.target.value)}
          placeholder="不足している備品（例: トイレットペーパー 6ロール）"
          className="w-full border rounded px-2 py-1 text-sm"
          rows={2}
        />
        <button
          onClick={submitSupply}
          disabled={busy || !supplyItems.trim()}
          className="text-sm underline disabled:opacity-50"
        >
          備品補充を依頼する
        </button>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: スタッフ依頼詳細ページを実装**

`src/app/staff/[token]/requests/[id]/page.tsx`:
```tsx
import { resolveActorByToken } from "@/lib/auth";
import { getRequestForStaff } from "@/lib/db/requests";
import { notFound } from "next/navigation";
import { StaffRequestPanel } from "./StaffRequestPanel";

const STATUS_LABEL: Record<string, string> = {
  unassigned: "未割当",
  assigned: "割当済み",
  in_progress: "清掃中",
  reported: "報告済み",
  confirmed: "確認済み",
  cancelled: "キャンセル",
};

export default async function StaffRequestDetailPage({
  params,
}: {
  params: Promise<{ token: string; id: string }>;
}) {
  const { token, id } = await params;
  const actor = await resolveActorByToken(token);
  if (!actor || actor.role !== "staff") return null; // layout がガード済み
  const request = await getRequestForStaff(actor, id);
  if (!request) notFound();

  const checklistTemplate = (request.property.checklist_template ??
    []) as { label: string; type?: string }[];

  return (
    <main className="space-y-4 max-w-2xl">
      <h1 className="text-xl font-bold">
        {request.property.name} / {request.checkin_date}〜
        {request.checkout_date}
      </h1>
      <dl className="text-sm space-y-1 border rounded p-3">
        <div>
          ステータス: {STATUS_LABEL[request.status] ?? request.status}
        </div>
        <div>人数: {request.guest_count}名</div>
        {request.option_memo && <div>メモ: {request.option_memo}</div>}
      </dl>
      <StaffRequestPanel
        token={token}
        requestId={request.id}
        propertyId={request.property_id}
        status={request.status}
        checklistTemplate={checklistTemplate}
      />
    </main>
  );
}
```

- [ ] **Step 3: ビルドとテストが通ることを確認**

Run: `npm run build && npm test`
Expected: ビルド成功、全テスト PASS（Plan 1 の25件 + Plan 2 の追加分）。

- [ ] **Step 4: Commit**

```bash
cd outputs/clients/minpaku-cleaning
git add app/src/app/staff/[token]/requests
git commit -m "feat: スタッフ 依頼詳細画面（開始・チェックリスト・写真・備品補充）"
```

---

## Task 14: E2E 主要フロー（Playwright）

設計書 9章のテスト方針 #5「E2E 主要フロー1本（依頼作成→承認→開始→提出→確認）」。前提データ（管理者・オーナー・物件・スタッフ・スタッフトークン・担当割当）は service client で投入し、依頼作成以降の主要フローをブラウザで通す。

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/request-flow.spec.ts`
- Modify: `package.json`（`test:e2e` スクリプト追加）

- [ ] **Step 1: Playwright をインストール**

```bash
cd outputs/clients/minpaku-cleaning/app
npm install -D @playwright/test
npx playwright install chromium
```

- [ ] **Step 2: package.json に E2E スクリプトを追加**

`package.json` の `"scripts"` に追記:
```json
"test:e2e": "playwright test"
```

- [ ] **Step 3: playwright.config.ts を作成**

`playwright.config.ts`:
```typescript
import { defineConfig } from "@playwright/test";
import { config } from "dotenv";

// E2E もローカル Supabase / dev サーバの環境変数を読む
config({ path: ".env.local" });

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://localhost:3100",
  },
  webServer: {
    command: "npm run dev -- --port 3100",
    url: "http://localhost:3100",
    timeout: 120_000,
    reuseExistingServer: false,
  },
});
```

- [ ] **Step 4: E2E スペックを作成**

`e2e/request-flow.spec.ts`:
```typescript
import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";

// service role クライアント（テスト前提データの投入用）
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const ADMIN_EMAIL = "e2e-admin@example.com";
const ADMIN_PASSWORD = "e2e-password-123";

// 翌日以降の YYYY-MM-DD
function dateStr(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

test("依頼作成→承認→開始→完了報告→確認の主要フロー", async ({ page }) => {
  // ---- 前提データを投入 ----
  // 既存の E2E データを掃除（FK順）
  await db.from("report_photos").delete().not("id", "is", null);
  await db.from("cleaning_reports").delete().not("id", "is", null);
  await db.from("supply_requests").delete().not("id", "is", null);
  await db.from("cleaning_requests").delete().not("id", "is", null);
  await db.from("access_tokens").delete().not("id", "is", null);
  await db.from("staff_assignments").delete().not("staff_id", "is", null);
  await db.from("staff").delete().not("id", "is", null);
  await db.from("properties").delete().not("id", "is", null);
  await db.from("owners").delete().not("id", "is", null);

  // 管理者（auth.users + admins）。既存があれば使い回す。
  const { data: existing } = await db
    .from("admins")
    .select("id")
    .eq("email", ADMIN_EMAIL)
    .maybeSingle();
  if (!existing) {
    const { data: created, error } = await db.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
    });
    if (error) throw error;
    await db
      .from("admins")
      .insert({ id: created.user!.id, email: ADMIN_EMAIL, name: "E2E管理者" });
  }

  // オーナー・物件（チェックリストテンプレ付き）・スタッフ・担当割当・スタッフトークン
  const { data: owner } = await db
    .from("owners")
    .insert({ name: "E2Eオーナー" })
    .select()
    .single();
  const { data: property } = await db
    .from("properties")
    .insert({
      owner_id: owner!.id,
      name: "E2E物件",
      checklist_template: [{ label: "浴室清掃" }, { label: "ベッドメイク" }],
    })
    .select()
    .single();
  const { data: staff } = await db
    .from("staff")
    .insert({ name: "E2Eスタッフ" })
    .select()
    .single();
  await db
    .from("staff_assignments")
    .insert({ staff_id: staff!.id, property_id: property!.id });
  const staffToken = randomBytes(32).toString("base64url");
  await db
    .from("access_tokens")
    .insert({ token: staffToken, type: "staff", staff_id: staff!.id });

  // ---- 管理者ログイン ----
  await page.goto("/admin/login");
  await page.fill('input[name="email"]', ADMIN_EMAIL);
  await page.fill('input[name="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/admin");

  // ---- 依頼を作成 ----
  await page.goto("/admin/requests");
  await page.selectOption("select", { label: "E2E物件" });
  await page.fill('input[type="date"] >> nth=0', dateStr(3));
  await page.fill('input[type="date"] >> nth=1', dateStr(5));
  await page.fill('input[type="number"]', "2");
  await page.click('button:has-text("依頼を作成")');
  await expect(page.locator("li", { hasText: "E2E物件" })).toBeVisible();

  // ---- スタッフがトークンURLで承認 ----
  await page.goto(`/staff/${staffToken}`);
  await expect(page.locator("h1", { hasText: "担当の清掃依頼" })).toBeVisible();
  await page.click('button:has-text("この依頼を承認する")');
  await expect(page.locator("li", { hasText: "割当済み" })).toBeVisible();

  // ---- スタッフが詳細を開いて開始→完了報告 ----
  await page.click('a:has-text("E2E物件")');
  await page.click('button:has-text("清掃を開始する")');
  await expect(
    page.locator("text=チェックリスト").first(),
  ).toBeVisible();
  await page.check('input[type="checkbox"] >> nth=0');
  await page.check('input[type="checkbox"] >> nth=1');
  await page.click('button:has-text("完了報告を提出する")');
  await expect(page.locator("text=報告済み")).toBeVisible();

  // ---- 管理者が依頼詳細で確認 ----
  await page.goto("/admin/requests");
  await page.click('a:has-text("E2E物件")');
  await expect(page.locator("text=完了報告")).toBeVisible();
  await page.click('button:has-text("内容を確認済みにする")');
  await expect(page.locator("text=確認済み")).toBeVisible();
});
```

- [ ] **Step 5: E2E を実行**

ローカル Supabase が起動している前提。

Run: `npm run test:e2e`
Expected: 1 passed（webServer が dev サーバを 3100 で起動し、フロー全体が通る）

> 注: E2E が安定しない場合（タイミング・セレクタ）、`expect(...).toBeVisible()` の前に `page.waitForLoadState("networkidle")` を挟む、セレクタを `data-testid` ベースに変える等で調整する。ただしテストの意図（依頼作成→承認→開始→提出→確認が一気通貫で動く）は変えないこと。

- [ ] **Step 6: .gitignore に Playwright 生成物を追加**

`.gitignore` に以下がなければ追記:
```
/test-results/
/playwright-report/
/playwright/.cache/
```

- [ ] **Step 7: Commit**

```bash
cd outputs/clients/minpaku-cleaning
git add app/playwright.config.ts app/e2e/request-flow.spec.ts app/package.json app/package-lock.json app/.gitignore
git commit -m "feat: E2E 主要フロー（依頼作成→承認→開始→提出→確認）"
```

---

## 完了条件（Plan 2）

- [ ] migration 0002（cancelled 追加・整合性制約・索引）・0003（cleaning_reports unique）・0004（Storage バケット）が `supabase db reset` で適用できる
- [ ] 管理者が依頼を作成・編集・キャンセルでき、スタッフを手動割当・完了報告を確認できる
- [ ] スタッフがトークンURLから担当依頼を承認（早い者勝ち排他）・開始・チェックリスト/写真付き完了報告・備品補充依頼ができる
- [ ] 無効/revoke 済みトークンで `/staff/[token]` にアクセスすると専用エラーが表示される
- [ ] ステータス遷移が状態機械で検証され、不正遷移・二重承認が拒否される
- [ ] `npm test` が全 PASS（status-machine / requests / reports / storage / supplies のユニット・DBバックテスト）、`npm run build` が成功する
- [ ] `npm run test:e2e` の主要フロー1本が PASS する

## Plan 2 持ち越し・Plan 3 への申し送り

- 通知（LINE/Resend）の発火点は本計画で `// TODO(Plan 3): 通知` コメントを残した（`createRequest` / `submitReport` / `confirmRequest` / `createSupplyRequest`）。Plan 3 で `notifications_log` への記録＋冪等性チェック付きで実装する。
- `notifications_log` の索引・status enum 化（Plan 1 持ち越し）は通知実装と同時に Plan 3 の migration で追加する。
- 写真の期限切れ自動削除（`report_photos.expires_at` / Storage）は `storage.ts` の `deletePhoto` を使い Plan 3 の Vercel Cron で実装する。
- カレンダービュー・物件オーナー閲覧画面（`/property/[token]`）・管理者管理画面（`/admin/admins`）は Plan 3。
- **割当時の連続予約警告（設計書6章・非ブロッキングのUI警告）**: 「翌日割当時、同物件に連続予約があれば警告表示」は本計画では未実装。状態遷移の正しさには影響しない表示上の親切機能のため、カレンダービューを作る Plan 3 で同物件の予約並びを見せる際に併せて実装する。
- **写真のリサイズ/圧縮（設計書8章）**: 「アップロード時にリサイズ/圧縮（スマホ写真対策）」は本計画では未実装（`uploadReportPhoto` は受領したバイト列をそのまま保存）。`sharp` 等の導入が必要で依存・ビルド設定の検討を要するため、写真関連を仕上げる Plan 3 で対応する。Plan 2 ではアップロード経路が機能することを優先する。

## 次のプラン

- **Plan 3: 通知・カレンダー・オーナービュー・仕上げ** — LINE/メール通知、Vercel Cron（前日リマインド/24h未割当アラート/写真自動削除）、カレンダービュー、物件オーナー閲覧画面、管理者管理画面、migration（notifications_log 索引・status 制約）
