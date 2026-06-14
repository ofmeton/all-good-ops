/**
 * lib/curation/run-compose.ts — 執筆Ag(MA writer) 本体。
 *
 * queued 素材（人間選抜）→ MA writer がリサーチ付きで X 投稿ドラフト生成
 * → core_idea(inline) + post_draft(human_approval_status=pending)。
 * compose-stub.ts を置換。MA 駆動は lib/ma/run-session.ts。
 *
 * 冪等: materials_store.meta.compose_claimed_at で atomic claim（per-row conditional
 *   update）→ 成功で composed_at 付与・失敗で claim 解除。読取は
 *   selection_status='queued' AND composed_at IS NULL AND compose_claimed_at IS NULL。
 * 観測: run_trace.output に perMaterial 計測を返す（改善ループの計測基盤）。
 * DDL なし（core_idea_id NOT NULL は inline core_idea で満たす。enum 変更なし）。
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TraceMeta } from "../trace/types.js";
import { runMaSession } from "../ma/run-session.js";
import { getAgentRef as getAgentRefDefault, type AgentRef } from "../ma/agent-registry.js";
import { COMPOSE_CONFIG, type ComposeConfig } from "./compose-config.js";
import { buildComposeUserBlocks, COMPOSE_FMATS } from "./compose-prompts.js";
import { isKnownTemplate } from "./compose-templates.js";
import { joinThread, validateThreadParts, THREAD_MAX_PARTS } from "./thread.js";
import { classifyRules } from "../hook-classifier/classify-rules.js";
import { costUsdFor, costJpyFor } from "../cost/cost-of.js";
import { insertSessionEvents, recordRunSession } from "../trace/session-event-store.js";
import type { SessionEventInput } from "../trace/types.js";

/** 永続 writer agent の registry key（ma_agents.agent_key / x-writer.agent.yaml と一致）。 */
const WRITER_AGENT_KEY = "x-writer";

export interface RunComposeDeps {
  sb: SupabaseClient;
  apiKey?: string;
  config?: ComposeConfig;
  runId?: string;
  now?: () => number;
  onTrace?: (m: TraceMeta) => void;
  /** テスト注入用（既定 runMaSession）。実 API を叩かずに wiring を検証する。 */
  runSession?: typeof runMaSession;
  /** テスト注入用（既定 agent-registry.getAgentRef）。実 DB を叩かずに永続参照を解決する。 */
  getAgentRef?: (sb: SupabaseClient, key: string) => Promise<AgentRef>;
  logger?: { warn: (m: string) => void; info?: (m: string) => void };
}

export interface ComposePerMaterial {
  materialId: string;
  source_ref?: string;
  outcome: "ok" | "no_draft" | "timeout" | "terminated" | "error" | "idle" | "stub";
  primary_hook?: string;
  content_type?: string;
  citationCount?: number;
  costJpy?: number;
  draftId?: string;
  /** 永続 MA session の id（run_trace.output に載せ、後続 1B が writer↔投稿を相関する）。 */
  maSessionId?: string;
  /** 失敗理由（trace に残す。console だけにしない）。 */
  error?: string;
  /** MA session が stub で返ったか（本番では設定ミスのサイン）。 */
  stub?: boolean;
  /** fmat=thread だが tweets が不正/欠落で単一投稿(fmat='long')へ降格したか（安全側デフォルト）。 */
  threadFallback?: boolean;
}

export interface ComposeRunResult {
  processed: number;
  draftCount: number;
  errorCount: number;
  perMaterial: ComposePerMaterial[];
}

interface SubmitDraft {
  body: string;
  fmat: string;
  topic: string;
  category: string;
  primary_hook?: string;
  citations?: string[];
  /** 構成設計の成果物。各ツイート/ブロックの役割と、一目で伝えたい要点。 */
  outline?: Array<{ role: string; key_message: string; visual_hint?: string }>;
  /** fmat=thread のとき writer が1ツイートずつ入れる配列（投稿時の正・body は join 派生）。 */
  tweets?: string[];
}

interface MaterialRow {
  id: string;
  raw_text: string | null;
  redacted_text: string | null;
  source_ref: string | null;
  meta: Record<string, unknown> | null;
}

