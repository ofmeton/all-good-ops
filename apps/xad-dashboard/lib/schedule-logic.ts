// schedule-logic.ts — スケジュール/スロット割当 UI(Team A) の純ロジック。
// DB/IO 非依存（vitest 対象）。型・JST フォーマット・候補スロット算出・予約バリデーション。
//
// 注: 予約割当の SSOT は Worker /admin/plan-slots（CLI と同じ slot-planner）。
// ここの PEAK 定数 / candidateSlotsForDate は UI のスロット手動編集アフォーダンスで、
// 最終的な scheduledFor は confirm 時に Worker の冪等ガード(scheduled_for IS NULL)を必ず通る。
import type { Attachment } from "./drafts-logic";

/** Worker /admin/plan-slots が返す 1 件のスロット割当。 */
export type PlanRow = { draftId: string; scheduledForISO: string };

/** 予約確定 1 件（mark-scheduled へ送る形）。 */
export type Reservation = { draftId: string; scheduledFor: string; scheduledPostId?: string };

/** 承認済みストック 1 件（post_drafts の表示に必要な列のみ）。 */
export interface ScheduleStock {
  id: string;
  body: string;
  fmat: string | null;
  human_approved_at: string | null;
  risk_level: string | null;
  risk_reasons: string[] | null;
  attachments: Attachment[] | null;
}

// ── ピーク帯（UI 候補用・schedule-config.ts と同値を複製）────────────────────
// 真の割当ロジックは Worker（SSOT）。ここは手動編集の候補提示のみに使う。
export const PEAK_HOURS_WEEKDAY = [7, 8, 12, 15, 17];
export const PEAK_HOURS_WEEKEND = [8, 12, 17];

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const WEEKDAY_JP = ["日", "月", "火", "水", "木", "金", "土"];

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** ISO(+09:00 等任意 TZ) を "06-09(火) 07:00" 形式の JST 表記に（CLI fmtJst 移植）。 */
export function fmtJst(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const shifted = new Date(d.getTime() + JST_OFFSET_MS);
  const mm = pad2(shifted.getUTCMonth() + 1);
  const dd = pad2(shifted.getUTCDate());
  const hh = pad2(shifted.getUTCHours());
  const wd = WEEKDAY_JP[shifted.getUTCDay()];
  return `${mm}-${dd}(${wd}) ${hh}:00`;
}

/** 任意 ISO を JST 日付 "YYYY-MM-DD" に正規化（null/不正は null）。 */
export function jstDateStr(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const s = new Date(d.getTime() + JST_OFFSET_MS);
  return `${s.getUTCFullYear()}-${pad2(s.getUTCMonth() + 1)}-${pad2(s.getUTCDate())}`;
}

/** nowMs から offsetDays 日後の JST 日付 "YYYY-MM-DD"。 */
export function jstDateAtOffset(nowMs: number, offsetDays: number): string {
  const s = new Date(nowMs + offsetDays * 86_400_000 + JST_OFFSET_MS);
  return `${s.getUTCFullYear()}-${pad2(s.getUTCMonth() + 1)}-${pad2(s.getUTCDate())}`;
}

/** "YYYY-MM-DD"(JST 日付) が週末か。 */
export function isWeekendJstDate(dateStr: string): boolean {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return false;
  const wd = new Date(Date.UTC(y, m - 1, d, 3, 0, 0)).getUTCDay(); // 正午 JST で判定
  return wd === 0 || wd === 6;
}

/** JST 日付+時(JST) → +09:00 ISO 文字列。 */
function jstSlotISO(dateStr: string, hour: number): string {
  return `${dateStr}T${pad2(hour)}:00:00+09:00`;
}

/** 任意 TZ の ISO を canonical な JST スロット ISO(分以下切り捨て)へ。 */
function canonicalSlot(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const s = new Date(d.getTime() + JST_OFFSET_MS);
  return jstSlotISO(
    `${s.getUTCFullYear()}-${pad2(s.getUTCMonth() + 1)}-${pad2(s.getUTCDate())}`,
    s.getUTCHours(),
  );
}

/**
 * 指定 JST 日付の「空きピーク帯スロット ISO」を返す（手動編集の候補）。
 *   - now 以前(<=now) のスロットは除外（X 公式予約は未来時刻のみ）
 *   - excludeISO（他 draft に割当済 / 既予約）と同一スロットは除外
 */
