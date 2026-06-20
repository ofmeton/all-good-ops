# 民泊予約メール → LINEグループ集約通知 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 宿のGmailに届くアクティビティ予約通知メールを検知し、1予約=1通に集約・整形してLINEグループへ自動通知するGASアプリを作る。

**Architecture:** ロジック（パース・集約・整形）を GAS 非依存の純関数として `src/core/` に隔離しローカルで TDD。GAS依存（Gmail/Spreadsheet/LINE/トリガー）は `src/gas/` の薄いアダプタにまとめる。esbuild で全体を1ファイルにバンドルし clasp で宿のGASプロジェクトへ push。1分毎トリガーで `pollInbox()` を実行。

**Tech Stack:** TypeScript / Vitest（テスト）/ esbuild（バンドル）/ clasp（GASデプロイ）/ Google Apps Script（GmailApp・SpreadsheetApp・UrlFetchApp・ScriptProperties）/ LINE Messaging API。

設計書: `docs/superpowers/specs/2026-06-18-minpaku-reservation-line-notify-design.md`

## Global Constraints

- 完全無料で運用（GAS / Spreadsheet / Gmail）。外部有料サービス・GCP/Pub/Sub/Cloudflare を使わない。
- LINE は Messaging API（公式アカウント）の push のみ。月200通無料枠前提。
- 集約待ち（グレース期間）= **2分**。通知は1予約グループ=1通。
- 取りこぼし禁止: 送信成功後にのみ「処理済み」を確定。パース失敗は握り潰さず生メールをLINEへ流す。
- core 層（`src/core/`）は GAS API・I/O を一切参照しない純関数のみ（テスト可能性のため）。
- 秘匿値（LINEトークン・groupId・シートID・Gmailクエリ）は ScriptProperties に置き、コードに直書きしない。
- 配置: `apps/reservation-line-notify/`。

## File Structure

| ファイル | 責務 |
|---|---|
| `apps/reservation-line-notify/package.json` | 依存・スクリプト（test/build/push） |
| `tsconfig.json` / `vitest.config.ts` | TS・テスト設定 |
| `src/core/types.ts` | 共通型（ParsedReservation / Activity / Bucket） |
| `src/core/parse.ts` | `parseReservationMail` 他抽出純関数 |
| `src/core/aggregate.ts` | `mergeIntoBucket` / `dedupActivities` |
| `src/core/format.ts` | `formatSummary`（バケット→LINE本文） |
| `src/core/__tests__/*.test.ts` | core のテスト（サンプルメール固定） |
| `src/core/__tests__/fixtures.ts` | サンプルメール3通＋期待値 |
| `src/gas/sheetStore.ts` | 状態シート読み書き（GAS依存アダプタ） |
| `src/gas/gmail.ts` | Gmail検索・ラベル付与（GAS依存） |
| `src/gas/line.ts` | LINE push（GAS依存） |
| `src/gas/main.ts` | `pollInbox` オーケストレーション＋初期設定関数 |
| `esbuild.config.mjs` | src→`dist/Code.js` 単一バンドル |
| `appsscript.json` / `.clasp.json.example` | GASマニフェスト・clasp設定例 |
| `README.md` | セットアップ・デプロイ・運用手順 |

---

### Task 0: プロジェクト雛形とツールチェーン

**Files:**
- Create: `apps/reservation-line-notify/package.json`
- Create: `apps/reservation-line-notify/tsconfig.json`
- Create: `apps/reservation-line-notify/vitest.config.ts`
- Create: `apps/reservation-line-notify/.gitignore`

- [ ] **Step 1: package.json を作成**

```json
{
  "name": "reservation-line-notify",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "build": "node esbuild.config.mjs",
    "push": "npm run build && clasp push -f"
  },
  "devDependencies": {
    "@google/clasp": "^2.4.2",
    "@types/google-apps-script": "^1.0.83",
    "esbuild": "^0.23.0",
    "typescript": "^5.5.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 2: tsconfig.json を作成**

```json
{
  "compilerOptions": {
    "target": "ES2019",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2019"],
    "types": ["google-apps-script"],
    "strict": true,
    "noUnusedLocals": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: vitest.config.ts を作成**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { include: ["src/core/**/*.test.ts"] },
});
```

- [ ] **Step 4: .gitignore を作成**

```
node_modules/
dist/
.clasp.json
```

- [ ] **Step 5: 依存をインストールして確認**

Run: `cd apps/reservation-line-notify && npm install && npx vitest run`
Expected: テストは0件だが vitest が正常終了する（"No test files found" でも exit 0）。

- [ ] **Step 6: Commit**

```bash
git add apps/reservation-line-notify/package.json apps/reservation-line-notify/tsconfig.json apps/reservation-line-notify/vitest.config.ts apps/reservation-line-notify/.gitignore
git commit -m "chore(reservation-notify): プロジェクト雛形とツールチェーン"
```

---

### Task 1: 共通型とサンプルメール fixture

**Files:**
- Create: `src/core/types.ts`
- Create: `src/core/__tests__/fixtures.ts`

**Interfaces:**
- Produces: 型 `Activity`, `ParsedReservation`, `Bucket`。fixture `SAMPLE_ICE`, `SAMPLE_NOSAGYO`, `SAMPLE_SANSAKU`（`RawMail` 形）。

- [ ] **Step 1: types.ts を作成**

```ts
export interface Activity {
  dedupId: string;   // r= フル値を正規化（同一リクエスト判定）
  name: string;      // 例: 棚田米アイスづくりと野草茶体験
  date: string;      // 例: 2026-08-13
  time: string;      // 例: 15:40~17:00 （取れなければ ""）
  fee: number | null; // 円。欠損は null
}

