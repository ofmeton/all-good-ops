# 民泊清掃管理アプリ Plan 1: 基盤 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 管理者がログインして物件・オーナー・スタッフを登録し、トークンURLを発行できる基盤を構築する。

**Architecture:** Next.js（App Router）の単一リポジトリ。全DBアクセスを Supabase service role key でサーバー側に閉じ込め、認可は `resolveActor` でアプリ層に一元化する。Plan 1 ではデータモデル全テーブルのマイグレーション、認証・認可基盤、管理者向けの物件/オーナー/スタッフ/トークン管理画面までを作る。清掃依頼フロー（Plan 2）と通知/カレンダー/オーナービュー（Plan 3）は本計画のスコープ外。

**Tech Stack:** Next.js 15（App Router, TypeScript）/ Supabase（Postgres, Auth, CLI でローカル開発）/ Tailwind CSS / Vitest（テスト）

設計書: `outputs/clients/minpaku-cleaning/docs/2026-05-14-design.md`
アプリのルート: `outputs/clients/minpaku-cleaning/app/`（以下、パスはこのディレクトリ基準）

---

## ファイル構成

```
outputs/clients/minpaku-cleaning/app/
  package.json, tsconfig.json, next.config.ts, vitest.config.ts, tailwind.config.ts
  .env.local.example
  supabase/
    config.toml
    migrations/0001_initial_schema.sql
  src/
    lib/
      tokens.ts            トークン生成・検証ユーティリティ
      supabase-server.ts   service role の Supabase クライアント
      auth.ts              resolveActor（管理者/オーナー/スタッフの解決）
      db/
        scope.ts           アクター別スコープ絞り込みヘルパー
        properties.ts      物件のデータアクセス
        owners.ts          オーナーのデータアクセス
        staff.ts           スタッフのデータアクセス
        tokens.ts          access_tokens のデータアクセス
    app/
      admin/
        login/page.tsx     管理者ログイン
        layout.tsx         管理者レイアウト＋認証ガード
        page.tsx           ダッシュボード（Plan 1 では枠だけ）
        properties/page.tsx, properties/PropertyForm.tsx
        owners/page.tsx,    owners/OwnerForm.tsx
        staff/page.tsx,     staff/StaffForm.tsx
      api/
        admin/
          properties/route.ts
          owners/route.ts
          staff/route.ts
          tokens/route.ts
  tests/
    lib/tokens.test.ts
    lib/auth.test.ts
    db/scope.test.ts
    db/properties.test.ts
    db/owners.test.ts
    db/staff.test.ts
    db/tokens.test.ts
```

各ファイルは1責務。`src/lib/db/*` はデータアクセスのみ（認可は呼び出し側が `resolveActor` の結果を渡す）。`src/app/api/*` は HTTP 境界（actor 解決とバリデーション）。画面コンポーネントは表示と入力のみ。

---

## Task 1: プロジェクト scaffold

**Files:**
- Create: `outputs/clients/minpaku-cleaning/app/package.json`
- Create: `outputs/clients/minpaku-cleaning/app/tsconfig.json`
- Create: `outputs/clients/minpaku-cleaning/app/next.config.ts`
- Create: `outputs/clients/minpaku-cleaning/app/vitest.config.ts`
- Create: `outputs/clients/minpaku-cleaning/app/.gitignore`

- [ ] **Step 1: Next.js プロジェクトを作成**

```bash
cd outputs/clients/minpaku-cleaning
npx create-next-app@latest app --typescript --tailwind --app --src-dir --no-import-alias --use-npm --no-eslint --turbopack
```
プロンプトが出たら全てデフォルト（Yes）で進める。

- [ ] **Step 2: 依存パッケージを追加**

```bash
cd outputs/clients/minpaku-cleaning/app
npm install @supabase/supabase-js @supabase/ssr zod
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom dotenv
```

- [ ] **Step 3: vitest.config.ts を作成**

`outputs/clients/minpaku-cleaning/app/vitest.config.ts`:
```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

- [ ] **Step 4: tests/setup.ts を作成**

`outputs/clients/minpaku-cleaning/app/tests/setup.ts`:
```typescript
import "@testing-library/jest-dom/vitest";
import { config } from "dotenv";

// DBを使うテスト（Task 6 以降）が .env.local の Supabase 接続情報を読めるようにする。
config({ path: ".env.local" });
```

- [ ] **Step 5: package.json に test スクリプトを追加**

`package.json` の `"scripts"` に追記:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 6: tsconfig.json のパスエイリアスを確認**

`tsconfig.json` の `compilerOptions.paths` に `"@/*": ["./src/*"]` があることを確認。なければ追加。

- [ ] **Step 7: スモークテストで動作確認**

`outputs/clients/minpaku-cleaning/app/tests/smoke.test.ts`:
```typescript
import { describe, it, expect } from "vitest";

describe("smoke", () => {
  it("runs vitest", () => {
    expect(1 + 1).toBe(2);
  });
});
```

Run: `npm test`
Expected: PASS（1 passed）

- [ ] **Step 8: Commit**

```bash
cd outputs/clients/minpaku-cleaning
git add app/package.json app/package-lock.json app/tsconfig.json app/next.config.ts app/vitest.config.ts app/.gitignore app/tests/setup.ts app/tests/smoke.test.ts app/src app/public app/postcss.config.mjs app/next-env.d.ts app/README.md app/app 2>/dev/null; git add app
git commit -m "chore: 民泊清掃アプリ scaffold（Next.js + Supabase + Vitest）"
```

---

## Task 2: Supabase ローカル開発環境

**Files:**
- Create: `outputs/clients/minpaku-cleaning/app/supabase/config.toml`（`supabase init` が生成）
- Create: `outputs/clients/minpaku-cleaning/app/.env.local.example`
- Modify: `outputs/clients/minpaku-cleaning/app/.gitignore`

- [ ] **Step 1: Supabase CLI を初期化**

```bash
cd outputs/clients/minpaku-cleaning/app
npx supabase init
```
`supabase/` ディレクトリと `config.toml` が生成される。

- [ ] **Step 2: ローカル Supabase を起動**

```bash
npx supabase start
```
初回は Docker イメージ取得で数分かかる。完了すると `API URL`、`anon key`、`service_role key` が出力される。この出力を控える。

- [ ] **Step 3: .env.local.example を作成**

`outputs/clients/minpaku-cleaning/app/.env.local.example`:
```
# Supabase（supabase start の出力 / 本番は Supabase ダッシュボードの値）
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# トークンURL生成のベースURL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- [ ] **Step 4: .env.local を作成（コミットしない）**

`.env.local.example` をコピーして `.env.local` を作り、Step 2 で控えた値を埋める。

```bash
cp .env.local.example .env.local
```
`SUPABASE_SERVICE_ROLE_KEY` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` に `supabase start` の出力値を貼る。

- [ ] **Step 5: .gitignore に .env.local が含まれることを確認**

`.gitignore` に `.env*.local` があることを確認。create-next-app が生成済みのはずだが、なければ追加。

- [ ] **Step 6: Commit**

```bash
cd outputs/clients/minpaku-cleaning
git add app/supabase/config.toml app/.env.local.example app/.gitignore
git commit -m "chore: Supabase ローカル開発環境を初期化"
```

---

## Task 3: データモデルのマイグレーション

**Files:**
- Create: `outputs/clients/minpaku-cleaning/app/supabase/migrations/0001_initial_schema.sql`

- [ ] **Step 1: マイグレーション SQL を作成**

`outputs/clients/minpaku-cleaning/app/supabase/migrations/0001_initial_schema.sql`:
```sql
-- 民泊清掃管理アプリ 初期スキーマ
-- 認可はアプリ層（resolveActor）で行うため RLS は有効化しない。
-- 全アクセスは service role key 経由のサーバーコードに限定する。

create type cleaning_status as enum (
  'unassigned', 'assigned', 'in_progress', 'reported', 'confirmed'
);
create type token_type as enum ('owner', 'staff');
create type notification_channel as enum ('line', 'email');