export async function runCompose(deps: RunComposeDeps): Promise<ComposeRunResult> {
  const cfg = deps.config ?? COMPOSE_CONFIG;
  const sb = deps.sb;
  const runSession = deps.runSession ?? runMaSession;
  const resolveAgentRef = deps.getAgentRef ?? getAgentRefDefault;
  const log = deps.logger ?? console;
  const nowIso = () => new Date(deps.now ? deps.now() : Date.now()).toISOString();
  const perMaterial: ComposePerMaterial[] = [];
  let draftCount = 0;
  let errorCount = 0;

  // 1. 候補読取: queued かつ未生成・未claim
  const { data: candidates, error: readErr } = await sb
    .from("materials_store")
    .select("id, raw_text, redacted_text, source_ref, meta")
    .eq("source_type", "x_inspirations")
    .eq("meta->>selection_status", "queued")
    .is("meta->>composed_at", null)
    .is("meta->>compose_claimed_at", null)
    .limit(cfg.maxComposePerRun);
  if (readErr) throw new Error(`[compose] read failed: ${readErr.message}`);

  const claimed: MaterialRow[] = [];
  for (const row of (candidates ?? []) as MaterialRow[]) {
    const meta = row.meta ?? {};
    // atomic claim: compose_claimed_at が null の行だけ更新（同時実行の二重生成防止）
    const { data: got, error: claimErr } = await sb
      .from("materials_store")
      .update({ meta: { ...meta, compose_claimed_at: nowIso() } })
      .eq("id", row.id)
      .is("meta->>compose_claimed_at", null)
      .select("id");
    if (claimErr) { log.warn(`[compose] claim failed (${row.id}): ${claimErr.message}`); continue; }
    if (got && got.length > 0) claimed.push(row);
  }

  // 2. 各素材を MA writer で執筆
  for (const m of claimed) {
    const baseMeta = m.meta ?? {};
    const text = (m.redacted_text || m.raw_text || "").slice(0, 4000);
    const tweetUrl = (baseMeta.tweet_url as string) ?? "";
    const scores = baseMeta.scores ? JSON.stringify(baseMeta.scores) : "";
    // 人間キュレーションUIで選択された希望フォーマット/テンプレ（未選択は null＝後方互換）。
    const desiredFmat = typeof baseMeta.desired_fmat === "string" ? baseMeta.desired_fmat : null;
    const templateId = typeof baseMeta.template_id === "string" ? baseMeta.template_id : null;
    // テンプレ drift 検知: 指定 id が registry に無ければ既定にフォールバックすることを可視化
    // （フロント TEMPLATE_OPTIONS とバックエンド registry のズレを黙って飲み込まない）。
    if (templateId && !isKnownTemplate(templateId)) {
      log.warn(`[compose] unknown template_id="${templateId}" for ${m.id} → default テンプレにフォールバック`);
    }
    // 差し戻し再生成: チェックAg が付けた前回の指摘があれば writer に渡し、同じ問題を繰り返させない。
    const lastFlags = Array.isArray(baseMeta.last_check_flags) ? (baseMeta.last_check_flags as string[]) : [];
    // 要件4（人間の修正依頼）: 承認UIで「指示文つき修正依頼」が出されると RPC が素材 meta に
    //   human_revision_note（指示文）/ previous_draft_body（前回ドラフト本文）を書く。あれば
    //   userMessage に「前回ドラフト＋指示・最優先で反映」ブロックを足す。**解釈は writer の判断**
    //   （code は前回本文と指示を渡す配管に徹する）。再生成後は通常 check→人間承認（人間ゲート不変）。
    const revisionNote = typeof baseMeta.human_revision_note === "string" ? baseMeta.human_revision_note.trim() : "";
    const previousDraftBody = typeof baseMeta.previous_draft_body === "string" ? baseMeta.previous_draft_body : "";
    const revisionBlock =
      revisionNote.length > 0
        ? `# 人間からの修正依頼（最優先で反映する）\n` +
          (previousDraftBody.length > 0
            ? `## 前回のドラフト\n${previousDraftBody}\n\n`
            : "") +
          `## 修正の指示\n${revisionNote}\n\n` +
          `上記の指示を最優先で反映して書き直してください。指示の解釈・どこをどう直すかはあなたの判断です。\n\n`
        : "";
    // テンプレ patch / 希望フォーマット / 前回の指摘は userMessage 側に組む
    // （永続 agent の system は固定。型・fmat・再生成は素材ごとに変わるため user で渡す）。
    const userMessage =
      `次の素材から X 投稿を1本書いてください。\n\n` +
      `# 素材本文\n${text}\n\n` +
      (tweetUrl ? `# 出典URL\n${tweetUrl}\n\n` : "") +
      (scores ? `# 参考スコア\n${scores}\n\n` : "") +
      revisionBlock +
      buildComposeUserBlocks(templateId ?? cfg.defaultTemplateId, desiredFmat, lastFlags) +
      `必要なら web_search で裏取りし、最後に submit_draft を呼んでください。`;

    // 永続 agent 参照を解決（miss=未 bootstrap は throw）。誤投稿防止: 解決不能なら
    // draft 化せず claim 解除して error 計上（bootstrap 後に再試行可）。
    let agentRef: AgentRef;
    try {
      agentRef = await resolveAgentRef(sb, WRITER_AGENT_KEY);
    } catch (e) {
      await releaseClaim(sb, m.id, baseMeta, log);
      errorCount++;
      perMaterial.push({ materialId: m.id, source_ref: m.source_ref ?? undefined, outcome: "error", error: String(e) });
      log.warn(`[compose] agent ref unresolved for ${m.id}: ${String(e)}`);
      continue;
    }

    let captured: SubmitDraft | undefined;
    const customToolHandler = (name: string, input: unknown): string => {
      if (name === "submit_draft") {
        captured = input as SubmitDraft;
        return "received";
      }
      return `No handler for tool "${name}".`;
    };

    const sessionEvents: SessionEventInput[] = [];
    let res;
    try {
      res = await runSession({
        apiKey: deps.apiKey,
        // 永続経路: 既存 agent/environment を再利用。system/tools は agent 側に焼かれている
        // ため session 起動時は渡さない（handler のみ host 側で注入）。
        agentRef: { id: agentRef.agentId, version: agentRef.version },
        environmentId: agentRef.environmentId,
        userMessage,
        customToolHandler,
        timeoutMs: cfg.timeoutMs,
        now: deps.now,
        onEvent: (e) => sessionEvents.push(e),
        // onTrace は runSession に委譲せず、cost-of で costJpy を載せて自前で発火する
        // （runMaSession の onTrace は tokens のみで costJpy を落とすため。queue 集約が
        //  cost_jpy/cost_ledger の単一ソースになるよう per-material で 1 回だけ通知）。
      });
    } catch (e) {
      res = { ok: false, terminal: "error" as const, error: String(e) } as Awaited<ReturnType<typeof runMaSession>>;
    }

    const inTok = (res.sessionUsage as { input_tokens?: number } | undefined)?.input_tokens ?? 0;
    const outTok = (res.sessionUsage as { output_tokens?: number } | undefined)?.output_tokens ?? 0;
    const costUsd = costUsdFor(cfg.writerModel, inTok, outTok);
    const costJpy = costJpyFor(cfg.writerModel, inTok, outTok);
    // trace/cost_ledger 用に costJpy を載せて通知（run_trace.cost_jpy の単一ソース）。
    deps.onTrace?.({ model: cfg.writerModel, tokensIn: inTok, tokensOut: outTok, costJpy });
    // 1B 観測: writer session のイベントと run→session ブリッジを永続化（fail-open）。
    if (res.ids?.session) {
      await insertSessionEvents(res.ids.session, "writer", sessionEvents);
      await recordRunSession({ runId: deps.runId ?? "", stageId: "compose", sessionId: res.ids.session, agentKey: "writer" });
    }

    // stub が返るのは本番では設定ミス（IN_MEMORY_FALLBACK 誤設定/キー欠落）。draft 化しない。
    if (res.stub) {
      await releaseClaim(sb, m.id, baseMeta, log);
      errorCount++;
      perMaterial.push({ materialId: m.id, source_ref: m.source_ref ?? undefined, outcome: "stub", stub: true });
      log.warn(`[compose] MA session returned stub for ${m.id} — IN_MEMORY_FALLBACK misconfig? skip draft.`);
      continue;
    }

    if (!res.ok || !captured?.body) {
      // 失敗: claim 解除（再試行可）、composed_at は付けない。理由を perMaterial に残す。
      await releaseClaim(sb, m.id, baseMeta, log);
      errorCount++;
      const outcome: ComposePerMaterial["outcome"] =
        !captured?.body && res.ok ? "no_draft" : ((res.terminal as ComposePerMaterial["outcome"]) ?? "error");
      perMaterial.push({ materialId: m.id, source_ref: m.source_ref ?? undefined, outcome, costJpy, error: res.error });
      log.warn(`[compose] no draft for ${m.id} outcome=${outcome}${res.error ? ` err=${res.error}` : ""}`);
      continue;
    }
    if (costJpy === 0) log.warn(`[compose] cost 0 for successful ${m.id} — sessionUsage missing?`);

    // 3. inline core_idea → post_draft（insert は非トランザクション。失敗時は core_idea を補償削除）
    let createdCoreIdeaId: string | undefined;
    try {
      const category = ["paraphrase", "first_hand", "industry_sop"].includes(captured.category)
        ? captured.category
        : "paraphrase";
      // fmat 決定: ユーザーの明示選択(desired)を最優先で永続化。無ければ writer 出力、最後に short。
      const validCaptured = (COMPOSE_FMATS as readonly string[]).includes(captured.fmat) ? captured.fmat : null;
      if (!validCaptured) {
        log.warn(`[compose] writer が未知 fmat="${captured.fmat}" を返した (${m.id}) → desired/short にフォールバック`);
      }
      const validDesired =
        desiredFmat && (COMPOSE_FMATS as readonly string[]).includes(desiredFmat) ? desiredFmat : null;
      if (validDesired && validCaptured && validDesired !== validCaptured) {
        log.warn(
          `[compose] writer fmat="${validCaptured}" がユーザー指定="${validDesired}" と不一致 (${m.id}) → 指定を永続化`,
        );
      }
      let fmat = validDesired ?? validCaptured ?? "short";

      // スレッド解決（要件7・決定1: thread_bodies が投稿時の正・body は join 派生）。
      //   fmat=thread かつ writer の tweets が有効（非空配列/各要素非空 string/本数上限 8）
      //   → thread_bodies=tweets / body=joinThread(tweets) で insert。
      //   不正/欠落 → **安全側デフォルト: 単一投稿として fmat='long' へ降格 + warn**
      //   （threadFallback=true を perMaterial に記録）。境界検証は thread.validateThreadParts に集約。
      let draftBody = captured.body;
      let threadBodies: string[] | null = null;
      let threadFallback = false;
      if (fmat === "thread") {
        const rawTweets = Array.isArray(captured.tweets) ? captured.tweets : null;
        // 各要素が非空 string か（trim 後）を境界検証（recommend.validateRecommendations 様式）。
        const cleaned =
          rawTweets && rawTweets.every((t) => typeof t === "string" && t.trim().length > 0)
            ? rawTweets.map((t) => t.trim())
            : null;
        const v = cleaned ? validateThreadParts(cleaned) : { ok: false, errors: ["tweets 欠落/不正"] };
        if (cleaned && v.ok) {
          threadBodies = cleaned;
          draftBody = joinThread(cleaned);
        } else {
          // 降格: スレッド不成立。単一投稿として long に落とし、body は writer の body を維持。
          fmat = "long";
          threadFallback = true;
          log.warn(
            `[compose] fmat=thread だが tweets 不正/欠落 (${m.id}) → 単一投稿 fmat='long' に降格 ` +
              `[${v.errors.join(" / ")}・本数上限${THREAD_MAX_PARTS}]`,
          );
        }
      }

      const { data: ci, error: ciErr } = await sb
        .from("core_ideas")
        .insert({
          title: captured.topic,
          topic: captured.topic,
          source_material_ids: [m.id],
          category,
          primary_hook: captured.primary_hook ?? null,
          fmat,
          status: "draft",
          meta: {
            citations: captured.citations ?? [],
            source_tweet_url: tweetUrl,
            generator: "ma-writer",
            outline: captured.outline ?? null,
          },
        })
        .select("id")
        .single();
      if (ciErr || !ci) throw new Error(`core_idea insert: ${ciErr?.message}`);
      createdCoreIdeaId = (ci as { id: string }).id;

      const draftId = crypto.randomUUID();
      const hook4 = classifyRules(draftBody).primary_hook;
      const { error: pdErr } = await sb.from("post_drafts").insert({
        id: draftId,
        trace_id: draftId,
        core_idea_id: createdCoreIdeaId,
        platform: "x",
        variant_index: 0,
        fmat,
        body: draftBody,
        // thread のとき thread_bodies=投稿時の正。単一投稿(null)は後方互換（migration 0027 で追加列）。
        ...(threadBodies ? { thread_bodies: threadBodies } : {}),
        primary_hook: hook4,
        editor_status: "pending",
        human_approval_status: "pending",
        scheduled_date: null,
        slot: `agent-${draftId.slice(0, 8)}`,
        writer_draft_id: `ma-${draftId.slice(0, 8)}`,
        cost_usd: costUsd,
        risk_level: "low",
        // 永続 writer session を draft に相関させる（後続 1B が読む。migration 0020 で追加列）。
        ...(res.ids?.session ? { writer_session_id: res.ids.session } : {}),
        ...(deps.runId ? { run_id: deps.runId } : {}),
      });
      if (pdErr) throw new Error(`post_draft insert: ${pdErr.message}`);

      // 4. 成功マーク。エラーは握り潰さず surface（draft は出来ているが material が
      //    composed_at 無し＝以降 compose_claimed_at 残留で読取対象外＝stuck になる）。
      const { error: markErr } = await sb
        .from("materials_store")
        .update({ meta: { ...baseMeta, compose_claimed_at: nowIso(), composed_at: nowIso() } })
        .eq("id", m.id);
      if (markErr) log.warn(`[compose] composed_at mark FAILED for ${m.id} (draft ${draftId} exists, material stuck): ${markErr.message}`);

      draftCount++;
      perMaterial.push({
        materialId: m.id, source_ref: m.source_ref ?? undefined, outcome: "ok",
        primary_hook: hook4, content_type: category,
        citationCount: captured.citations?.length ?? 0, costJpy, draftId,
        ...(res.ids?.session ? { maSessionId: res.ids.session } : {}),
        ...(threadFallback ? { threadFallback: true } : {}),
        ...(markErr ? { error: `composed_at mark failed: ${markErr.message}` } : {}),
      });
      log.info?.(`[compose] draft ${draftId} from ${m.id} hook=${hook4} costJpy=${costJpy}`);
    } catch (e) {
      // insert 失敗: 作成済み core_idea を補償削除（orphan 防止）→ claim 解除して再試行可能に
      if (createdCoreIdeaId) {
        const { error: delErr } = await sb.from("core_ideas").delete().eq("id", createdCoreIdeaId);
        if (delErr) log.warn(`[compose] orphan core_idea cleanup FAILED (${createdCoreIdeaId}): ${delErr.message}`);
      }
      await releaseClaim(sb, m.id, baseMeta, log);
      errorCount++;
      perMaterial.push({ materialId: m.id, source_ref: m.source_ref ?? undefined, outcome: "error", costJpy, error: String(e) });
      log.warn(`[compose] persist failed for ${m.id}: ${String(e)}`);
    }
  }

  return { processed: claimed.length, draftCount, errorCount, perMaterial };
}

async function releaseClaim(
  sb: SupabaseClient,
  id: string,
  baseMeta: Record<string, unknown>,
  log: { warn: (m: string) => void },
): Promise<void> {
  const next = { ...baseMeta };
  delete (next as Record<string, unknown>).compose_claimed_at;
  const { error } = await sb.from("materials_store").update({ meta: next }).eq("id", id);
  if (error) log.warn(`[compose] release claim failed (${id}): ${error.message}`);
}