export interface Customer { name: string; phone: string; email: string; }
export interface Stay { facility: string; period: string; headcount: string; }

export interface ParsedReservation {
  reservationKey: string; // 例: ac23a431
  customer: Customer;
  stay: Stay;
  activity: Activity;
  dashboardUrl: string;
  messageId: string;
  receivedAt: string;     // ISO8601
}

export interface Bucket {
  reservationKey: string;
  firstSeenAt: string;    // ISO8601
  customer: Customer;
  stay: Stay;
  dashboardUrl: string;
  activities: Activity[];
  messageIds: string[];
}

export interface RawMail {
  messageId: string;
  subject: string;
  body: string;
  receivedAt: string;     // ISO8601
}
```

- [ ] **Step 2: fixtures.ts を作成（設計書のサンプル3通を忠実に再現）**

```ts
import type { RawMail } from "../types";

const dashboard =
  "https://script.google.com/macros/s/AKfycbxoF3uqU9zCJ4DSH2GyTc4MYC3tR2rHEF8mBxM65DscDCHpxRX7bk2maRp_ZGcjfeBfCg/exec?dashboard=1&p=prov-beatice&t=dcf604b98117727ac644ada4976f8e61f56af6276f14609ee25e085036ac360f";

function build(activity: string, time: string, fee: string, rToken: string): string {
  return [
    "BEAT ICE 様",
    "",
    "下記のアクティビティ予約が入りました。ご確認の上、承認/NG のご回答をお願いします。",
    "",
    "【アクティビティ情報】",
    "■ 予約日時: 2026-06-17 21:24",
    `■ アクティビティ: ${activity}`,
    "■ 日付: 2026-08-13",
    `■ 開催時間: ${time}`,
    "■ 参加人数: 大人3名 / 小学生1名 (合計4名)",
    `■ 料金: ${fee}`,
    "■ ゲストからのメモ:",
    "",
    "【顧客情報】",
    "■ 氏名: Tanaka Asami",
    "■ 電話: +81 90 5536 7938",
    "■ メールアドレス: y.shino.earth@gmail.com",
    "",
    "【宿泊情報】",
    "■ 宿泊施設: わたや Roopt葉山上山口",
    "■ 宿泊期間: 2026-08-13 〜 2026-08-14",
    "■ 宿泊人数: 大人3 子供1 幼児0",
    "",
    "承認/NG はこちらから:",
    `https://script.google.com/macros/s/AKfycbxoF3uqU9zCJ4DSH2GyTc4MYC3tR2rHEF8mBxM65DscDCHpxRX7bk2maRp_ZGcjfeBfCg/exec?p=prov-beatice&r=${rToken}&t=e353cd4b513dc484c8b3c4fc835ebf16e4adcc7492842ed6ce2d19a2a0152ad6`,
    "",
    "■ 予約一覧・iCal 取得 (ダッシュボード)",
    dashboard,
    "— Roopt 運営",
  ].join("\n");
}

export const SUBJECT = "【Roopt】アクティビティ予約のご確認";

export const SAMPLE_ICE: RawMail = {
  messageId: "msg-ice-1",
  subject: SUBJECT,
  receivedAt: "2026-06-17T21:24:10+09:00",
  body: build("棚田米アイスづくりと野草茶体験", "15:40~17:00", "12,500円", "ac23a431_tanada-ice%20_20260813"),
};

export const SAMPLE_NOSAGYO: RawMail = {
  messageId: "msg-nosagyo-1",
  subject: SUBJECT,
  receivedAt: "2026-06-17T21:24:20+09:00",
  body: build("棚田と里山の農作業体験", "15:40~17:00", "12,500円", "ac23a431_tanada-nosagyo_20260813"),
};

export const SAMPLE_ICE_DUP: RawMail = {
  messageId: "msg-ice-2",
  subject: SUBJECT,
  receivedAt: "2026-06-17T21:24:25+09:00",
  body: build("棚田米アイスづくりと野草茶体験", "15:40~17:00", "12,500円", "ac23a431_tanada-ice%20_20260813"),
};

