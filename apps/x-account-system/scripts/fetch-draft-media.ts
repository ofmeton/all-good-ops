/**
 * 写真添付 DL CLI（写真のみ）。x-scheduled-publish スキルが各 draft の投稿直前に呼ぶ。
 *
 * post_drafts.attachments（承認時に書かれた写真 upload intent）を読み、pbs.twimg.com から
 * 原寸 DL して os.tmpdir()/xad-media/<draftId>-<idx>.<ext> に保存。upload_file に渡す
 * localPaths と解決結果(resolved)を stdout に JSON で出す。DL 失敗は skipped 降格（本文のみ投稿）。
 *
 * 使い方:
 *   npx tsx scripts/fetch-draft-media.ts <draftId>
 *
 * 出力(stdout): { ok, draftId, uploaded, skipped, localPaths[], resolved[] }
 * .env.local の SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY を読む。
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { fetchDraftMedia, type PhotoAttachment } from "../lib/publishing/media-fetch.ts";

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

(async () => {
  loadEnv();
  const draftId = process.argv[2];
  if (!draftId) throw new Error("引数に draftId を渡してください");

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が未設定です (.env.local を確認)");
  }
  const sb = createClient(url, key, { db: { schema: "xad" as "public" } });

  const { data, error } = await sb
    .from("post_drafts")
    .select("attachments")
    .eq("id", draftId)
    .maybeSingle();
  if (error) throw new Error(`[fetch-draft-media] attachments 取得失敗: ${error.message}`);
  if (!data) throw new Error(`[fetch-draft-media] draft が見つかりません: ${draftId}`);

  const raw = (data as { attachments: unknown }).attachments;
  const attachments: PhotoAttachment[] = Array.isArray(raw) ? (raw as PhotoAttachment[]) : [];

  const result = await fetchDraftMedia(draftId, attachments);
  console.log(
    JSON.stringify({
      ok: true,
      draftId,
      uploaded: result.uploaded,
      skipped: result.skipped,
      localPaths: result.localPaths,
      resolved: result.resolved,
    }),
  );
})().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
  process.exit(1);
});
