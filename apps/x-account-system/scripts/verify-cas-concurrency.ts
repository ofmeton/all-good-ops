/**
 * verify-cas-concurrency.ts — compose claim / check CAS の実 Supabase 並行検証（使い捨て・再現可）。
 *
 * 目的: 本番有効化の前提として「同時に2ラン走っても二重生成/二重通知しない」ことを
 * 実 xad（in-memory mock ではなく本物の Postgres）で確認する。MA は **stub**（writer/checker を
 * deps.runSession で差し替え）＝実コスト・実LINEなし。claim/CAS の atomic 性だけを実 DB で検証。
 *
 * 使い方:
 *   cd apps/x-account-system
 *   npx tsx scripts/verify-cas-concurrency.ts
 *
 * 何をするか:
 *   1. マーカー付き（meta.cas_test_tag=<tag>）テスト material を K 件 insert（selection_status='queued'）。
 *   2. compose: runCompose を2本 Promise.all → 各 material が **ちょうど1回** だけ生成されたか assert
 *      （draftCount 合計=K / composed_at 付き=K / core_ideas=K / post_drafts=K、重複なし）。
 *   3. check : 生成された pending draft に runCheck を2本 Promise.all（checker stub=ok verdict・
 *      pushApproval は no-op で呼出回数を計数・fetchRecent=[]）→ 各 draft が **ちょうど1回** approve され
 *      pushApproval が **draft ごと1回**（合計K回・2K回でない）か assert。
 *   4. finally でマーカー行のみ後始末（truncate 厳禁＝.env.local は本番を指す。tag 以外は触らない）。
 *
 * 出力: 各チェックの PASS/FAIL と最終 VERDICT。
 */
import { readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { runCompose } from "../lib/curation/run-compose.ts";
import { COMPOSE_CONFIG } from "../lib/curation/compose-config.ts";
import { runCheck } from "../lib/check/run-check.ts";

const ENV_FILE =
  process.env.XAD_ENV_FILE ??
  "/Users/rikukudo/Projects/private-agents/all-good-ops/apps/x-account-system/.env.local";
const K = 4; // テスト material 件数
const TAG = `cas-${new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14)}-${Math.floor(
  (Date.now() % 1_000_000),
)}`;

function loadEnv(): void {
  try {
    for (const line of readFileSync(ENV_FILE, "utf8").split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch (e) {
    if ((e as NodeJS.ErrnoException)?.code !== "ENOENT") throw e;
  }
}

const results: { name: string; ok: boolean; detail: string }[] = [];
function check(name: string, ok: boolean, detail: string): void {
  results.push({ name, ok, detail });
  console.log(`  ${ok ? "✅ PASS" : "❌ FAIL"}  ${name} — ${detail}`);
}

/** compose 用 stub: submit_draft を発火して ok（stub:true は付けない＝insert 経路へ進む）。 */
function makeWriterStub(idx: { n: number }) {
  return (async (deps: { customToolHandler?: (name: string, input: unknown) => string | Promise<string> }) => {
    const i = idx.n++;
    if (deps.customToolHandler) {
      await deps.customToolHandler("submit_draft", {
        body: `__CAS_TEST__ 並行検証ドラフト #${i} ${TAG}`,
        fmat: "short",
        topic: `cas-test-${i}`,
        category: "paraphrase",
        primary_hook: "insight",
        citations: [],
      });
    }
    return {
      ok: true,
      terminal: "idle" as const,
      stopReason: "end_turn",
      sessionUsage: { input_tokens: 100, output_tokens: 50 },
      modelUsage: { input_tokens: 100, output_tokens: 50 },
    };
  }) as never;
}

/** check 用 stub: submit_check を ok verdict で発火。 */
const checkerStub = (async (deps: { customToolHandler?: (name: string, input: unknown) => string | Promise<string> }) => {
  if (deps.customToolHandler) {
    await deps.customToolHandler("submit_check", {
      verdict: "ok",
      risk_level: "low",
      duplicate: "ok",
      factcheck: "ok",
      flags: [],
    });
  }
  return {
    ok: true,
    terminal: "idle" as const,
    stopReason: "end_turn",
    sessionUsage: { input_tokens: 80, output_tokens: 20 },
    modelUsage: { input_tokens: 80, output_tokens: 20 },
  };
}) as never;

async function main(): Promise<void> {
  loadEnv();
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 未設定 (.env.local 確認)");
  const sb = createClient(url, key, { db: { schema: "xad" as "public" } }) as SupabaseClient;

  console.log(`# CAS 並行検証  tag=${TAG}  K=${K}  schema=xad（本番）`);

  let materialIds: string[] = [];
  try {
    // --- seed: マーカー付き material を K 件 ---
    const seedRows = Array.from({ length: K }, (_, i) => ({
      source_type: "x_inspirations",
      source_ref: `cas-test-${TAG}-${i}`,
      raw_text: `__CAS_TEST__ 素材本文 #${i} ${TAG}`,
      redacted_text: `__CAS_TEST__ 素材本文 #${i} ${TAG}`,
      meta: { selection_status: "queued", cas_test: true, cas_test_tag: TAG },
    }));
    const { data: seeded, error: seedErr } = await sb
      .from("materials_store")
      .insert(seedRows)
      .select("id");
    if (seedErr) throw new Error(`seed insert failed: ${seedErr.message}`);
    materialIds = (seeded ?? []).map((r) => (r as { id: string }).id);
    check("seed", materialIds.length === K, `material ${materialIds.length}/${K} 件 insert`);

    // --- Phase A: compose claim 並行 ---
    const cfg = { ...COMPOSE_CONFIG, maxComposePerRun: 50 };
    const composeCommon = { sb, apiKey: "stub-no-call", config: cfg, logger: { warn: () => {}, info: () => {} } };
    const [ra, rb] = await Promise.all([
      runCompose({ ...composeCommon, runSession: makeWriterStub({ n: 0 }) }),
      runCompose({ ...composeCommon, runSession: makeWriterStub({ n: 100 }) }),
    ]);
    const totalDrafts = ra.draftCount + rb.draftCount;
    const totalProcessed = ra.processed + rb.processed;
    check("compose: claim 排他", totalProcessed === K, `claim 合計=${totalProcessed}（A=${ra.processed}/B=${rb.processed}）期待 ${K}（二重 claim なし）`);
    check("compose: 生成総数", totalDrafts === K, `draftCount 合計=${totalDrafts} 期待 ${K}（二重生成なし）`);

    // composed_at 付き material / core_ideas / post_drafts の重複を実DBで確認
    const { data: composedMats } = await sb
      .from("materials_store")
      .select("id, meta")
      .in("id", materialIds)
      .not("meta->>composed_at", "is", null);
    check("compose: composed_at", (composedMats ?? []).length === K, `composed_at 付き material=${(composedMats ?? []).length}/${K}`);

    const { data: cores } = await sb
      .from("core_ideas")
      .select("id")
      .overlaps("source_material_ids", materialIds);
    const coreIds = (cores ?? []).map((r) => (r as { id: string }).id);
    check("compose: core_ideas 重複なし", coreIds.length === K, `core_ideas=${coreIds.length} 期待 ${K}`);

    const { data: draftsA } = await sb.from("post_drafts").select("id, editor_status, core_idea_id").in("core_idea_id", coreIds);
    const draftIds = (draftsA ?? []).map((r) => (r as { id: string }).id);
    check("compose: post_drafts 重複なし", draftIds.length === K, `post_drafts=${draftIds.length} 期待 ${K}`);

    // --- Phase B: check CAS 並行 ---
    const pushCounts = new Map<string, number>();
    const pushApproval = (async (_env: unknown, draftId: string) => {
      pushCounts.set(draftId, (pushCounts.get(draftId) ?? 0) + 1);
    }) as never;
    const fetchRecent = (async () => []) as never;
    const checkCommon = {
      env: {} as never,
      sb,
      apiKey: "stub-no-call",
      runSession: checkerStub,
      pushApproval,
      fetchRecent,
      logger: { warn: () => {}, info: () => {} },
    };
    const [ca, cb] = await Promise.all([runCheck({ ...checkCommon }), runCheck({ ...checkCommon })]);
    const totalChecked = ca.checked + cb.checked;
    const totalApproved = ca.approved + cb.approved;
    check("check: 点検総数", totalChecked === K, `checked 合計=${totalChecked}（A=${ca.checked}/B=${cb.checked}）期待 ${K}（二重点検なし）`);
    check("check: approve 総数", totalApproved === K, `approved 合計=${totalApproved} 期待 ${K}`);

    const pushTotal = [...pushCounts.values()].reduce((a, b) => a + b, 0);
    const anyDouble = [...pushCounts.values()].some((v) => v > 1);
    check("check: pushApproval は draft ごと1回", pushTotal === K && !anyDouble, `push 合計=${pushTotal} 期待 ${K} / 二重通知 draft=${anyDouble ? "あり" : "なし"}`);

    const { data: approvedDrafts } = await sb.from("post_drafts").select("id, editor_status").in("id", draftIds);
    const allApproved = (approvedDrafts ?? []).every((r) => (r as { editor_status: string }).editor_status === "approved");
    check("check: 全 draft が approved", allApproved && (approvedDrafts ?? []).length === K, `approved=${(approvedDrafts ?? []).filter((r) => (r as { editor_status: string }).editor_status === "approved").length}/${K}`);
  } finally {
    // --- 後始末: マーカー行のみ削除（tag scope。post_drafts→core_ideas→materials_store の順） ---
    try {
      const delErrs: string[] = [];
      const { data: mats } = await sb.from("materials_store").select("id").eq("meta->>cas_test_tag", TAG);
      const mids = (mats ?? []).map((r) => (r as { id: string }).id);
      let cids: string[] = [];
      if (mids.length > 0) {
        const { data: cores } = await sb.from("core_ideas").select("id").overlaps("source_material_ids", mids);
        cids = (cores ?? []).map((r) => (r as { id: string }).id);
        if (cids.length > 0) {
          const { error: pdDel } = await sb.from("post_drafts").delete().in("core_idea_id", cids);
          if (pdDel) delErrs.push(`post_drafts: ${pdDel.message}`);
          const { error: ciDel } = await sb.from("core_ideas").delete().in("id", cids);
          if (ciDel) delErrs.push(`core_ideas: ${ciDel.message}`);
        }
        const { error: msDel } = await sb.from("materials_store").delete().in("id", mids);
        if (msDel) delErrs.push(`materials_store: ${msDel.message}`);
      }
      // 残骸検査は3テーブル全て（child delete 失敗で orphan が本番に残るのを見逃さない）。
      const { data: resMat } = await sb.from("materials_store").select("id").eq("meta->>cas_test_tag", TAG);
      const { data: resCore } = cids.length > 0 ? await sb.from("core_ideas").select("id").in("id", cids) : { data: [] };
      const { data: resDraft } = cids.length > 0 ? await sb.from("post_drafts").select("id").in("core_idea_id", cids) : { data: [] };
      const residueTotal = (resMat ?? []).length + (resCore ?? []).length + (resDraft ?? []).length;
      check(
        "cleanup: 残骸 0",
        residueTotal === 0 && delErrs.length === 0,
        `tag=${TAG} 残 material=${(resMat ?? []).length}/core_ideas=${(resCore ?? []).length}/post_drafts=${(resDraft ?? []).length}${delErrs.length ? ` delete失敗=[${delErrs.join("; ")}]` : ""}`,
      );
    } catch (e) {
      check("cleanup: 残骸 0", false, `後始末でエラー: ${String(e)}（要手動削除 tag=${TAG}）`);
    }
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n=== VERDICT: ${failed.length === 0 ? "✅ ALL PASS" : `❌ ${failed.length} FAIL`} (${results.length} checks) ===`);
  if (failed.length > 0) process.exit(1);
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e), tag: TAG }));
  process.exit(1);
});