export const SAMPLE_SANSAKU: RawMail = {
  messageId: "msg-sansaku-1",
  subject: SUBJECT,
  receivedAt: "2026-06-17T21:24:30+09:00",
  body: build("棚田散策", "15:00~15:30", "（不明）", "ac23a431_tanada-sansaku_20260813"),
};
```

- [ ] **Step 3: Commit**

```bash
git add src/core/types.ts src/core/__tests__/fixtures.ts
git commit -m "feat(reservation-notify): 共通型とサンプルメールfixture"
```

---

### Task 2: メール本文パーサ（純関数 TDD）

**Files:**
- Create: `src/core/parse.ts`
- Create: `src/core/__tests__/parse.test.ts`

**Interfaces:**
- Consumes: `RawMail`, `ParsedReservation`（Task 1）。
- Produces:
  - `parseReservationMail(mail: RawMail): ParsedReservation | null`
  - `extractField(body: string, label: string): string`（見つからなければ `""`）
  - `parseFee(raw: string): number | null`
  - `extractReservationKey(body: string): string | null`（r= 先頭トークン、取れなければ null）

- [ ] **Step 1: 失敗するテストを書く**

```ts
import { describe, it, expect } from "vitest";
import { parseReservationMail, parseFee, extractReservationKey } from "../parse";
import { SAMPLE_ICE, SAMPLE_SANSAKU } from "./fixtures";

describe("parseFee", () => {
  it("カンマ・円つきを数値化", () => expect(parseFee("12,500円")).toBe(12500));
  it("不明は null", () => expect(parseFee("（不明）")).toBeNull());
  it("空欄は null", () => expect(parseFee("")).toBeNull());
});

describe("extractReservationKey", () => {
  it("r= 先頭トークン（%20スペース除去）", () => {
    expect(extractReservationKey(SAMPLE_ICE.body)).toBe("ac23a431");
  });
});

describe("parseReservationMail", () => {
  it("主要フィールドを抽出", () => {
    const p = parseReservationMail(SAMPLE_ICE)!;
    expect(p.reservationKey).toBe("ac23a431");
    expect(p.activity.name).toBe("棚田米アイスづくりと野草茶体験");
    expect(p.activity.date).toBe("2026-08-13");
    expect(p.activity.time).toBe("15:40~17:00");
    expect(p.activity.fee).toBe(12500);
    expect(p.activity.dedupId).toBe("ac23a431_tanada-ice_20260813"); // %20正規化済
    expect(p.customer.name).toBe("Tanaka Asami");
    expect(p.customer.email).toBe("y.shino.earth@gmail.com");
    expect(p.stay.facility).toBe("わたや Roopt葉山上山口");
    expect(p.stay.headcount).toBe("大人3 子供1 幼児0");
    expect(p.dashboardUrl).toContain("dashboard=1");
  });

  it("料金欠損は fee=null", () => {
    const p = parseReservationMail(SAMPLE_SANSAKU)!;
    expect(p.activity.fee).toBeNull();
    expect(p.activity.time).toBe("15:00~15:30");
  });

  it("予約通知でない本文は null", () => {
    const p = parseReservationMail({ messageId: "x", subject: "x", body: "ただの雑談", receivedAt: "2026-06-17T00:00:00+09:00" });
    expect(p).toBeNull();
  });
});
```

- [ ] **Step 2: 失敗を確認**

Run: `npx vitest run src/core/__tests__/parse.test.ts`
Expected: FAIL（`parse.ts` 未実装でモジュール解決エラー）。

- [ ] **Step 3: parse.ts を実装**

```ts
import type { RawMail, ParsedReservation, Activity } from "./types";

const MARKER = "アクティビティ予約が入りました";