-- 管理者（認証情報は Supabase Auth が管理。ここはプロフィール）
create table admins (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text not null,
  role_level int not null default 1,
  created_at timestamptz not null default now()
);

-- 物件オーナー
create table owners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  line_user_id text,
  email text,
  created_at timestamptz not null default now()
);

-- 物件
create table properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references owners(id) on delete restrict,
  name text not null,
  address text,
  access_info_note text,
  checklist_template jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

-- 清掃スタッフ
create table staff (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  line_user_id text,
  email text,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

-- スタッフ↔担当物件（N:N）
create table staff_assignments (
  staff_id uuid not null references staff(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  primary key (staff_id, property_id)
);

-- トークンURL
create table access_tokens (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  type token_type not null,
  property_id uuid references properties(id) on delete cascade,
  staff_id uuid references staff(id) on delete cascade,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint token_target_check check (
    (type = 'owner' and property_id is not null and staff_id is null) or
    (type = 'staff' and staff_id is not null and property_id is null)
  )
);

-- 清掃依頼
create table cleaning_requests (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete restrict,
  checkin_date date not null,
  checkout_date date not null,
  guest_count int not null,
  option_memo text,
  status cleaning_status not null default 'unassigned',
  assigned_staff_id uuid references staff(id) on delete set null,
  assignment_deadline timestamptz,
  created_by uuid references admins(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 完了報告
create table cleaning_reports (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references cleaning_requests(id) on delete cascade,
  staff_id uuid not null references staff(id) on delete restrict,
  checklist_result jsonb not null default '[]'::jsonb,
  submitted_at timestamptz not null default now()
);

-- 完了写真
create table report_photos (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references cleaning_reports(id) on delete cascade,
  storage_path text not null,
  uploaded_at timestamptz not null default now(),
  expires_at timestamptz not null
);

-- 備品補充依頼
create table supply_requests (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  request_id uuid references cleaning_requests(id) on delete set null,
  staff_id uuid not null references staff(id) on delete restrict,
  items text not null,
  created_at timestamptz not null default now()
);

-- 通知送信ログ
create table notifications_log (
  id uuid primary key default gen_random_uuid(),
  channel notification_channel not null,
  recipient text not null,
  kind text not null,
  payload jsonb,
  status text not null,
  sent_at timestamptz not null default now()
);

create index idx_properties_owner on properties(owner_id);
create index idx_requests_property on cleaning_requests(property_id);
create index idx_requests_status on cleaning_requests(status);
create index idx_tokens_token on access_tokens(token);
create index idx_staff_assignments_property on staff_assignments(property_id);
```

- [ ] **Step 2: マイグレーションを適用**

```bash
cd outputs/clients/minpaku-cleaning/app
npx supabase db reset
```
`db reset` はローカルDBを作り直して全マイグレーションを適用する。エラーなく完了することを確認。

- [ ] **Step 3: テーブル作成を確認**

```bash
npx supabase db dump --local --schema public -f /tmp/schema_check.sql && grep -c "create table" /tmp/schema_check.sql
```
Expected: `10`（10テーブル）

- [ ] **Step 4: Commit**

```bash
cd outputs/clients/minpaku-cleaning
git add app/supabase/migrations/0001_initial_schema.sql
git commit -m "feat: データモデル初期スキーマのマイグレーション"
```

---

## Task 4: Supabase サーバークライアント

**Files:**
- Create: `outputs/clients/minpaku-cleaning/app/src/lib/supabase-server.ts`

- [ ] **Step 1: service role クライアントを作成**

`outputs/clients/minpaku-cleaning/app/src/lib/supabase-server.ts`:
```typescript
import "server-only";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を .env.local に設定してください",
  );
}

// service role キー。サーバー専用。クライアントに絶対に渡さない。
export function createServiceClient() {
  return createClient(url!, serviceKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
```

- [ ] **Step 2: server-only パッケージを追加**

```bash
cd outputs/clients/minpaku-cleaning/app
npm install server-only
```

- [ ] **Step 3: Commit**

```bash
cd outputs/clients/minpaku-cleaning
git add app/src/lib/supabase-server.ts app/package.json app/package-lock.json
git commit -m "feat: service role の Supabase サーバークライアント"
```

---

## Task 5: トークン生成・検証ユーティリティ

**Files:**
- Create: `outputs/clients/minpaku-cleaning/app/src/lib/tokens.ts`
- Test: `outputs/clients/minpaku-cleaning/app/tests/lib/tokens.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

`outputs/clients/minpaku-cleaning/app/tests/lib/tokens.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { generateToken } from "@/lib/tokens";

describe("generateToken", () => {
  it("URLセーフな文字だけを含む", () => {
    const token = generateToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("十分な長さがある（32バイト = 43文字以上）", () => {
    expect(generateToken().length).toBeGreaterThanOrEqual(43);
  });

  it("呼ぶたびに異なる値を返す", () => {
    const tokens = new Set(Array.from({ length: 100 }, () => generateToken()));
    expect(tokens.size).toBe(100);
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npm test -- tokens`
Expected: FAIL（`generateToken` が存在しない）

- [ ] **Step 3: 最小実装を書く**

`outputs/clients/minpaku-cleaning/app/src/lib/tokens.ts`:
```typescript
import { randomBytes } from "crypto";

// 推測困難なトークンURL用文字列を生成する（32バイトの base64url）。
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npm test -- tokens`
Expected: PASS（3 passed）

- [ ] **Step 5: Commit**

```bash
cd outputs/clients/minpaku-cleaning
git add app/src/lib/tokens.ts app/tests/lib/tokens.test.ts
git commit -m "feat: トークンURL生成ユーティリティ"
```

---

## Task 6: resolveActor（認可基盤）

「誰からのアクセスか」を解決する。Plan 1 では管理者の解決と、トークン文字列からオーナー/スタッフを解決する関数を作る。Supabase Auth セッションの取り出しは Task 7 のログイン実装と合わせて使う。

**Files:**
- Create: `outputs/clients/minpaku-cleaning/app/src/lib/auth.ts`
- Test: `outputs/clients/minpaku-cleaning/app/tests/lib/auth.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

`outputs/clients/minpaku-cleaning/app/tests/lib/auth.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { resolveActorByToken } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase-server";

const db = createServiceClient();

async function seed() {
  await db.from("access_tokens").delete().neq("token", "");
  await db.from("staff").delete().neq("name", "");
  await db.from("properties").delete().neq("name", "");
  await db.from("owners").delete().neq("name", "");

  const { data: owner } = await db
    .from("owners").insert({ name: "オーナーA" }).select().single();
  const { data: property } = await db
    .from("properties").insert({ owner_id: owner!.id, name: "物件A" }).select().single();
  const { data: staff } = await db
    .from("staff").insert({ name: "スタッフA" }).select().single();

  await db.from("access_tokens").insert([
    { token: "owner-token", type: "owner", property_id: property!.id },
    { token: "staff-token", type: "staff", staff_id: staff!.id },
    { token: "revoked-token", type: "staff", staff_id: staff!.id, revoked_at: new Date().toISOString() },
  ]);
  return { property, staff };
}

describe("resolveActorByToken", () => {
  beforeEach(async () => {
    await seed();
  });

  it("有効なオーナートークンを解決する", async () => {
    const actor = await resolveActorByToken("owner-token");
    expect(actor?.role).toBe("owner");
    expect(actor?.role === "owner" && actor.propertyId).toBeTruthy();
  });

  it("有効なスタッフトークンを解決する", async () => {
    const actor = await resolveActorByToken("staff-token");
    expect(actor?.role).toBe("staff");
    expect(actor?.role === "staff" && actor.staffId).toBeTruthy();
  });

  it("revoke済みトークンは null を返す", async () => {
    expect(await resolveActorByToken("revoked-token")).toBeNull();
  });

  it("存在しないトークンは null を返す", async () => {
    expect(await resolveActorByToken("no-such-token")).toBeNull();
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npm test -- auth`
Expected: FAIL（`resolveActorByToken` が存在しない）

- [ ] **Step 3: 最小実装を書く**

`outputs/clients/minpaku-cleaning/app/src/lib/auth.ts`:
```typescript
import "server-only";
import { createServiceClient } from "@/lib/supabase-server";

export type Actor =
  | { role: "admin"; adminId: string; roleLevel: number }
  | { role: "owner"; ownerId: string; propertyId: string }
  | { role: "staff"; staffId: string };

// トークン文字列からオーナー/スタッフのアクターを解決する。
// revoke済み・存在しないトークンは null。
export async function resolveActorByToken(token: string): Promise<Actor | null> {
  const db = createServiceClient();
  const { data } = await db
    .from("access_tokens")
    .select("type, property_id, staff_id, revoked_at")
    .eq("token", token)
    .maybeSingle();

  if (!data || data.revoked_at) return null;

  if (data.type === "owner" && data.property_id) {
    const { data: property } = await db
      .from("properties")
      .select("owner_id")
      .eq("id", data.property_id)
      .maybeSingle();
    if (!property) return null;
    return { role: "owner", ownerId: property.owner_id, propertyId: data.property_id };
  }

  if (data.type === "staff" && data.staff_id) {
    return { role: "staff", staffId: data.staff_id };
  }

  return null;
}
```

- [ ] **Step 4: テストが通ることを確認**

ローカル Supabase が起動している前提（`npx supabase start`）。`.env.local` は Task 1 の `tests/setup.ts` で読み込み済みなので追加設定は不要。

Run: `npm test -- auth`
Expected: PASS（4 passed）

- [ ] **Step 5: Commit**

```bash
cd outputs/clients/minpaku-cleaning
git add app/src/lib/auth.ts app/tests/lib/auth.test.ts
git commit -m "feat: resolveActorByToken（トークンURLの認可解決）"
```

---

## Task 7: 管理者ログインと認証ガード

**Files:**
- Create: `outputs/clients/minpaku-cleaning/app/src/lib/supabase-auth.ts`
- Create: `outputs/clients/minpaku-cleaning/app/src/app/admin/login/page.tsx`
- Create: `outputs/clients/minpaku-cleaning/app/src/app/admin/login/actions.ts`
- Create: `outputs/clients/minpaku-cleaning/app/src/app/admin/layout.tsx`
- Create: `outputs/clients/minpaku-cleaning/app/src/app/admin/page.tsx`

- [ ] **Step 1: Supabase Auth（cookie ベース）クライアントを作成**

`outputs/clients/minpaku-cleaning/app/src/lib/supabase-auth.ts`:
```typescript
import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase-server";
import type { Actor } from "@/lib/auth";

// 管理者の Supabase Auth セッション用クライアント（cookie 連動）。
export async function createAuthClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) =>
          toSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          ),
      },
    },
  );
}

// 現在ログイン中の管理者を Actor として返す。未ログインなら null。
export async function resolveAdminActor(): Promise<Actor | null> {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return null;

  const db = createServiceClient();
  const { data: admin } = await db
    .from("admins")
    .select("id, role_level")
    .eq("id", user.id)
    .maybeSingle();
  if (!admin) return null;

  return { role: "admin", adminId: admin.id, roleLevel: admin.role_level };
}
```

- [ ] **Step 2: ログインの Server Action を作成**

`outputs/clients/minpaku-cleaning/app/src/app/admin/login/actions.ts`:
```typescript
"use server";
import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase-auth";

export async function login(_prev: string | null, formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const auth = await createAuthClient();
  const { error } = await auth.auth.signInWithPassword({ email, password });
  if (error) return "メールアドレスまたはパスワードが正しくありません";
  redirect("/admin");
}
```

- [ ] **Step 3: ログイン画面を作成**

`outputs/clients/minpaku-cleaning/app/src/app/admin/login/page.tsx`:
```tsx
"use client";
import { useActionState } from "react";
import { login } from "./actions";

export default function LoginPage() {
  const [error, formAction, pending] = useActionState(login, null);
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <form action={formAction} className="w-full max-w-sm space-y-4">
        <h1 className="text-xl font-bold">管理者ログイン</h1>
        <input name="email" type="email" required placeholder="メールアドレス"
          className="w-full border rounded px-3 py-2" />
        <input name="password" type="password" required placeholder="パスワード"
          className="w-full border rounded px-3 py-2" />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button type="submit" disabled={pending}
          className="w-full bg-black text-white rounded py-2 disabled:opacity-50">
          {pending ? "ログイン中..." : "ログイン"}
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 4: 管理者レイアウト（認証ガード）を作成**

`outputs/clients/minpaku-cleaning/app/src/app/admin/layout.tsx`:
```tsx
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { resolveAdminActor } from "@/lib/supabase-auth";
import Link from "next/link";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const path = (await headers()).get("x-pathname") ?? "";
  // ログイン画面自身はガードしない
  if (!path.endsWith("/admin/login")) {
    const actor = await resolveAdminActor();
    if (!actor) redirect("/admin/login");
  }
  return (
    <div className="min-h-screen">
      <nav className="border-b px-4 py-3 flex gap-4 text-sm">
        <Link href="/admin">ダッシュボード</Link>
        <Link href="/admin/properties">物件</Link>
        <Link href="/admin/owners">オーナー</Link>
        <Link href="/admin/staff">スタッフ</Link>
      </nav>
      <div className="p-4">{children}</div>
    </div>
  );
}
```

- [ ] **Step 5: x-pathname を付与する middleware を作成**

`outputs/clients/minpaku-cleaning/app/src/middleware.ts`:
```typescript
import { NextResponse, type NextRequest } from "next/server";

// 現在のパスをリクエストヘッダーに載せ、admin/layout.tsx が headers() で読めるようにする。
// response.headers ではなく request.headers に載せる点に注意（layout が読むのはリクエスト側）。
export function middleware(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-pathname", request.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: "/admin/:path*" };
```

- [ ] **Step 6: ダッシュボードのプレースホルダ画面を作成**

`outputs/clients/minpaku-cleaning/app/src/app/admin/page.tsx`:
```tsx
export default function AdminDashboard() {
  return (
    <main>
      <h1 className="text-xl font-bold">ダッシュボード</h1>
      <p className="text-sm text-gray-500 mt-2">
        清掃依頼カレンダーは Plan 2 / Plan 3 で実装します。
      </p>
    </main>
  );
}
```

- [ ] **Step 7: 動作確認**

別ターミナルでローカル Supabase が起動している前提。テスト用の管理者を作る:
```bash
cd outputs/clients/minpaku-cleaning/app
npx supabase db reset
```
SQL エディタ代わりに psql で管理者を1人作る（`supabase start` 出力の DB URL を使う）:
```bash
psql "$(npx supabase status --output json | npx node -e 'process.stdin.on("data",d=>console.log(JSON.parse(d).DB_URL))')" -c "
  insert into auth.users (id, email, encrypted_password, email_confirmed_at, aud, role)
  values (gen_random_uuid(), 'admin@example.com', crypt('password123', gen_salt('bf')), now(), 'authenticated', 'authenticated')
  returning id;
"
```
出力された UUID を使って admins に行を作る:
```bash
psql "<DB_URL>" -c "insert into admins (id, email, name) values ('<上のUUID>', 'admin@example.com', '管理者テスト');"
```
`npm run dev` で起動し、`http://localhost:3000/admin` にアクセス → `/admin/login` にリダイレクトされること、`admin@example.com` / `password123` でログインしてダッシュボードが表示されることを確認。

- [ ] **Step 8: Commit**

```bash
cd outputs/clients/minpaku-cleaning
git add app/src/lib/supabase-auth.ts app/src/app/admin app/src/middleware.ts
git commit -m "feat: 管理者ログインと認証ガード"
```

---

## Task 8: データアクセスのスコープヘルパー

アクター別にクエリのスコープを絞る共通ヘルパー。各エンティティのデータアクセスはこれを土台にする。

**Files:**
- Create: `outputs/clients/minpaku-cleaning/app/src/lib/db/scope.ts`
- Test: `outputs/clients/minpaku-cleaning/app/tests/db/scope.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

`outputs/clients/minpaku-cleaning/app/tests/db/scope.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { assertAdmin } from "@/lib/db/scope";
import type { Actor } from "@/lib/auth";

const admin: Actor = { role: "admin", adminId: "a1", roleLevel: 1 };
const staff: Actor = { role: "staff", staffId: "s1" };

describe("assertAdmin", () => {
  it("管理者ならそのまま通す", () => {
    expect(() => assertAdmin(admin)).not.toThrow();
  });
  it("管理者以外は例外を投げる", () => {
    expect(() => assertAdmin(staff)).toThrow("管理者権限が必要です");
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npm test -- scope`
Expected: FAIL（`assertAdmin` が存在しない）

- [ ] **Step 3: 最小実装を書く**

`outputs/clients/minpaku-cleaning/app/src/lib/db/scope.ts`:
```typescript
import type { Actor } from "@/lib/auth";

export class AuthorizationError extends Error {}

// 管理者専用操作のガード。管理者以外は AuthorizationError。
export function assertAdmin(
  actor: Actor,
): asserts actor is Extract<Actor, { role: "admin" }> {
  if (actor.role !== "admin") {
    throw new AuthorizationError("管理者権限が必要です");
  }
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npm test -- scope`
Expected: PASS（2 passed）

- [ ] **Step 5: Commit**

```bash
cd outputs/clients/minpaku-cleaning
git add app/src/lib/db/scope.ts app/tests/db/scope.test.ts
git commit -m "feat: データアクセスのスコープヘルパー（assertAdmin）"
```

---

## Task 9: 物件のデータアクセスと管理画面

**Files:**
- Create: `outputs/clients/minpaku-cleaning/app/src/lib/db/properties.ts`
- Create: `outputs/clients/minpaku-cleaning/app/src/app/api/admin/properties/route.ts`
- Create: `outputs/clients/minpaku-cleaning/app/src/app/admin/properties/page.tsx`
- Create: `outputs/clients/minpaku-cleaning/app/src/app/admin/properties/PropertyForm.tsx`
- Test: `outputs/clients/minpaku-cleaning/app/tests/db/properties.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

`outputs/clients/minpaku-cleaning/app/tests/db/properties.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { listProperties, createProperty, updateProperty, archiveProperty } from "@/lib/db/properties";
import { createServiceClient } from "@/lib/supabase-server";
import type { Actor } from "@/lib/auth";

const db = createServiceClient();
const admin: Actor = { role: "admin", adminId: "a1", roleLevel: 1 };
const staff: Actor = { role: "staff", staffId: "s1" };

let ownerId: string;

beforeEach(async () => {
  await db.from("properties").delete().neq("name", "");
  await db.from("owners").delete().neq("name", "");
  const { data } = await db.from("owners").insert({ name: "オーナーA" }).select().single();
  ownerId = data!.id;
});

describe("properties データアクセス", () => {
  it("管理者は物件を作成・取得できる", async () => {
    await createProperty(admin, { owner_id: ownerId, name: "物件A", address: "東京" });
    const list = await listProperties(admin);
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("物件A");
  });

  it("管理者以外は作成できない", async () => {
    await expect(
      createProperty(staff, { owner_id: ownerId, name: "物件X" }),
    ).rejects.toThrow("管理者権限が必要です");
  });

  it("物件を更新できる", async () => {
    const created = await createProperty(admin, { owner_id: ownerId, name: "旧名" });
    await updateProperty(admin, created.id, { name: "新名" });
    const list = await listProperties(admin);
    expect(list[0].name).toBe("新名");
  });

  it("archiveProperty は archived_at をセットし一覧から除外する", async () => {
    const created = await createProperty(admin, { owner_id: ownerId, name: "物件A" });
    await archiveProperty(admin, created.id);
    expect(await listProperties(admin)).toHaveLength(0);
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npm test -- properties`
Expected: FAIL（`@/lib/db/properties` が存在しない）

- [ ] **Step 3: データアクセスを実装**

`outputs/clients/minpaku-cleaning/app/src/lib/db/properties.ts`:
```typescript
import "server-only";
import { createServiceClient } from "@/lib/supabase-server";
import { assertAdmin } from "@/lib/db/scope";
import type { Actor } from "@/lib/auth";

export type PropertyInput = {
  owner_id: string;
  name: string;
  address?: string;
  access_info_note?: string;
  checklist_template?: unknown[];
};

export type Property = {
  id: string;
  owner_id: string;
  name: string;
  address: string | null;
  access_info_note: string | null;
  checklist_template: unknown[];
  archived_at: string | null;
};

export async function listProperties(actor: Actor): Promise<Property[]> {
  assertAdmin(actor);
  const db = createServiceClient();
  const { data, error } = await db
    .from("properties")
    .select("*")
    .is("archived_at", null)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data as Property[];
}

export async function createProperty(actor: Actor, input: PropertyInput): Promise<Property> {
  assertAdmin(actor);
  const db = createServiceClient();
  const { data, error } = await db.from("properties").insert(input).select().single();
  if (error) throw error;
  return data as Property;
}

export async function updateProperty(
  actor: Actor,
  id: string,
  patch: Partial<PropertyInput>,
): Promise<void> {
  assertAdmin(actor);
  const db = createServiceClient();
  const { error } = await db.from("properties").update(patch).eq("id", id);
  if (error) throw error;
}

export async function archiveProperty(actor: Actor, id: string): Promise<void> {
  assertAdmin(actor);
  const db = createServiceClient();
  const { error } = await db
    .from("properties")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npm test -- properties`
Expected: PASS（4 passed）

- [ ] **Step 5: API Route を実装**

`outputs/clients/minpaku-cleaning/app/src/app/api/admin/properties/route.ts`:
```typescript
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { resolveAdminActor } from "@/lib/supabase-auth";
import { listProperties, createProperty, updateProperty, archiveProperty } from "@/lib/db/properties";
import { AuthorizationError } from "@/lib/db/scope";

const createSchema = z.object({
  owner_id: z.string().uuid(),
  name: z.string().min(1),
  address: z.string().optional(),
  access_info_note: z.string().optional(),
});
const updateSchema = z.object({ id: z.string().uuid() }).and(createSchema.partial());

export async function GET() {
  const actor = await resolveAdminActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await listProperties(actor));
  } catch (e) {
    if (e instanceof AuthorizationError) return NextResponse.json({ error: e.message }, { status: 403 });
    throw e;
  }
}

export async function POST(req: NextRequest) {
  const actor = await resolveAdminActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  return NextResponse.json(await createProperty(actor, parsed.data));
}

export async function PATCH(req: NextRequest) {
  const actor = await resolveAdminActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { id, ...patch } = parsed.data;
  await updateProperty(actor, id, patch);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const actor = await resolveAdminActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await archiveProperty(actor, id);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 6: 物件フォームコンポーネントを実装**

`outputs/clients/minpaku-cleaning/app/src/app/admin/properties/PropertyForm.tsx`:
```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Owner = { id: string; name: string };

export function PropertyForm({ owners }: { owners: Owner[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [ownerId, setOwnerId] = useState(owners[0]?.id ?? "");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/admin/properties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner_id: ownerId, name, address: address || undefined }),
    });
    if (!res.ok) { setError("登録に失敗しました"); return; }
    setName(""); setAddress("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-2 border rounded p-3">
      <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)}
        className="w-full border rounded px-2 py-1">
        {owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
      <input value={name} onChange={(e) => setName(e.target.value)} required
        placeholder="物件名" className="w-full border rounded px-2 py-1" />
      <input value={address} onChange={(e) => setAddress(e.target.value)}
        placeholder="住所（任意）" className="w-full border rounded px-2 py-1" />
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button type="submit" className="bg-black text-white rounded px-3 py-1 text-sm">
        物件を追加
      </button>
    </form>
  );
}
```

- [ ] **Step 7: 物件一覧画面を実装**

`outputs/clients/minpaku-cleaning/app/src/app/admin/properties/page.tsx`:
```tsx
import { resolveAdminActor } from "@/lib/supabase-auth";
import { listProperties } from "@/lib/db/properties";
import { listOwners } from "@/lib/db/owners";
import { redirect } from "next/navigation";
import { PropertyForm } from "./PropertyForm";

export default async function PropertiesPage() {
  const actor = await resolveAdminActor();
  if (!actor) redirect("/admin/login");
  const [properties, owners] = await Promise.all([
    listProperties(actor),
    listOwners(actor),
  ]);
  return (
    <main className="space-y-4 max-w-2xl">
      <h1 className="text-xl font-bold">物件管理</h1>
      {owners.length === 0 ? (
        <p className="text-sm text-gray-500">先にオーナーを登録してください。</p>
      ) : (
        <PropertyForm owners={owners} />
      )}
      <ul className="divide-y border rounded">
        {properties.map((p) => (
          <li key={p.id} className="px-3 py-2 text-sm">
            {p.name}{p.address ? ` — ${p.address}` : ""}
          </li>
        ))}
      </ul>
    </main>
  );
}
```

> 注: このページは `listOwners`（Task 10）に依存する。Task 10 完了後にビルドが通る。Task 9 の Step 8 コミット時点では `listOwners` を仮実装してもよいが、subagent 実行では Task 9→10 の順で進めるため、Step 8 のビルド確認は Task 10 完了後に行う。

- [ ] **Step 8: Commit**

```bash
cd outputs/clients/minpaku-cleaning
git add app/src/lib/db/properties.ts app/tests/db/properties.test.ts app/src/app/api/admin/properties app/src/app/admin/properties
git commit -m "feat: 物件のデータアクセスと管理画面"
```

---

## Task 10: オーナーのデータアクセスと管理画面

**Files:**
- Create: `outputs/clients/minpaku-cleaning/app/src/lib/db/owners.ts`
- Create: `outputs/clients/minpaku-cleaning/app/src/app/api/admin/owners/route.ts`
- Create: `outputs/clients/minpaku-cleaning/app/src/app/admin/owners/page.tsx`
- Create: `outputs/clients/minpaku-cleaning/app/src/app/admin/owners/OwnerForm.tsx`
- Test: `outputs/clients/minpaku-cleaning/app/tests/db/owners.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

`outputs/clients/minpaku-cleaning/app/tests/db/owners.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { listOwners, createOwner, updateOwner } from "@/lib/db/owners";
import { createServiceClient } from "@/lib/supabase-server";
import type { Actor } from "@/lib/auth";

const db = createServiceClient();
const admin: Actor = { role: "admin", adminId: "a1", roleLevel: 1 };
const staff: Actor = { role: "staff", staffId: "s1" };

beforeEach(async () => {
  await db.from("properties").delete().neq("name", "");
  await db.from("owners").delete().neq("name", "");
});

describe("owners データアクセス", () => {
  it("管理者はオーナーを作成・取得できる", async () => {
    await createOwner(admin, { name: "オーナーA", email: "a@example.com" });
    const list = await listOwners(admin);
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("オーナーA");
  });

  it("管理者以外は作成できない", async () => {
    await expect(createOwner(staff, { name: "X" })).rejects.toThrow("管理者権限が必要です");
  });

  it("オーナーを更新できる", async () => {
    const created = await createOwner(admin, { name: "旧名" });
    await updateOwner(admin, created.id, { name: "新名" });
    expect((await listOwners(admin))[0].name).toBe("新名");
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npm test -- owners`
Expected: FAIL（`@/lib/db/owners` が存在しない）

- [ ] **Step 3: データアクセスを実装**

`outputs/clients/minpaku-cleaning/app/src/lib/db/owners.ts`:
```typescript
import "server-only";
import { createServiceClient } from "@/lib/supabase-server";
import { assertAdmin } from "@/lib/db/scope";
import type { Actor } from "@/lib/auth";

export type OwnerInput = {
  name: string;
  line_user_id?: string;
  email?: string;
};

export type Owner = {
  id: string;
  name: string;
  line_user_id: string | null;
  email: string | null;
};

export async function listOwners(actor: Actor): Promise<Owner[]> {
  assertAdmin(actor);
  const db = createServiceClient();
  const { data, error } = await db
    .from("owners")
    .select("id, name, line_user_id, email")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data as Owner[];
}

export async function createOwner(actor: Actor, input: OwnerInput): Promise<Owner> {
  assertAdmin(actor);
  const db = createServiceClient();
  const { data, error } = await db
    .from("owners")
    .insert(input)
    .select("id, name, line_user_id, email")
    .single();
  if (error) throw error;
  return data as Owner;
}

export async function updateOwner(
  actor: Actor,
  id: string,
  patch: Partial<OwnerInput>,
): Promise<void> {
  assertAdmin(actor);
  const db = createServiceClient();
  const { error } = await db.from("owners").update(patch).eq("id", id);
  if (error) throw error;
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npm test -- owners`
Expected: PASS（3 passed）

- [ ] **Step 5: API Route を実装**

`outputs/clients/minpaku-cleaning/app/src/app/api/admin/owners/route.ts`:
```typescript
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { resolveAdminActor } from "@/lib/supabase-auth";
import { listOwners, createOwner, updateOwner } from "@/lib/db/owners";

const createSchema = z.object({
  name: z.string().min(1),
  line_user_id: z.string().optional(),
  email: z.string().email().optional(),
});
const updateSchema = z.object({ id: z.string().uuid() }).and(createSchema.partial());

export async function GET() {
  const actor = await resolveAdminActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await listOwners(actor));
}

export async function POST(req: NextRequest) {
  const actor = await resolveAdminActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  return NextResponse.json(await createOwner(actor, parsed.data));
}

export async function PATCH(req: NextRequest) {
  const actor = await resolveAdminActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { id, ...patch } = parsed.data;
  await updateOwner(actor, id, patch);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 6: オーナーフォームコンポーネントを実装**

`outputs/clients/minpaku-cleaning/app/src/app/admin/owners/OwnerForm.tsx`:
```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function OwnerForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [lineId, setLineId] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/admin/owners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email: email || undefined,
        line_user_id: lineId || undefined,
      }),
    });
    if (!res.ok) { setError("登録に失敗しました"); return; }
    setName(""); setEmail(""); setLineId("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-2 border rounded p-3">
      <input value={name} onChange={(e) => setName(e.target.value)} required
        placeholder="オーナー名" className="w-full border rounded px-2 py-1" />
      <input value={email} onChange={(e) => setEmail(e.target.value)} type="email"
        placeholder="メールアドレス（任意）" className="w-full border rounded px-2 py-1" />
      <input value={lineId} onChange={(e) => setLineId(e.target.value)}
        placeholder="LINEユーザーID（任意）" className="w-full border rounded px-2 py-1" />
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button type="submit" className="bg-black text-white rounded px-3 py-1 text-sm">
        オーナーを追加
      </button>
    </form>
  );
}
```

- [ ] **Step 7: オーナー一覧画面を実装**

`outputs/clients/minpaku-cleaning/app/src/app/admin/owners/page.tsx`:
```tsx
import { resolveAdminActor } from "@/lib/supabase-auth";
import { listOwners } from "@/lib/db/owners";
import { redirect } from "next/navigation";
import { OwnerForm } from "./OwnerForm";

