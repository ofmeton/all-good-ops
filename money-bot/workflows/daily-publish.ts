/**
 * daily-publish workflow — Vercel Workflow DevKit (WDK) durable workflow
 *
 * spec: docs/superpowers/specs/2026-05-22-money-bot-design.md §5.1
 *
 * 1日1回 cron (JST 14:00 = UTC 05:00) で起動する自律パイプライン。
 * 承認待ち中は durable に停止し課金されない (WDK の defineHook 特性)。
 *
 * 全体フロー:
 *   1. AI 動向シグナル収集 (ai-radar 連携 — 改修完了まで mock)
 *   2. トピック選定 (wiki/publishing/by-theme/ 紐づけ + 重複除外)
 *   3. writer subagent → draft
 *   4. visual-designer subagent → 図解 + ヘッダー画像
 *   5. content-reviewer subagent → 7軸 rubric
 *   6. sns-generator subagent → X + Instagram カルーセル
 *   7. 人間承認ゲート (LINE 通知 → approval URL → Y/N)
 *   8. publish (note: 半自動 / X: 半自動 / Instagram: 完全自動)
 *   9. KPI 記録 + Supabase 反映
 *
 * TODO(Phase 1): WDK の正確な API shape は context7 で再確認すること。
 *   現状の `defineHook` / `DurableAgent` / `sleep` の import path / 引数名は推測ベース。
 */

// TODO(Phase 1): npm install 後に有効化
// import { defineHook, sleep } from "workflow";
// import { DurableAgent } from "@workflow/ai/agent";

import {
  writerAgent,
  visualDesignerAgent,
  contentReviewerAgent,
  snsGeneratorAgent,
  type Reviewed,
  type SnsContent,
} from "../lib/agents";
import { notifyApprovalReady, notifyError } from "../lib/notify";
import { getSupabase } from "../lib/supabase";

// ---------------------------------------------------------------------------
// approval hook
// ---------------------------------------------------------------------------

export interface ApprovalDecision {
  approved: boolean;
  edits?: {
    title?: string;
    body?: string;
    snsTweet?: string;
  };
  decidedBy?: string;
}

// TODO(Phase 1): defineHook の正しい使い方を WDK ドキュメントで再確認
// const approvalHook = defineHook<ApprovalDecision>();
const approvalHook = {
  // pseudo: 実 SDK では create() で hook id を発行し await で待機する想定
  create(_opts: { metadata: { reviewed: Reviewed; sns: SnsContent; runId: string } }): Promise<ApprovalDecision> {
    return Promise.resolve({ approved: false, decidedBy: "__mock__" });
  },
};

// ---------------------------------------------------------------------------
// mock implementations (ai-radar 改修完了前 / 実 publish API 接続前)
// ---------------------------------------------------------------------------

interface AiRadarSignal {
  signalId: string;
  content: string;
  fetchedAt: string;
  relevanceScore?: number;
}

/**
 * spec §6.4: ai-radar 改修完了までは固定サンプルを返す。
 * 接続方式は α (direct Supabase read) or β (公開 API endpoint) のいずれかに確定後、差し替え。
 */
async function fetchAiRadarSignals(): Promise<AiRadarSignal[]> {
  // TODO(Phase 1 後半): ai-radar 改修完了通知後に実接続。
  //   候補 α: createClient(AI_RADAR_SUPABASE_URL, AI_RADAR_SUPABASE_ANON_KEY).from('signals').select(...)
  //   候補 β: fetch(`${AI_RADAR_API_ENDPOINT}/signals?since=24h`, { headers: { authorization: ... } })
  return [
    {
      signalId: "mock-signal-1",
      content: "Anthropic が Claude 4.7 をリリース。コンテキスト 1M tokens 対応。",
      fetchedAt: new Date().toISOString(),
      relevanceScore: 0.9,
    },
  ];
}

async function selectTopic(signals: AiRadarSignal[]): Promise<{
  slug: string;
  signals: AiRadarSignal[];
}> {
  // TODO(Phase 1): wiki/publishing/by-theme/ を走査して、過去30日に書いてないテーマを優先
  const head = signals[0];
  const slug = head
    ? head.content.slice(0, 24).replace(/[^a-zA-Z0-9-ぁ-んァ-ヶー一-龯]+/g, "-")
    : "untitled";
  return { slug, signals };
}

async function publishNote(reviewed: Reviewed): Promise<{ url: string }> {
  // Plan-B: Claude が下書きを note に保存し公開URL を発行 → 人間が30秒承認
  // TODO(Phase 1): note 公式 API は存在しないので、Playwright で下書き保存のみ自動化する案を検証。
  //   ブラウザ自動化はグレーゾーンのため、最初は「ドラフト全文を Supabase に保存 → 人間が手動で note にコピペ」案も併記候補。
  void reviewed;
  return { url: "https://note.com/ofmeton/n/__mock__" };
}

