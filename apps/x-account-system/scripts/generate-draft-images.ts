/**
 * 記事 draft の outline から、ブロック別「一目で伝わる」画像を生成して attachments へ保存する。
 *
 * 使い方:
 *   npx tsx scripts/generate-draft-images.ts <draftId> [--dry-run]
 *
 * 注意:
 *   - slice 1 は fmat='article' のみ。thread は後続 slice。
 *   - --dry-run は OpenAI / Storage / DB update を呼ばない。
 *   - Supabase Storage bucket `xad-generated` は人間が事前作成する。
 */
import { Buffer } from "node:buffer";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { generateImages } from "../lib/visualizer/codex-image.ts";
import {
  GENERATED_IMAGE_BUCKET,
  GENERATED_IMAGE_COST_GATE_JPY,
  buildDraftImagePrompts,
  buildGeneratedPhotoAttachments,
  estimateDraftImageCostJpy,
  normalizeOutline,
  type GeneratedBlockImage,
} from "../lib/visualizer/draft-images.ts";

const ENV_FILE =
  process.env.XAD_ENV_FILE ??
  "/Users/rikukudo/Projects/private-agents/all-good-ops/apps/x-account-system/.env.local";

interface DraftRow {
  id: string;
  fmat: string | null;
  body: string | null;
  core_idea_id: string | null;
}

interface CoreIdeaRow {
  id: string;
  meta: Record<string, unknown> | null;
}

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

function createSupabaseClient(): SupabaseClient {
  loadEnv();
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が未設定です (.env.local を確認)");
  }
  return createClient(url, key, { db: { schema: "xad" as "public" } });
}

async function readDraftAndOutline(sb: SupabaseClient, draftId: string): Promise<{
  draft: DraftRow;
  outline: ReturnType<typeof normalizeOutline>;
}> {
  const { data: draft, error: draftErr } = await sb
    .from("post_drafts")
    .select("id, fmat, body, core_idea_id")
    .eq("id", draftId)
    .maybeSingle();
  if (draftErr) throw new Error(`[generate-draft-images] draft 取得失敗: ${draftErr.message}`);
  if (!draft) throw new Error(`[generate-draft-images] draft が見つかりません: ${draftId}`);

  const row = draft as DraftRow;
  if (!row.core_idea_id) {
    throw new Error(`[generate-draft-images] core_idea_id がありません: ${draftId}`);
  }

  const { data: coreIdea, error: coreErr } = await sb
    .from("core_ideas")
    .select("id, meta")
    .eq("id", row.core_idea_id)
    .maybeSingle();
  if (coreErr) throw new Error(`[generate-draft-images] core_ideas.meta 取得失敗: ${coreErr.message}`);
  if (!coreIdea) throw new Error(`[generate-draft-images] core_idea が見つかりません: ${row.core_idea_id}`);

  const meta = (coreIdea as CoreIdeaRow).meta ?? {};
  return { draft: row, outline: normalizeOutline(meta.outline) };
}

async function uploadGeneratedPng(
  sb: SupabaseClient,
  draftId: string,
  blockIndex: number,
  b64: string,
): Promise<string> {
  const storagePath = `${draftId}/${blockIndex}.png`;
  const bytes = Buffer.from(b64, "base64");
  const { error } = await sb.storage
    .from(GENERATED_IMAGE_BUCKET)
    .upload(storagePath, bytes, {
      contentType: "image/png",
      upsert: true,
    });
  if (error) {
    throw new Error(
      `[generate-draft-images] Storage upload 失敗 bucket=${GENERATED_IMAGE_BUCKET} path=${storagePath}: ` +
        `${error.message}。bucket '${GENERATED_IMAGE_BUCKET}' が無い場合は Supabase Storage に public bucket を作成してください。`,
    );
  }
  const { data } = sb.storage.from(GENERATED_IMAGE_BUCKET).getPublicUrl(storagePath);
  if (!data.publicUrl) {
    throw new Error(`[generate-draft-images] public URL 取得失敗: ${storagePath}`);
  }
  return data.publicUrl;
}

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const draftId = argv.find((a) => !a.startsWith("--"));
  const dryRun = argv.includes("--dry-run");
  if (!draftId) throw new Error("引数に draftId を渡してください");

  const sb = createSupabaseClient();
  const { draft, outline } = await readDraftAndOutline(sb, draftId);
  if (draft.fmat !== "article") {
    console.log(JSON.stringify({
      ok: true,
      draftId,
      notice: `slice 1 は fmat='article' のみ対象です（actual=${draft.fmat ?? "null"}）。処理せず終了します。`,
    }));
    return;
  }

  const prompts = buildDraftImagePrompts(outline);
  const costJpy = estimateDraftImageCostJpy(prompts.length);
  if (costJpy > GENERATED_IMAGE_COST_GATE_JPY) {
    console.error(JSON.stringify({
      ok: false,
      draftId,
      error: `画像生成の概算が ¥${costJpy} で上限 ¥${GENERATED_IMAGE_COST_GATE_JPY} を超えるため中止します。`,
      planned: prompts.length,
      costJpy,
    }));
    process.exitCode = 1;
    return;
  }

  if (dryRun) {
    for (const p of prompts) {
      console.log(`--- block ${p.blockIndex} ${p.role ? `(${p.role})` : ""} ---`);
      console.log(p.prompt);
    }
    console.log(JSON.stringify({
      ok: true,
      draftId,
      dryRun: true,
      planned: prompts.length,
      costJpy,
    }));
    return;
  }

  const generated: GeneratedBlockImage[] = [];
  for (const p of prompts) {
    console.error(JSON.stringify({
      level: "info",
      msg: "[generate-draft-images] generating",
      draftId,
      blockIndex: p.blockIndex,
      costJpy,
    }));
    const res = await generateImages({
      prompt: p.prompt,
      size: "1024x1024",
      count: 1,
      brand: "はぐりん",
    });
    const b64 = res.images[0]?.b64;
    if (!b64) {
      throw new Error(`[generate-draft-images] OpenAI response に b64 がありません blockIndex=${p.blockIndex}`);
    }
    const sourceUrl = await uploadGeneratedPng(sb, draftId, p.blockIndex, b64);
    generated.push({
      blockIndex: p.blockIndex,
      ...(p.role ? { role: p.role } : {}),
      sourceUrl,
      promptUsed: res.images[0]?.promptUsed ?? p.prompt,
    });
  }

  const attachments = buildGeneratedPhotoAttachments(generated);
  const { error: updateErr } = await sb
    .from("post_drafts")
    .update({ attachments })
    .eq("id", draftId);
  if (updateErr) throw new Error(`[generate-draft-images] attachments 更新失敗: ${updateErr.message}`);

  console.log(JSON.stringify({
    ok: true,
    draftId,
    generated: generated.length,
    costJpy,
    attachments,
  }));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((e) => {
    console.error(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
    process.exit(1);
  });
}