export default async function OwnersPage() {
  const actor = await resolveAdminActor();
  if (!actor) redirect("/admin/login");
  const owners = await listOwners(actor);
  return (
    <main className="space-y-4 max-w-2xl">
      <h1 className="text-xl font-bold">オーナー管理</h1>
      <OwnerForm />
      <ul className="divide-y border rounded">
        {owners.map((o) => (
          <li key={o.id} className="px-3 py-2 text-sm">
            {o.name}{o.email ? ` — ${o.email}` : ""}
          </li>
        ))}
      </ul>
    </main>
  );
}
```

- [ ] **Step 8: ビルドが通ることを確認**

Task 9 の物件画面が `listOwners` に依存していたため、ここで一括確認する。

Run: `npm run build`
Expected: ビルド成功（型エラーなし）

- [ ] **Step 9: Commit**

```bash
cd outputs/clients/minpaku-cleaning
git add app/src/lib/db/owners.ts app/tests/db/owners.test.ts app/src/app/api/admin/owners app/src/app/admin/owners
git commit -m "feat: オーナーのデータアクセスと管理画面"
```

---

## Task 11: スタッフのデータアクセスと管理画面

スタッフは担当物件（N:N）を持つ。`createStaff` / `updateStaff` で担当物件IDの配列を受け取り `staff_assignments` を同期する。

**Files:**
- Create: `outputs/clients/minpaku-cleaning/app/src/lib/db/staff.ts`
- Create: `outputs/clients/minpaku-cleaning/app/src/app/api/admin/staff/route.ts`
- Create: `outputs/clients/minpaku-cleaning/app/src/app/admin/staff/page.tsx`
- Create: `outputs/clients/minpaku-cleaning/app/src/app/admin/staff/StaffForm.tsx`
- Test: `outputs/clients/minpaku-cleaning/app/tests/db/staff.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

