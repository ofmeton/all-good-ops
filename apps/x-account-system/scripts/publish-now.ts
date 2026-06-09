/**
 * 「今すぐ手動投稿」ハンドオフ CLI（読み取り専用 / SELECT のみ）。
 *
 * 承認済みストック (post_drafts: human_approval_status='approved' AND scheduled_for IS NULL
 * AND published_at IS NULL) を取得し、chrome-devtools 半自動で **即時投稿**するための
 * ハンドオフ（本文＋メディア＋手順）を出力する。
 *
 * ★ポリシー（厳守）: X API は一切叩かない。実投稿は chrome-devtools 半自動（通常投稿コンポーザ・
 *   source=本人クライアント維持）。即時=scheduled_for は使わず、投稿完了後に published_at を確定する
 *   （published_at の write は dashboard /publish の「投稿済みにする」= markPublished が担う。本 CLI は
 *   read-only でハンドオフ提示のみ）。
 *
 * 使い方:
 *   npx tsx scripts/publish-now.ts            # 承認済みストック一覧（FIFO）を表示
 *   npx tsx scripts/publish-now.ts --id <id>  # 指定 draft の即時投稿ハンドオフを表示
 *
 * .env.local の SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY を読む。
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const ENV_FILE =
  process.env.XAD_ENV_FILE ??
  "/Users/rikukudo/Projects/private-agents/all-good-ops/apps/x-account-system/.env.local";

function loadEnv(): void {
  try {
    for (const line of readFileSync(ENV_FILE, "utf8").split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && process.env[m[1]] === undefined) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch (e) {
    if ((e as NodeJS.ErrnoException)?.code !== "ENOENT") throw e;
  }
}

function parseId(argv: string[]): string | undefined {
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--id" && typeof argv[i + 1] === "string") return argv[i + 1];
    if (a.startsWith("--id=")) return a.slice("--id=".length);
  }
  return undefined;
}

interface DraftRow {
  id: string;
  body: string;
  fmat: string | null;
  human_approved_at: string | null;
  risk_level: string | null;
  risk_reasons: string[] | null;
  attachments: { mediaType?: string; sourceUrl?: string }[] | null;
}

function photoCount(r: DraftRow): number {
  return Array.isArray(r.attachments)
    ? r.attachments.filter((a) => a?.mediaType === "photo").length
    : 0;
}

function hasVideoDeepLink(r: DraftRow): boolean {
  return /\/video\/1\b/.test(r.body ?? "");
}

/** 添付サマリ（人間ゲートの可視化）。 */
function mediaSummary(r: DraftRow): string {
  const parts: string[] = [];
  const photos = photoCount(r);
  if (photos > 0) parts.push(`📎写真${photos}`);
  if (hasVideoDeepLink(r)) parts.push("🎬動画(本文deep-link)");
  return parts.length > 0 ? ` ${parts.join(" ")}` : "";
}

const WEEKDAY_JP = ["日", "月", "火", "水", "木", "金", "土"];

function fmtJst(iso: string | null): string {
  if (!iso) return "(承認時刻不明)";
  const d = new Date(iso);
  const shifted = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const mm = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(shifted.getUTCDate()).padStart(2, "0");
  const hh = String(shifted.getUTCHours()).padStart(2, "0");
  const mi = String(shifted.getUTCMinutes()).padStart(2, "0");
  const wd = WEEKDAY_JP[shifted.getUTCDay()];
  return `${mm}-${dd}(${wd}) ${hh}:${mi}`;
}

function preview(body: string, n = 60): string {
  const oneLine = (body ?? "").replace(/\s+/g, " ").trim();
  return [...oneLine].length > n ? `${[...oneLine].slice(0, n).join("")}…` : oneLine;
}