async function postX(_tweet: string): Promise<{ url: string }> {
  // Plan-B: tweet 本文 + 画像を LINE に送信 → 人間がポスト (30秒)
  // TODO(Phase 1): tweet 本文 + 画像を Supabase の publish_queue に保存し、LINE 通知に URL を含める
  return { url: "https://x.com/ofmeton/status/__mock__" };
}

async function publishInstagram(_carousel: SnsContent["carousel"]): Promise<{ url: string }> {
  // Instagram Graph API で完全自動。
  // TODO(Phase 1):
  //   1. 各 slide 画像を Supabase Storage 等にアップロードして public URL を取得
  //   2. POST /{ig-user-id}/media (image_url + is_carousel_item=true) を slide 数だけ呼ぶ
  //   3. POST /{ig-user-id}/media (media_type=CAROUSEL + children=[...]) で container 作成
  //   4. POST /{ig-user-id}/media_publish (creation_id=...) で公開
  return { url: "https://instagram.com/p/__mock__" };
}

async function recordKpi(_record: unknown): Promise<void> {
  // TODO(Phase 1): supabase.from('kpi_daily').upsert(...)
  void getSupabase();
}

async function recordSkip(_reviewed: Reviewed): Promise<void> {
  // TODO(Phase 1): publish_queue に status='rejected' で残す。次サイクルで学習材料に。
}

// ---------------------------------------------------------------------------
// budget guard
// ---------------------------------------------------------------------------

async function checkBudgetOrAbort(): Promise<void> {
  if (process.env.MONEY_BOT_KILL_SWITCH === "1") {
    throw new Error("kill switch is ON (MONEY_BOT_KILL_SWITCH=1)");
  }
  // TODO(Phase 1): 当月コスト集計 (Supabase kpi_daily.cost SUM) を取り、
  //   MONEY_BOT_MONTHLY_BUDGET_JPY を超えていたら throw して即停止。
}

// ---------------------------------------------------------------------------
// workflow entry
// ---------------------------------------------------------------------------

export interface DailyPublishResult {
  runId: string;
  skipped: boolean;
  noteUrl?: string;
  xUrl?: string;
  instagramUrl?: string;
}

export async function dailyPublishWorkflow(): Promise<DailyPublishResult> {
  // TODO(Phase 1): WDK directive
  // "use workflow";

  const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  try {
    await checkBudgetOrAbort();

    // Step 1-2: signal → topic
    const signals = await fetchAiRadarSignals();
    const topic = await selectTopic(signals);

    // Step 3-5: writer → visual-designer → content-reviewer
    const draftRes = await writerAgent(topic);
    const visualsRes = await visualDesignerAgent(draftRes.output);
    const reviewedRes = await contentReviewerAgent({
      draft: draftRes.output,
      visuals: visualsRes.output,
    });
    const reviewed = reviewedRes.output;

    if (!reviewed.approved) {
      // rubric で F 評価が出たら publish せず skip 記録
      await recordSkip(reviewed);
      return { runId, skipped: true };
    }

    // Step 6: SNS 生成
    const snsRes = await snsGeneratorAgent(reviewed);
    const sns = snsRes.output;

    // Step 7: 人間承認ゲート (Plan-B)
    await notifyApprovalReady({
      runId,
      approvalUrl: `${process.env.VERCEL_URL ?? "http://localhost:3000"}/approval-queue/${runId}`,
      draftTitle: reviewed.draft.title,
      thumbnailUrl: reviewed.visuals.headerImageUrl ?? undefined,
    });

    const approval = await approvalHook.create({
      metadata: { reviewed, sns, runId },
    });

    if (!approval.approved) {
      await recordSkip(reviewed);
      return { runId, skipped: true };
    }

    // Step 8: publish
    const note = await publishNote(reviewed);
    const x = await postX(sns.tweet);
    const ig = await publishInstagram(sns.carousel);

    // Step 9: KPI 記録
    await recordKpi({
      runId,
      publishedAt: new Date().toISOString(),
      urls: [note.url, x.url, ig.url],
    });

    return {
      runId,
      skipped: false,
      noteUrl: note.url,
      xUrl: x.url,
      instagramUrl: ig.url,
    };
  } catch (err) {
    await notifyError("dailyPublishWorkflow failed", { runId, err: String(err) });
    throw err;
  }
}

// ---------------------------------------------------------------------------
// cron entry (Vercel)
// ---------------------------------------------------------------------------

/**
 * /api/cron/daily-publish からこの関数を呼び出す想定。
 * vercel.json の crons[].path 参照。
 *
 * TODO(Phase 1): WDK の workflow trigger 流儀に書き直す。
 *   現状は単純な async 関数として書いてあるが、本番では durable workflow として trigger する。
 */
export async function handleDailyPublishCron(req: Request): Promise<Response> {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("unauthorized", { status: 401 });
  }
  const result = await dailyPublishWorkflow();
  return Response.json(result);
}