`outputs/clients/minpaku-cleaning/app/tests/db/staff.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { listStaff, createStaff, updateStaff } from "@/lib/db/staff";
import { createServiceClient } from "@/lib/supabase-server";
import type { Actor } from "@/lib/auth";

const db = createServiceClient();
const admin: Actor = { role: "admin", adminId: "a1", roleLevel: 1 };

let propertyId: string;

beforeEach(async () => {
  await db.from("staff_assignments").delete().neq("staff_id", "00000000-0000-0000-0000-000000000000");
  await db.from("staff").delete().neq("name", "");
  await db.from("properties").delete().neq("name", "");
  await db.from("owners").delete().neq("name", "");
  const { data: owner } = await db.from("owners").insert({ name: "オーナーA" }).select().single();
  const { data: property } = await db
    .from("properties").insert({ owner_id: owner!.id, name: "物件A" }).select().single();
  propertyId = property!.id;
});

describe("staff データアクセス", () => {
  it("担当物件付きでスタッフを作成し、担当物件も取得できる", async () => {
    const created = await createStaff(admin, { name: "スタッフA" }, [propertyId]);
    const list = await listStaff(admin);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(created.id);
    expect(list[0].property_ids).toEqual([propertyId]);
  });

  it("updateStaff は担当物件を差し替える", async () => {
    const created = await createStaff(admin, { name: "スタッフA" }, [propertyId]);
    await updateStaff(admin, created.id, { name: "スタッフA改" }, []);
    const list = await listStaff(admin);
    expect(list[0].name).toBe("スタッフA改");
    expect(list[0].property_ids).toEqual([]);
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npm test -- staff`
Expected: FAIL（`@/lib/db/staff` が存在しない）