export function candidateSlotsForDate(
  dateStr: string,
  opts: { nowMs: number; excludeISO?: string[] },
): string[] {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return [];
  const peaks = isWeekendJstDate(dateStr) ? PEAK_HOURS_WEEKEND : PEAK_HOURS_WEEKDAY;
  const exclude = new Set<string>();
  for (const e of opts.excludeISO ?? []) {
    const c = canonicalSlot(e);
    if (c) exclude.add(c);
  }
  const out: string[] = [];
  for (const hour of peaks) {
    const slotMs = Date.UTC(y, m - 1, d, hour - 9, 0, 0);
    if (slotMs <= opts.nowMs) continue;
    const iso = jstSlotISO(dateStr, hour);
    if (exclude.has(iso)) continue;
    out.push(iso);
  }
  return out;
}

// ── 外部(Worker)出力の境界検証 ─────────────────────────────────────────────
/** Worker plan-slots の plan 配列を PlanRow[] へ（不正要素は捨てる）。 */
export function toPlanRows(raw: unknown): PlanRow[] {
  if (!Array.isArray(raw)) return [];
  const out: PlanRow[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    if (typeof o.draftId === "string" && typeof o.scheduledForISO === "string") {
      out.push({ draftId: o.draftId, scheduledForISO: o.scheduledForISO });
    }
  }
  return out;
}

// ── 予約バリデーション（confirm 境界）──────────────────────────────────────
export type ValidateReservationResult =
  | { ok: true; value: Reservation }
  | { ok: false; error: string };

/** 1 件の予約マークを検証。draftId 非空 / scheduledFor が parse 可能な日時。 */
export function validateReservation(raw: unknown): ValidateReservationResult {
  if (!raw || typeof raw !== "object") return { ok: false, error: "予約が不正です" };
  const o = raw as Record<string, unknown>;
  if (typeof o.draftId !== "string" || o.draftId.length === 0) {
    return { ok: false, error: "draftId が空です" };
  }
  if (typeof o.scheduledFor !== "string" || Number.isNaN(new Date(o.scheduledFor).getTime())) {
    return { ok: false, error: "scheduledFor が不正な日時です" };
  }
  const value: Reservation = { draftId: o.draftId, scheduledFor: o.scheduledFor };
  if (typeof o.scheduledPostId === "string" && o.scheduledPostId.length > 0) {
    value.scheduledPostId = o.scheduledPostId;
  }
  return { ok: true, value };
}

export type ValidateMarksResult =
  | { ok: true; value: Reservation[] }
  | { ok: false; error: string };

/** confirm の marks 配列を検証。各要素を validateReservation し、draftId/スロット重複を弾く。 */
export function validateMarks(raw: unknown): ValidateMarksResult {
  if (!Array.isArray(raw)) return { ok: false, error: "marks が配列ではありません" };
  const value: Reservation[] = [];
  const seenDraft = new Set<string>();
  const seenSlot = new Set<string>();
  for (let i = 0; i < raw.length; i++) {
    const v = validateReservation(raw[i]);
    if (!v.ok) return { ok: false, error: `marks[${i}]: ${v.error}` };
    if (seenDraft.has(v.value.draftId)) {
      return { ok: false, error: `draft が重複しています（${v.value.draftId}）` };
    }
    const slotKey = canonicalSlot(v.value.scheduledFor) ?? v.value.scheduledFor;
    if (seenSlot.has(slotKey)) {
      return { ok: false, error: `同一スロットに複数の予約があります（${fmtJst(v.value.scheduledFor)}）` };
    }
    seenDraft.add(v.value.draftId);
    seenSlot.add(slotKey);
    value.push(v.value);
  }
  return { ok: true, value };
}

/** 本文プレビュー（1 行化・n 字で切り詰め）。 */
export function preview(body: string, n = 80): string {
  const oneLine = (body ?? "").replace(/\s+/g, " ").trim();
  return oneLine.length > n ? `${oneLine.slice(0, n)}…` : oneLine;
}

/** 添付サマリ（写真枚数 + 本文 deep-link の動画有無）。 */
export function attachmentSummary(stock: Pick<ScheduleStock, "attachments" | "body">): string {
  const photos = Array.isArray(stock.attachments)
    ? stock.attachments.filter((a) => a?.mediaType === "photo").length
    : 0;
  const hasVideoLink = /\/video\/1\b/.test(stock.body ?? "");
  const parts: string[] = [];
  if (photos > 0) parts.push(`📎写真${photos}`);
  if (hasVideoLink) parts.push("🎬動画");
  return parts.join(" ");
}