(async () => {
  loadEnv();
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が未設定です (.env.local を確認)");
  }
  // 非 public schema は型上 "public" にキャスト（既存 scripts 規約に合わせる）
  const sb = createClient(url, key, { db: { schema: "xad" as "public" } });

  const targetId = parseId(process.argv.slice(2));

  // 承認済み・未予約・未公開ストックを承認順(FIFO)で取得
  let q = sb
    .from("post_drafts")
    .select("id, body, fmat, human_approved_at, risk_level, risk_reasons, attachments")
    .eq("human_approval_status", "approved")
    .is("scheduled_for", null)
    .is("published_at", null);
  if (targetId) q = q.eq("id", targetId);
  const { data, error } = await q
    .order("human_approved_at", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw new Error(`[publish-now] approved ストック取得失敗: ${error.message}`);
  const rows = (data ?? []) as DraftRow[];

  // ── 一覧モード（--id 無し）──
  if (!targetId) {
    const lines: string[] = [];
    lines.push(`# 今すぐ投稿できる承認済みストック（read-only）  在庫=${rows.length} 件`);
    if (rows.length === 0) {
      lines.push("（承認済み・未予約・未公開のストックが 0 件）");
    } else {
      lines.push("FIFO（承認順）。--id <id> で投稿ハンドオフを表示:");
      for (const r of rows) {
        lines.push(`  ${r.id}  承認:${fmtJst(r.human_approved_at)}  risk=${r.risk_level ?? "?"}${mediaSummary(r)}`);
        lines.push(`    ${preview(r.body)}`);
      }
    }
    console.log(lines.join("\n"));
    return;
  }

  // ── ハンドオフモード（--id あり）──
  if (rows.length === 0) {
    throw new Error(`[publish-now] 対象が承認済みストックにありません（公開済み/予約済み/不存在）: ${targetId}`);
  }
  const r = rows[0];
  const photos = Array.isArray(r.attachments)
    ? r.attachments.filter((a) => a?.mediaType === "photo")
    : [];

  const out: string[] = [];
  out.push(`# 今すぐ手動投稿ハンドオフ  draftId=${r.id}`);
  out.push(`  fmat=${r.fmat ?? "?"}  risk=${r.risk_level ?? "?"}${r.risk_reasons?.length ? ` [${r.risk_reasons.join(",")}]` : ""}`);
  out.push("");
  out.push("## 投稿本文（そのまま type_text で入力。動画/GIF の deep-link は本文内に含まれる）");
  out.push(r.body ?? "");
  out.push("");
  out.push("## メディア");
  if (photos.length > 0) {
    out.push(`  写真 ${photos.length} 枚（DL→ネイティブ添付）:`);
    out.push(`    cd apps/x-account-system && npx tsx scripts/fetch-draft-media.ts ${r.id}`);
  }
  if (hasVideoDeepLink(r)) {
    out.push("  動画/GIF: 本文の deep-link(/video/1) で展開。upload 不要・本文をそのまま投稿。");
  }
  if (photos.length === 0 && !hasVideoDeepLink(r)) {
    out.push("  （メディアなし・本文のみ）");
  }
  out.push("");
  out.push("## chrome 半自動 手順（即時投稿・予約UIは使わない・source=本人クライアント維持）");
  out.push("  1. new_page で https://x.com/compose/post を開く（通常コンポーザ）");
  out.push("  2. 写真がある場合は先に fetch-draft-media → upload_file でネイティブ添付");
  out.push("  3. 空 textbox「ポスト本文」に type_text で本文を入力（fill は不可・onChange 不発火）");
  out.push("  4. button「ポストする」で即時投稿（予約UIには入らない）");
  out.push("  5. 投稿後、一時ファイルを cleanup（fetch-draft-media の localPaths を rm）");
  out.push("");
  out.push("## 投稿完了後（published_at 確定）");
  out.push("  dashboard /publish の対象カードで「投稿済みにする」を押す（markPublished・冪等）。");
  out.push("  ※即時投稿のため scheduled_for は使わない。published_at のみ記録される。");
  console.log(out.join("\n"));
})().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
  process.exit(1);
});