- [ ] **Step 3: データアクセスを実装**

`outputs/clients/minpaku-cleaning/app/src/lib/db/staff.ts`:
```typescript
import "server-only";
import { createServiceClient } from "@/lib/supabase-server";
import { assertAdmin } from "@/lib/db/scope";
import type { Actor } from "@/lib/auth";

export type StaffInput = {
  name: string;
  line_user_id?: string;
  email?: string;
};

export type Staff = {
  id: string;
  name: string;
  line_user_id: string | null;
  email: string | null;
  property_ids: string[];
};

export async function listStaff(actor: Actor): Promise<Staff[]> {
  assertAdmin(actor);
  const db = createServiceClient();
  const { data, error } = await db
    .from("staff")
    .select("id, name, line_user_id, email, staff_assignments(property_id)")
    .is("archived_at", null)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((s: Record<string, unknown>) => ({
    id: s.id as string,
    name: s.name as string,
    line_user_id: s.line_user_id as string | null,
    email: s.email as string | null,
    property_ids: ((s.staff_assignments as { property_id: string }[]) ?? []).map(
      (a) => a.property_id,
    ),
  }));
}

async function syncAssignments(staffId: string, propertyIds: string[]) {
  const db = createServiceClient();
  await db.from("staff_assignments").delete().eq("staff_id", staffId);
  if (propertyIds.length > 0) {
    const { error } = await db
      .from("staff_assignments")
      .insert(propertyIds.map((property_id) => ({ staff_id: staffId, property_id })));
    if (error) throw error;
  }
}

export async function createStaff(
  actor: Actor,
  input: StaffInput,
  propertyIds: string[],
): Promise<Staff> {
  assertAdmin(actor);
  const db = createServiceClient();
  const { data, error } = await db.from("staff").insert(input).select().single();
  if (error) throw error;
  await syncAssignments(data.id, propertyIds);
  return { ...data, property_ids: propertyIds } as Staff;
}

export async function updateStaff(
  actor: Actor,
  id: string,
  patch: Partial<StaffInput>,
  propertyIds: string[],
): Promise<void> {
  assertAdmin(actor);
  const db = createServiceClient();
  const { error } = await db.from("staff").update(patch).eq("id", id);
  if (error) throw error;
  await syncAssignments(id, propertyIds);
}

export async function archiveStaff(actor: Actor, id: string): Promise<void> {
  assertAdmin(actor);
  const db = createServiceClient();
  const { error } = await db
    .from("staff")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npm test -- staff`