export function extractField(body: string, label: string): string {
  // 例: "■ アクティビティ: 棚田..." の値部分を取る
  const re = new RegExp("■\\s*" + label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*:\\s*(.*)");
  const m = body.match(re);
  return m ? m[1].trim() : "";
}

export function parseFee(raw: string): number | null {
  if (!raw) return null;
  const digits = raw.replace(/[,，]/g, "").match(/\d+/);
  return digits ? Number(digits[0]) : null;
}

export function extractReservationKey(body: string): string | null {
  const full = extractDedupId(body);
  if (!full) return null;
  return full.split("_")[0] || null;
}

export function extractDedupId(body: string): string | null {
  // 承認URL（dashboard=1 を含まない方）の r= を取る
  const m = body.match(/[?&]r=([^&\s]+)/);
  if (!m) return null;
  // %20 などをデコードし、空白を除去して正規化
  let v: string;
  try { v = decodeURIComponent(m[1]); } catch { v = m[1]; }
  return v.replace(/\s+/g, "").trim();
}

function extractDashboardUrl(body: string): string {
  const m = body.match(/https:\/\/\S*dashboard=1\S*/);
  return m ? m[0] : "";
}

export function parseReservationMail(mail: RawMail): ParsedReservation | null {
  const body = mail.body;
  if (!body.includes(MARKER)) return null;

  const reservationKey = extractReservationKey(body);
  const dedupId = extractDedupId(body);
  const name = extractField(body, "アクティビティ");
  if (!name) return null; // 予約メール形だがアクティビティ不明＝パース失敗扱い

  // reservationKey 取得不能時は補助キーへフォールバック（氏名+メール+宿泊開始日）
  const custName = extractField(body, "氏名");
  const email = extractField(body, "メールアドレス");
  const period = extractField(body, "宿泊期間");
  const fallbackKey = [custName, email, period.split("〜")[0].trim()].join("|");

  const activity: Activity = {
    dedupId: dedupId ?? `${fallbackKey}|${name}`,
    name,
    date: extractField(body, "日付"),
    time: extractField(body, "開催時間"),
    fee: parseFee(extractField(body, "料金")),
  };

  return {
    reservationKey: reservationKey ?? fallbackKey,
    customer: { name: custName, phone: extractField(body, "電話"), email },
    stay: {
      facility: extractField(body, "宿泊施設"),
      period,
      headcount: extractField(body, "宿泊人数"),
    },
    activity,
    dashboardUrl: extractDashboardUrl(body),
    messageId: mail.messageId,
    receivedAt: mail.receivedAt,
  };
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx vitest run src/core/__tests__/parse.test.ts`
Expected: PASS（全 it 緑）。

- [ ] **Step 5: Commit**

```bash
git add src/core/parse.ts src/core/__tests__/parse.test.ts
git commit -m "feat(reservation-notify): メール本文パーサ（純関数）"
```

---

### Task 3: 集約・重複排除（純関数 TDD）

**Files:**
- Create: `src/core/aggregate.ts`
- Create: `src/core/__tests__/aggregate.test.ts`

**Interfaces:**
- Consumes: `ParsedReservation`, `Bucket`（Task 1）。
- Produces:
  - `dedupActivities(activities: Activity[]): Activity[]`（dedupId 一意化、初出順を保持）
  - `mergeIntoBucket(existing: Bucket | null, p: ParsedReservation): Bucket`

- [ ] **Step 1: 失敗するテストを書く**

```ts
import { describe, it, expect } from "vitest";
import { mergeIntoBucket, dedupActivities } from "../aggregate";
import { parseReservationMail } from "../parse";
import { SAMPLE_ICE, SAMPLE_NOSAGYO, SAMPLE_ICE_DUP, SAMPLE_SANSAKU } from "./fixtures";

const ice = parseReservationMail(SAMPLE_ICE)!;
const nosagyo = parseReservationMail(SAMPLE_NOSAGYO)!;
const iceDup = parseReservationMail(SAMPLE_ICE_DUP)!;
const sansaku = parseReservationMail(SAMPLE_SANSAKU)!;

describe("mergeIntoBucket", () => {
  it("新規作成で firstSeenAt は初回メール受信時刻", () => {
    const b = mergeIntoBucket(null, ice);
    expect(b.reservationKey).toBe("ac23a431");
    expect(b.firstSeenAt).toBe(ice.receivedAt);
    expect(b.activities).toHaveLength(1);
    expect(b.messageIds).toEqual(["msg-ice-1"]);
  });

  it("3種を集約し firstSeenAt は維持", () => {
    let b = mergeIntoBucket(null, ice);
    b = mergeIntoBucket(b, nosagyo);
    b = mergeIntoBucket(b, sansaku);
    expect(b.activities.map(a => a.name)).toEqual([
      "棚田米アイスづくりと野草茶体験",
      "棚田と里山の農作業体験",
      "棚田散策",
    ]);
    expect(b.firstSeenAt).toBe(ice.receivedAt);
    expect(b.messageIds).toHaveLength(3);
  });

  it("重複（同一dedupId）は1件に畳む", () => {
    let b = mergeIntoBucket(null, ice);
    b = mergeIntoBucket(b, iceDup);
    expect(b.activities).toHaveLength(1);
    expect(b.messageIds).toEqual(["msg-ice-1", "msg-ice-2"]); // メールは両方処理済み記録
  });
});
```

- [ ] **Step 2: 失敗を確認**

Run: `npx vitest run src/core/__tests__/aggregate.test.ts`
Expected: FAIL（`aggregate.ts` 未実装）。

- [ ] **Step 3: aggregate.ts を実装**

```ts
import type { ParsedReservation, Bucket, Activity } from "./types";

export function dedupActivities(activities: Activity[]): Activity[] {
  const seen = new Set<string>();
  const out: Activity[] = [];
  for (const a of activities) {
    if (seen.has(a.dedupId)) continue;
    seen.add(a.dedupId);
    out.push(a);
  }
  return out;
}

export function mergeIntoBucket(existing: Bucket | null, p: ParsedReservation): Bucket {
  if (!existing) {
    return {
      reservationKey: p.reservationKey,
      firstSeenAt: p.receivedAt,
      customer: p.customer,
      stay: p.stay,
      dashboardUrl: p.dashboardUrl,
      activities: [p.activity],
      messageIds: [p.messageId],
    };
  }
  const messageIds = existing.messageIds.includes(p.messageId)
    ? existing.messageIds
    : [...existing.messageIds, p.messageId];
  return {
    ...existing,
    dashboardUrl: existing.dashboardUrl || p.dashboardUrl,
    activities: dedupActivities([...existing.activities, p.activity]),
    messageIds,
  };
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx vitest run src/core/__tests__/aggregate.test.ts`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/core/aggregate.ts src/core/__tests__/aggregate.test.ts
git commit -m "feat(reservation-notify): 集約・重複排除（純関数）"
```

---

### Task 4: LINEメッセージ整形（純関数 TDD）

**Files:**
- Create: `src/core/format.ts`
- Create: `src/core/__tests__/format.test.ts`

**Interfaces:**
- Consumes: `Bucket`（Task 1）。
- Produces:
  - `formatSummary(bucket: Bucket): string`
  - `formatRawFallback(subject: string, body: string): string`（パース失敗時の生メール通知）

- [ ] **Step 1: 失敗するテストを書く**

```ts
import { describe, it, expect } from "vitest";
import { formatSummary } from "../format";
import { mergeIntoBucket } from "../aggregate";
import { parseReservationMail } from "../parse";
import { SAMPLE_ICE, SAMPLE_NOSAGYO, SAMPLE_SANSAKU } from "./fixtures";

let b = mergeIntoBucket(null, parseReservationMail(SAMPLE_ICE)!);
b = mergeIntoBucket(b, parseReservationMail(SAMPLE_NOSAGYO)!);
b = mergeIntoBucket(b, parseReservationMail(SAMPLE_SANSAKU)!);

describe("formatSummary", () => {
  const text = formatSummary(b);
  it("件数とアクティビティ名を含む", () => {
    expect(text).toContain("リクエストされた体験（3件）");
    expect(text).toContain("棚田米アイスづくりと野草茶体験");
    expect(text).toContain("棚田散策");
  });
  it("欠損料金は ¥- 表示", () => expect(text).toContain("¥-"));
  it("合計は記載分のみ", () => expect(text).toContain("合計 ¥25,000（料金記載分のみ）"));
  it("顧客名・宿泊施設・ダッシュボードURLを含む", () => {
    expect(text).toContain("Tanaka Asami");
    expect(text).toContain("わたや Roopt葉山上山口");
    expect(text).toContain("dashboard=1");
  });
});
```

- [ ] **Step 2: 失敗を確認**

Run: `npx vitest run src/core/__tests__/format.test.ts`
Expected: FAIL（`format.ts` 未実装）。

- [ ] **Step 3: format.ts を実装**

```ts
import type { Bucket } from "./types";

function yen(n: number | null): string {
  return n == null ? "¥-" : "¥" + n.toLocaleString("en-US");
}

export function formatSummary(b: Bucket): string {
  const lines: string[] = [];
  lines.push("🏡 新しいアクティビティ予約（要承認）");
  lines.push("");
  lines.push(`👤 ${b.customer.name} 様 / ${b.stay.headcount}（宿泊人数）`);
  lines.push(`🏠 ${b.stay.facility}`);
  lines.push(`🗓 宿泊 ${b.stay.period}`);
  lines.push("");
  lines.push(`🎯 リクエストされた体験（${b.activities.length}件）`);
  for (const a of b.activities) {
    lines.push(` ・${a.name}  ${a.date} ${a.time}  ${yen(a.fee)}`);
  }
  const total = b.activities.reduce((s, a) => s + (a.fee ?? 0), 0);
  lines.push(`💴 合計 ${yen(total)}（料金記載分のみ）`);
  lines.push("");
  lines.push("✅ 承認/NG・予約一覧:");
  lines.push(b.dashboardUrl);
  return lines.join("\n");
}

export function formatRawFallback(subject: string, body: string): string {
  return [
    "⚠️ 予約通知メールを自動整形できませんでした（要手動確認）",
    "",
    `件名: ${subject}`,
    "",
    body,
  ].join("\n");
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx vitest run`
Expected: PASS（core 全テスト緑）。

- [ ] **Step 5: Commit**

```bash
git add src/core/format.ts src/core/__tests__/format.test.ts
git commit -m "feat(reservation-notify): LINEメッセージ整形（純関数）"
```

---

### Task 5: GASアダプタ — 状態シート

**Files:**
- Create: `src/gas/sheetStore.ts`

**Interfaces:**
- Consumes: `Bucket`（Task 1）, ScriptProperties キー `SHEET_ID`。
- Produces:
  - `loadBucket(key: string): Bucket | null`
  - `saveBucket(b: Bucket): void`（reservationKey で upsert、status=pending）
  - `listPending(): Bucket[]`
  - `markSent(key: string, sentAtIso: string): void`
  - `markFailed(key: string): void`
  - `incrAttempt(key: string): number`（リトライ回数を返す）
- 列順（ヘッダ行固定）: `reservation_key | first_seen_at | customer_json | stay_json | activities_json | dashboard_url | message_ids | status | attempts | sent_at`

- [ ] **Step 1: sheetStore.ts を実装**

```ts
import type { Bucket } from "../core/types";

const HEADERS = [
  "reservation_key", "first_seen_at", "customer_json", "stay_json",
  "activities_json", "dashboard_url", "message_ids", "status", "attempts", "sent_at",
];

function sheet(): GoogleAppsScript.Spreadsheet.Sheet {
  const id = PropertiesService.getScriptProperties().getProperty("SHEET_ID");
  if (!id) throw new Error("SHEET_ID プロパティ未設定");
  const ss = SpreadsheetApp.openById(id);
  let sh = ss.getSheetByName("state");
  if (!sh) {
    sh = ss.insertSheet("state");
    sh.appendRow(HEADERS);
  }
  return sh;
}

function rowToBucket(row: any[]): Bucket {
  return {
    reservationKey: String(row[0]),
    firstSeenAt: String(row[1]),
    customer: JSON.parse(row[2] || "{}"),
    stay: JSON.parse(row[3] || "{}"),
    activities: JSON.parse(row[4] || "[]"),
    dashboardUrl: String(row[5] || ""),
    messageIds: String(row[6] || "").split(",").filter(Boolean),
  };
}

function bucketToRow(b: Bucket, status: string, attempts: number, sentAt: string): any[] {
  return [
    b.reservationKey, b.firstSeenAt, JSON.stringify(b.customer), JSON.stringify(b.stay),
    JSON.stringify(b.activities), b.dashboardUrl, b.messageIds.join(","),
    status, attempts, sentAt,
  ];
}

function findRowIndex(sh: GoogleAppsScript.Spreadsheet.Sheet, key: string): number {
  const keys = sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 0), 1).getValues();
  for (let i = 0; i < keys.length; i++) if (String(keys[i][0]) === key) return i + 2;
  return -1;
}

export function loadBucket(key: string): Bucket | null {
  const sh = sheet();
  const r = findRowIndex(sh, key);
  if (r < 0) return null;
  return rowToBucket(sh.getRange(r, 1, 1, HEADERS.length).getValues()[0]);
}

export function saveBucket(b: Bucket): void {
  const sh = sheet();
  const r = findRowIndex(sh, b.reservationKey);
  if (r < 0) {
    sh.appendRow(bucketToRow(b, "pending", 0, ""));
  } else {
    const cur = sh.getRange(r, 1, 1, HEADERS.length).getValues()[0];
    const status = String(cur[7]) === "sent" ? "sent" : "pending";
    sh.getRange(r, 1, 1, HEADERS.length).setValues([bucketToRow(b, status, Number(cur[8] || 0), String(cur[9] || ""))]);
  }
}

export function listPending(): Bucket[] {
  const sh = sheet();
  const n = sh.getLastRow() - 1;
  if (n <= 0) return [];
  const rows = sh.getRange(2, 1, n, HEADERS.length).getValues();
  return rows.filter(r => String(r[7]) === "pending").map(rowToBucket);
}

export function markSent(key: string, sentAtIso: string): void {
  const sh = sheet();
  const r = findRowIndex(sh, key);
  if (r < 0) return;
  sh.getRange(r, 8).setValue("sent");
  sh.getRange(r, 10).setValue(sentAtIso);
}

export function markFailed(key: string): void {
  const sh = sheet();
  const r = findRowIndex(sh, key);
  if (r >= 0) sh.getRange(r, 8).setValue("failed");
}

export function incrAttempt(key: string): number {
  const sh = sheet();
  const r = findRowIndex(sh, key);
  if (r < 0) return 0;
  const n = Number(sh.getRange(r, 9).getValue() || 0) + 1;
  sh.getRange(r, 9).setValue(n);
  return n;
}
```

- [ ] **Step 2: 型チェック**

Run: `npx tsc --noEmit`
Expected: エラーなし。

- [ ] **Step 3: Commit**

```bash
git add src/gas/sheetStore.ts
git commit -m "feat(reservation-notify): 状態シートアダプタ"
```

---

### Task 6: GASアダプタ — Gmail と LINE

**Files:**
- Create: `src/gas/gmail.ts`
- Create: `src/gas/line.ts`

**Interfaces:**
- Produces (gmail):
  - `fetchUnprocessed(): RawMail[]`（ScriptProperties `GMAIL_QUERY` で検索、`notified`/`notify-error` ラベル除外）
  - `labelDone(messageId: string): void`
  - `labelError(messageId: string): void`
- Produces (line):
  - `pushLine(text: string): boolean`（200 で true。ScriptProperties `LINE_TOKEN`, `LINE_GROUP_ID`）

- [ ] **Step 1: gmail.ts を実装**

```ts
import type { RawMail } from "../core/types";

function prop(k: string): string {
  const v = PropertiesService.getScriptProperties().getProperty(k);
  if (!v) throw new Error(k + " プロパティ未設定");
  return v;
}

function getOrCreateLabel(name: string): GoogleAppsScript.Gmail.GmailLabel {
  return GmailApp.getUserLabelByName(name) || GmailApp.createLabel(name);
}

export function fetchUnprocessed(): RawMail[] {
  const query = prop("GMAIL_QUERY"); // 例: 'from:roopt subject:アクティビティ予約 -label:notified -label:notify-error newer_than:2d'
  const threads = GmailApp.search(query, 0, 50);
  const out: RawMail[] = [];
  for (const t of threads) {
    for (const m of t.getMessages()) {
      out.push({
        messageId: m.getId(),
        subject: m.getSubject(),
        body: m.getPlainBody(),
        receivedAt: m.getDate().toISOString(),
      });
    }
  }
  return out;
}

export function labelDone(messageId: string): void {
  const label = getOrCreateLabel("notified");
  GmailApp.getMessageById(messageId).getThread().addLabel(label);
}

export function labelError(messageId: string): void {
  const label = getOrCreateLabel("notify-error");
  GmailApp.getMessageById(messageId).getThread().addLabel(label);
}
```

- [ ] **Step 2: line.ts を実装**

```ts
function prop(k: string): string {
  const v = PropertiesService.getScriptProperties().getProperty(k);
  if (!v) throw new Error(k + " プロパティ未設定");
  return v;
}

export function pushLine(text: string): boolean {
  const res = UrlFetchApp.fetch("https://api.line.me/v2/bot/message/push", {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + prop("LINE_TOKEN") },
    muteHttpExceptions: true,
    payload: JSON.stringify({
      to: prop("LINE_GROUP_ID"),
      messages: [{ type: "text", text: text.slice(0, 4900) }], // LINE上限5000字
    }),
  });
  return res.getResponseCode() === 200;
}
```

- [ ] **Step 3: 型チェック**

Run: `npx tsc --noEmit`
Expected: エラーなし。

- [ ] **Step 4: Commit**

```bash
git add src/gas/gmail.ts src/gas/line.ts
git commit -m "feat(reservation-notify): GmailとLINEアダプタ"
```

---

### Task 7: オーケストレーション pollInbox

**Files:**
- Create: `src/gas/main.ts`

**Interfaces:**
- Consumes: core（parse/aggregate/format）, gas（sheetStore/gmail/line）。
- Produces: グローバル関数 `pollInbox()`, `setupTrigger()`, `debugShowGroupId(e)`。
- Constants: `GRACE_MS = 2*60*1000`, `MAX_ATTEMPTS = 10`。

- [ ] **Step 1: main.ts を実装**

```ts
import { parseReservationMail } from "../core/parse";
import { mergeIntoBucket } from "../core/aggregate";
import { formatSummary, formatRawFallback } from "../core/format";
import { loadBucket, saveBucket, listPending, markSent, markFailed, incrAttempt } from "./sheetStore";
import { fetchUnprocessed, labelDone, labelError } from "./gmail";
import { pushLine } from "./line";

const GRACE_MS = 2 * 60 * 1000;
const MAX_ATTEMPTS = 10;

function pollInbox(): void {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30 * 1000)) return; // 多重起動防止
  try {
    ingest();
    flush();
  } finally {
    lock.releaseLock();
  }
}

function ingest(): void {
  for (const mail of fetchUnprocessed()) {
    const parsed = parseReservationMail(mail);
    if (!parsed) {
      // パース失敗: 生メールをそのままLINEへ。成功時のみ done、失敗時 error ラベル
      const ok = pushLine(formatRawFallback(mail.subject, mail.body));
      if (ok) labelDone(mail.messageId);
      else labelError(mail.messageId);
      continue;
    }
    const merged = mergeIntoBucket(loadBucket(parsed.reservationKey), parsed);
    saveBucket(merged);
    labelDone(mail.messageId); // 取り込み済み（バケットに保全されたのでラベルOK）
  }
}

function flush(): void {
  const now = Date.now();
  for (const b of listPending()) {
    if (now - new Date(b.firstSeenAt).getTime() < GRACE_MS) continue;
    const ok = pushLine(formatSummary(b));
    if (ok) {
      markSent(b.reservationKey, new Date().toISOString());
    } else {
      const attempts = incrAttempt(b.reservationKey);
      if (attempts >= MAX_ATTEMPTS) {
        pushLine(formatRawFallback("送信失敗が継続（要手動）", JSON.stringify(b, null, 2)));
        markFailed(b.reservationKey);
      }
    }
  }
}

function setupTrigger(): void {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === "pollInbox") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("pollInbox").timeBased().everyMinutes(1).create();
}

// LINEグループ招待後、Webhookで一度だけ groupId を確認するための補助
function debugShowGroupId(e: any): void {
  console.log(JSON.stringify(e));
}
```

- [ ] **Step 2: 型チェック**

Run: `npx tsc --noEmit`
Expected: エラーなし。

- [ ] **Step 3: core 全テスト再実行（リグレッション確認）**

Run: `npx vitest run`
Expected: PASS。

- [ ] **Step 4: Commit**

```bash
git add src/gas/main.ts
git commit -m "feat(reservation-notify): pollInbox オーケストレーション"
```

---

### Task 8: バンドルと GAS マニフェスト

**Files:**
- Create: `esbuild.config.mjs`
- Create: `appsscript.json`
- Create: `.clasp.json.example`

**Interfaces:**
- Produces: `dist/Code.js`（GASグローバル関数 `pollInbox`/`setupTrigger`/`debugShowGroupId` を含む単一ファイル）。

**Note:** clasp は ES import を解決しないため esbuild で IIFE 1ファイルにまとめ、GASが呼ぶ関数を `globalThis` に露出させる。

- [ ] **Step 1: main.ts 末尾にグローバル露出を追加**

`src/gas/main.ts` の末尾に追記:

```ts
// esbuild バンドル後、GAS から呼べるよう globalThis に露出
(globalThis as any).pollInbox = pollInbox;
(globalThis as any).setupTrigger = setupTrigger;
(globalThis as any).debugShowGroupId = debugShowGroupId;
```

- [ ] **Step 2: esbuild.config.mjs を作成**

```js
import { build } from "esbuild";

await build({
  entryPoints: ["src/gas/main.ts"],
  bundle: true,
  format: "iife",
  target: "es2019",
  outfile: "dist/Code.js",
  legalComments: "none",
});
console.log("bundled -> dist/Code.js");
```

- [ ] **Step 3: appsscript.json を作成**

```json
{
  "timeZone": "Asia/Tokyo",
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "oauthScopes": [
    "https://www.googleapis.com/auth/script.external_request",
    "https://mail.google.com/",
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/script.scriptapp"
  ]
}
```

- [ ] **Step 4: .clasp.json.example を作成**

```json
{
  "scriptId": "<宿のGASプロジェクトのscriptId>",
  "rootDir": "dist"
}
```

- [ ] **Step 5: appsscript.json を dist にもコピーする設定を esbuild.config.mjs に追記**

`esbuild.config.mjs` の `console.log` の前に追記:

```js
import { copyFileSync, mkdirSync } from "fs";
mkdirSync("dist", { recursive: true });
copyFileSync("appsscript.json", "dist/appsscript.json");
```

- [ ] **Step 6: ビルド確認**

Run: `npm run build && test -f dist/Code.js && grep -c "pollInbox" dist/Code.js`
Expected: `dist/Code.js` が生成され、`pollInbox` を含む（grep が 1 以上）。

- [ ] **Step 7: Commit**

```bash
git add src/gas/main.ts esbuild.config.mjs appsscript.json .clasp.json.example
git commit -m "build(reservation-notify): esbuildバンドルとGASマニフェスト"
```

---

### Task 9: README（セットアップ・デプロイ・運用手順）

**Files:**
- Create: `README.md`

- [ ] **Step 1: README.md を作成**

````markdown
# reservation-line-notify

宿のGmailに届くアクティビティ予約通知を、1予約=1通に集約してLINEグループへ通知するGASアプリ。

設計: `../../docs/superpowers/specs/2026-06-18-minpaku-reservation-line-notify-design.md`

## 開発
```bash
npm install
npm test        # core純関数のテスト
npm run build   # dist/Code.js を生成
```

## 初期セットアップ（1回・宿のGoogleアカウントで）
1. LINE Developers で Messaging API チャネル（公式アカウント）を作成。チャネルアクセストークン（長期）を発行。
2. 公式アカウントを通知先 LINE グループに招待。
3. groupId 取得: Webhook を一時的に GAS WebApp（`debugShowGroupId` を doPost に配線）に向け、グループで1回発言→ログの `source.groupId` を控える。取得後 Webhook は不要。
4. 通知履歴用スプレッドシートを新規作成し、その ID を控える。
5. GASプロジェクト作成→ `clasp create` 後 `.clasp.json.example` を `.clasp.json` にコピーし scriptId 記入。
6. ScriptProperties を設定（GASエディタ or `clasp`）:
   - `LINE_TOKEN` = チャネルアクセストークン
   - `LINE_GROUP_ID` = 手順3のgroupId
   - `SHEET_ID` = 手順4のシートID
   - `GMAIL_QUERY` = 実物メールに合わせる。例:
     `from:(roopt) subject:(アクティビティ予約) -label:notified -label:notify-error newer_than:2d`
7. `npm run push` で dist を反映。
8. GASエディタで `setupTrigger` を1回実行 → 1分毎トリガー登録。
9. `pollInbox` を手動実行し権限承認＆動作確認。

## 運用
- 通知は「最初のメール検知から2分後」に1通。
- 重複・複数リクエストは自動で1通に集約。
- 整形できないメールは生本文がそのままLINEに流れる（`notify-error` ラベルが付く）→ クエリ/パーサ調整。
- 状態シートが予約履歴ログを兼ねる。`status=failed` 行は送信が10回失敗した予約（要手動対応）。
- LINE無料枠は月200通。超過しそうなら有料プラン検討。
````

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs(reservation-notify): セットアップ・運用README"
```

---

## Self-Review チェック結果

- **Spec coverage**: §3抽出=Task2 / §4アーキ・関数分割=Task5-7 / §5状態シート=Task5 / §6整形=Task4 / §7エラー処理（送信後確定・パース失敗の生流し・二重ガード・滞留防止MAX_ATTEMPTS）=Task7 / §8セットアップ=Task9 / §9コスト=README明記 / §11未確定（送信元・件名）=`GMAIL_QUERY` で実物確定。網羅。
- **Placeholder scan**: 各コード step は実コード。プレースホルダなし。
- **Type consistency**: `Bucket`/`ParsedReservation`/`Activity` は Task1 定義をTask2-7で一貫使用。`reservationKey`/`dedupId`/`firstSeenAt`/`messageIds` の名称統一を確認。