Expected: PASS（2 passed）

- [ ] **Step 5: API Route を実装**

`outputs/clients/minpaku-cleaning/app/src/app/api/admin/staff/route.ts`:
```typescript
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { resolveAdminActor } from "@/lib/supabase-auth";
import { listStaff, createStaff, updateStaff, archiveStaff } from "@/lib/db/staff";

const baseSchema = z.object({
  name: z.string().min(1),
  line_user_id: z.string().optional(),
  email: z.string().email().optional(),
  property_ids: z.array(z.string().uuid()).default([]),
});
const updateSchema = z
  .object({ id: z.string().uuid() })
  .and(baseSchema.partial())
  .and(z.object({ property_ids: z.array(z.string().uuid()).default([]) }));

export async function GET() {
  const actor = await resolveAdminActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await listStaff(actor));
}

export async function POST(req: NextRequest) {
  const actor = await resolveAdminActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = baseSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { property_ids, ...input } = parsed.data;
  return NextResponse.json(await createStaff(actor, input, property_ids));
}

export async function PATCH(req: NextRequest) {
  const actor = await resolveAdminActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { id, property_ids, ...patch } = parsed.data;
  await updateStaff(actor, id, patch, property_ids);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const actor = await resolveAdminActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await archiveStaff(actor, id);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 6: スタッフフォームコンポーネントを実装**

`outputs/clients/minpaku-cleaning/app/src/app/admin/staff/StaffForm.tsx`:
```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Property = { id: string; name: string };

export function StaffForm({ properties }: { properties: Property[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [lineId, setLineId] = useState("");
  const [propertyIds, setPropertyIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setPropertyIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/admin/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email: email || undefined,
        line_user_id: lineId || undefined,
        property_ids: propertyIds,
      }),
    });
    if (!res.ok) { setError("登録に失敗しました"); return; }
    setName(""); setEmail(""); setLineId(""); setPropertyIds([]);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-2 border rounded p-3">
      <input value={name} onChange={(e) => setName(e.target.value)} required
        placeholder="スタッフ名" className="w-full border rounded px-2 py-1" />
      <input value={email} onChange={(e) => setEmail(e.target.value)} type="email"
        placeholder="メールアドレス（任意）" className="w-full border rounded px-2 py-1" />
      <input value={lineId} onChange={(e) => setLineId(e.target.value)}
        placeholder="LINEユーザーID（任意）" className="w-full border rounded px-2 py-1" />
      <fieldset className="border rounded p-2">
        <legend className="text-sm text-gray-500">担当物件</legend>
        {properties.map((p) => (
          <label key={p.id} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={propertyIds.includes(p.id)}
              onChange={() => toggle(p.id)} />
            {p.name}
          </label>
        ))}
      </fieldset>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button type="submit" className="bg-black text-white rounded px-3 py-1 text-sm">
        スタッフを追加
      </button>
    </form>
  );
}
```

- [ ] **Step 7: スタッフ一覧画面を実装**

`outputs/clients/minpaku-cleaning/app/src/app/admin/staff/page.tsx`:
```tsx
import { resolveAdminActor } from "@/lib/supabase-auth";
import { listStaff } from "@/lib/db/staff";
import { listProperties } from "@/lib/db/properties";
import { redirect } from "next/navigation";
import { StaffForm } from "./StaffForm";

export default async function StaffPage() {
  const actor = await resolveAdminActor();
  if (!actor) redirect("/admin/login");
  const [staff, properties] = await Promise.all([
    listStaff(actor),
    listProperties(actor),
  ]);
  const nameById = new Map(properties.map((p) => [p.id, p.name]));
  return (
    <main className="space-y-4 max-w-2xl">
      <h1 className="text-xl font-bold">スタッフ管理</h1>
      <StaffForm properties={properties} />
      <ul className="divide-y border rounded">
        {staff.map((s) => (
          <li key={s.id} className="px-3 py-2 text-sm">
            {s.name}
            <span className="text-gray-500">
              {s.property_ids.length > 0
                ? ` — ${s.property_ids.map((id) => nameById.get(id) ?? "?").join("、")}`
                : " — 担当物件なし"}
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
```

- [ ] **Step 8: ビルドとテストが通ることを確認**

Run: `npm run build && npm test`
Expected: ビルド成功、全テスト PASS

- [ ] **Step 9: Commit**

```bash
cd outputs/clients/minpaku-cleaning
git add app/src/lib/db/staff.ts app/tests/db/staff.test.ts app/src/app/api/admin/staff app/src/app/admin/staff
git commit -m "feat: スタッフのデータアクセスと管理画面"
```

---

## Task 12: アクセストークンの発行・無効化・再発行

物件にはオーナートークン、スタッフにはスタッフトークンを発行する。発行・無効化・再発行を提供し、物件管理／スタッフ管理画面にトークンURL欄を足す。

**Files:**
- Create: `outputs/clients/minpaku-cleaning/app/src/lib/db/tokens.ts`
- Create: `outputs/clients/minpaku-cleaning/app/src/app/api/admin/tokens/route.ts`
- Modify: `outputs/clients/minpaku-cleaning/app/src/app/admin/properties/page.tsx`
- Modify: `outputs/clients/minpaku-cleaning/app/src/app/admin/staff/page.tsx`
- Create: `outputs/clients/minpaku-cleaning/app/src/app/admin/TokenControls.tsx`
- Test: `outputs/clients/minpaku-cleaning/app/tests/db/tokens.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

`outputs/clients/minpaku-cleaning/app/tests/db/tokens.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { issueToken, revokeToken, getActiveToken, reissueToken } from "@/lib/db/tokens";
import { createServiceClient } from "@/lib/supabase-server";
import type { Actor } from "@/lib/auth";

const db = createServiceClient();
const admin: Actor = { role: "admin", adminId: "a1", roleLevel: 1 };
const staff: Actor = { role: "staff", staffId: "s1" };

let propertyId: string;
let staffId: string;

beforeEach(async () => {
  await db.from("access_tokens").delete().neq("token", "");
  await db.from("staff").delete().neq("name", "");
  await db.from("properties").delete().neq("name", "");
  await db.from("owners").delete().neq("name", "");
  const { data: owner } = await db.from("owners").insert({ name: "オーナーA" }).select().single();
  const { data: property } = await db
    .from("properties").insert({ owner_id: owner!.id, name: "物件A" }).select().single();
  const { data: st } = await db.from("staff").insert({ name: "スタッフA" }).select().single();
  propertyId = property!.id;
  staffId = st!.id;
});

describe("access_tokens データアクセス", () => {
  it("物件のオーナートークンを発行できる", async () => {
    const token = await issueToken(admin, { type: "owner", propertyId });
    expect(token.token).toMatch(/^[A-Za-z0-9_-]+$/);
    const active = await getActiveToken(admin, { type: "owner", propertyId });
    expect(active?.token).toBe(token.token);
  });

  it("管理者以外はトークンを発行できない", async () => {
    await expect(
      issueToken(staff, { type: "staff", staffId }),
    ).rejects.toThrow("管理者権限が必要です");
  });

  it("revokeToken 後は getActiveToken が null を返す", async () => {
    const token = await issueToken(admin, { type: "staff", staffId });
    await revokeToken(admin, token.id);
    expect(await getActiveToken(admin, { type: "staff", staffId })).toBeNull();
  });

  it("reissueToken は旧トークンを revoke し新トークンを返す", async () => {
    const first = await issueToken(admin, { type: "owner", propertyId });
    const second = await reissueToken(admin, { type: "owner", propertyId });
    expect(second.token).not.toBe(first.token);
    const active = await getActiveToken(admin, { type: "owner", propertyId });
    expect(active?.token).toBe(second.token);
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npm test -- tokens.test`
Expected: FAIL（`@/lib/db/tokens` が存在しない）

- [ ] **Step 3: データアクセスを実装**

`outputs/clients/minpaku-cleaning/app/src/lib/db/tokens.ts`:
```typescript
import "server-only";
import { createServiceClient } from "@/lib/supabase-server";
import { assertAdmin } from "@/lib/db/scope";
import { generateToken } from "@/lib/tokens";
import type { Actor } from "@/lib/auth";

export type TokenTarget =
  | { type: "owner"; propertyId: string }
  | { type: "staff"; staffId: string };

export type AccessToken = {
  id: string;
  token: string;
  type: "owner" | "staff";
  property_id: string | null;
  staff_id: string | null;
  revoked_at: string | null;
};

function targetFilter(target: TokenTarget) {
  return target.type === "owner"
    ? { type: "owner" as const, property_id: target.propertyId }
    : { type: "staff" as const, staff_id: target.staffId };
}

export async function getActiveToken(
  actor: Actor,
  target: TokenTarget,
): Promise<AccessToken | null> {
  assertAdmin(actor);
  const db = createServiceClient();
  const { data, error } = await db
    .from("access_tokens")
    .select("*")
    .match(targetFilter(target))
    .is("revoked_at", null)
    .maybeSingle();
  if (error) throw error;
  return data as AccessToken | null;
}

export async function issueToken(
  actor: Actor,
  target: TokenTarget,
): Promise<AccessToken> {
  assertAdmin(actor);
  const db = createServiceClient();
  const row = {
    token: generateToken(),
    ...targetFilter(target),
  };
  const { data, error } = await db.from("access_tokens").insert(row).select().single();
  if (error) throw error;
  return data as AccessToken;
}

export async function revokeToken(actor: Actor, id: string): Promise<void> {
  assertAdmin(actor);
  const db = createServiceClient();
  const { error } = await db
    .from("access_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

// 既存の有効トークンがあれば revoke し、新しいトークンを発行する。
export async function reissueToken(
  actor: Actor,
  target: TokenTarget,
): Promise<AccessToken> {
  assertAdmin(actor);
  const existing = await getActiveToken(actor, target);
  if (existing) await revokeToken(actor, existing.id);
  return issueToken(actor, target);
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npm test -- tokens.test`
Expected: PASS（4 passed）

- [ ] **Step 5: API Route を実装**

`outputs/clients/minpaku-cleaning/app/src/app/api/admin/tokens/route.ts`:
```typescript
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { resolveAdminActor } from "@/lib/supabase-auth";
import { issueToken, revokeToken, reissueToken, type TokenTarget } from "@/lib/db/tokens";

const targetSchema = z.union([
  z.object({ type: z.literal("owner"), propertyId: z.string().uuid() }),
  z.object({ type: z.literal("staff"), staffId: z.string().uuid() }),
]);
const postSchema = z.object({
  action: z.enum(["issue", "reissue"]),
  target: targetSchema,
});

export async function POST(req: NextRequest) {
  const actor = await resolveAdminActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = postSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const target = parsed.data.target as TokenTarget;
  const token =
    parsed.data.action === "issue"
      ? await issueToken(actor, target)
      : await reissueToken(actor, target);
  return NextResponse.json(token);
}

export async function DELETE(req: NextRequest) {
  const actor = await resolveAdminActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await revokeToken(actor, id);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 6: トークン操作の共通コンポーネントを実装**

`outputs/clients/minpaku-cleaning/app/src/app/admin/TokenControls.tsx`:
```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  target: { type: "owner"; propertyId: string } | { type: "staff"; staffId: string };
  activeToken: { id: string; token: string } | null;
  basePath: "property" | "staff";
};

export function TokenControls({ target, activeToken, basePath }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const url = activeToken ? `${appUrl}/${basePath}/${activeToken.token}` : null;

  async function post(action: "issue" | "reissue") {
    setBusy(true);
    await fetch("/api/admin/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, target }),
    });
    setBusy(false);
    router.refresh();
  }

  async function revoke() {
    if (!activeToken) return;
    setBusy(true);
    await fetch(`/api/admin/tokens?id=${activeToken.id}`, { method: "DELETE" });
    setBusy(false);
    router.refresh();
  }

  if (!url) {
    return (
      <button onClick={() => post("issue")} disabled={busy}
        className="text-xs underline disabled:opacity-50">
        URLを発行
      </button>
    );
  }
  return (
    <span className="flex items-center gap-2 text-xs">
      <a href={url} className="underline break-all">{url}</a>
      <button onClick={() => post("reissue")} disabled={busy} className="underline">再発行</button>
      <button onClick={revoke} disabled={busy} className="underline text-red-600">無効化</button>
    </span>
  );
}
```

- [ ] **Step 7: 物件一覧画面にトークン欄を追加**

`outputs/clients/minpaku-cleaning/app/src/app/admin/properties/page.tsx` を以下に差し替え:
```tsx
import { resolveAdminActor } from "@/lib/supabase-auth";
import { listProperties } from "@/lib/db/properties";
import { listOwners } from "@/lib/db/owners";
import { getActiveToken } from "@/lib/db/tokens";
import { redirect } from "next/navigation";
import { PropertyForm } from "./PropertyForm";
import { TokenControls } from "../TokenControls";

export default async function PropertiesPage() {
  const actor = await resolveAdminActor();
  if (!actor) redirect("/admin/login");
  const [properties, owners] = await Promise.all([
    listProperties(actor),
    listOwners(actor),
  ]);
  const tokens = await Promise.all(
    properties.map((p) => getActiveToken(actor, { type: "owner", propertyId: p.id })),
  );
  return (
    <main className="space-y-4 max-w-2xl">
      <h1 className="text-xl font-bold">物件管理</h1>
      {owners.length === 0 ? (
        <p className="text-sm text-gray-500">先にオーナーを登録してください。</p>
      ) : (
        <PropertyForm owners={owners} />
      )}
      <ul className="divide-y border rounded">
        {properties.map((p, i) => (
          <li key={p.id} className="px-3 py-2 text-sm space-y-1">
            <div>{p.name}{p.address ? ` — ${p.address}` : ""}</div>
            <TokenControls
              target={{ type: "owner", propertyId: p.id }}
              activeToken={tokens[i] ? { id: tokens[i]!.id, token: tokens[i]!.token } : null}
              basePath="property"
            />
          </li>
        ))}
      </ul>
    </main>
  );
}
```

- [ ] **Step 8: スタッフ一覧画面にトークン欄を追加**

`outputs/clients/minpaku-cleaning/app/src/app/admin/staff/page.tsx` を以下に差し替え:
```tsx
import { resolveAdminActor } from "@/lib/supabase-auth";
import { listStaff } from "@/lib/db/staff";
import { listProperties } from "@/lib/db/properties";
import { getActiveToken } from "@/lib/db/tokens";
import { redirect } from "next/navigation";
import { StaffForm } from "./StaffForm";
import { TokenControls } from "../TokenControls";

export default async function StaffPage() {
  const actor = await resolveAdminActor();
  if (!actor) redirect("/admin/login");
  const [staff, properties] = await Promise.all([
    listStaff(actor),
    listProperties(actor),
  ]);
  const nameById = new Map(properties.map((p) => [p.id, p.name]));
  const tokens = await Promise.all(
    staff.map((s) => getActiveToken(actor, { type: "staff", staffId: s.id })),
  );
  return (
    <main className="space-y-4 max-w-2xl">
      <h1 className="text-xl font-bold">スタッフ管理</h1>
      <StaffForm properties={properties} />
      <ul className="divide-y border rounded">
        {staff.map((s, i) => (
          <li key={s.id} className="px-3 py-2 text-sm space-y-1">
            <div>
              {s.name}
              <span className="text-gray-500">
                {s.property_ids.length > 0
                  ? ` — ${s.property_ids.map((id) => nameById.get(id) ?? "?").join("、")}`
                  : " — 担当物件なし"}
              </span>
            </div>
            <TokenControls
              target={{ type: "staff", staffId: s.id }}
              activeToken={tokens[i] ? { id: tokens[i]!.id, token: tokens[i]!.token } : null}
              basePath="staff"
            />
          </li>
        ))}
      </ul>
    </main>
  );
}
```

- [ ] **Step 9: ビルドとテストが通ることを確認**

Run: `npm run build && npm test`
Expected: ビルド成功、全テスト PASS

- [ ] **Step 10: 手動で通し確認**

`npm run dev` で起動し、管理者ログイン後:
1. オーナーを1人登録
2. 物件を1件登録
3. スタッフを1人登録（担当物件にチェック）
4. 物件一覧で「URLを発行」→ URL が表示される → そのURLを開く（Plan 2/3 まで画面は未実装なので 404 でよい。トークンが解決されることは Task 6 のテストで担保済み）
5. 「再発行」で URL が変わること、「無効化」で発行ボタンに戻ることを確認

- [ ] **Step 11: Commit**

```bash
cd outputs/clients/minpaku-cleaning
git add app/src/lib/db/tokens.ts app/tests/db/tokens.test.ts app/src/app/api/admin/tokens app/src/app/admin/TokenControls.tsx app/src/app/admin/properties/page.tsx app/src/app/admin/staff/page.tsx
git commit -m "feat: アクセストークンの発行・無効化・再発行"
```

---

## 完了条件（Plan 1）

- [ ] 管理者が `/admin/login` でログインでき、未ログインは `/admin/login` にリダイレクトされる
- [ ] 管理者がオーナー・物件・スタッフ（担当物件付き）を登録・一覧表示できる
- [ ] 物件にオーナートークンURL、スタッフにスタッフトークンURLを発行・再発行・無効化できる
- [ ] `resolveActorByToken` が有効/無効/revoke済みトークンを正しく判定する
- [ ] `npm test` が全 PASS、`npm run build` が成功する

## 次のプラン

- **Plan 2: 清掃依頼コアフロー** — 依頼CRUD、ステータスフロー、早い者勝ち排他制御、スタッフ画面（承認/開始/チェックリスト/写真提出）
- **Plan 3: 通知・カレンダー・オーナービュー・仕上げ** — LINE/メール通知、Vercel Cron（リマインド/未割当アラート/写真自動削除）、カレンダービュー、オーナー閲覧画面、管理者管理画面（`/admin/admins`・追加/削除/権限レベル設定）

> 注: 設計書 section 5 の `/admin/admins`（管理者管理画面）は Plan 1 のスコープ外。Plan 1 では最初の管理者を Task 7 Step 7 の psql 手順で作成し、画面からの管理者追加・権限設定は Plan 3 で実装する。
