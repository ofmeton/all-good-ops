import { defineHook } from "workflow";

import {
  buzzToDraft,
  contentReviewerAgent,
  snsGeneratorAgent,
  visualDesignerAgent,
  type Reviewed,
  type SnsContent,
} from "../lib/agents";
import { fetchTopBuzzSignal } from "../lib/buzz-source";
import {
  BudgetExceededError,
  KillSwitchError,
  checkBudgetOrAbort,
  recordKpi,
  todayIsoDate,
} from "../lib/budget";
import { notifyApprovalReady, notifyError } from "../lib/notify";
import {
  markPublished,
  persistPublishQueue,
  postX,
  publishInstagram,
} from "../lib/publishers";

export interface ApprovalDecision {
  approved: boolean;
  feedback?: {
    visual?: string;
    reviewer?: string;
    sns?: string;
    general?: string;
  };
  edits?: {
    title?: string;
    body?: string;
    snsTweet?: string;
  };
  decidedBy?: string;
}

export const approvalHook = defineHook<ApprovalDecision>();

export function approvalTokenForRun(runId: string): string {
  return `money-bot:approval:${runId}`;
}

export interface DailyPublishResult {
  runId: string;
  skipped: boolean;
  reason?: string;
  xUrl?: string;
  instagramUrl?: string;
}

/**
 * Phase 1.5 daily-publish workflow.
 *
 * 旧: ai-radar → writer → visual → reviewer → sns → approval → note/X/IG publish
 * 新: x-buzz-radar → (sns agent) buzzToDraft → visual → sns → reviewer → approval → X/IG publish
 *     (note 生成は一旦停止)
 */
export async function dailyPublishWorkflow(): Promise<DailyPublishResult> {
  "use workflow";

  const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  try {
    try {
      await checkBudgetOrAbort();
    } catch (err) {
      if (err instanceof BudgetExceededError || err instanceof KillSwitchError) {
        await notifyError(`workflow aborted: ${err.message}`, { runId });
        return { runId, skipped: true, reason: err.message };
      }
      throw err;
    }

    const buzz = await fetchTopBuzzSignal();
    const draftRes = await buzzToDraft(buzz);
    const visualsRes = await visualDesignerAgent(draftRes.output);
    const snsRes = await snsGeneratorAgent({ buzz, draft: draftRes.output });
    const reviewedRes = await contentReviewerAgent({
      draft: draftRes.output,
      visuals: visualsRes.output,
      sns: snsRes.output,
    });
    const reviewed: Reviewed = reviewedRes.output;
    const sns: SnsContent = snsRes.output;

    await persistPublishQueue({
      runId,
      reviewed,
      sns,
      status: "pending",
    });

    if (process.env.MONEY_BOT_RUBRIC_STRICT === "1" && !reviewed.approved) {
      return { runId, skipped: true, reason: "rubric_failed" };
    }

    await notifyApprovalReady({
      runId,
      approvalUrl: approvalUrlFor(runId),
      draftTitle: reviewed.draft.title,
    });

    const hook = approvalHook.create({ token: approvalTokenForRun(runId) });
    const approval = await hook;

    if (!approval.approved) {
      await markPublished({ runId, errorMessage: "rejected by user" });
      return { runId, skipped: true, reason: "user_rejected" };
    }

    const x = await postX({ runId, tweet: sns.tweet });
    const ig = await publishInstagram({
      carousel: sns.carousel,
      caption: reviewed.draft.title,
    });

    await markPublished({
      runId,
      xUrl: x.url,
      instagramUrl: ig.url,
    });

    const today = todayIsoDate();
    await recordKpi({ date: today, channel: "x", posts: 1, cost: 0 });
    await recordKpi({ date: today, channel: "instagram", posts: 1, cost: 0 });

    return {
      runId,
      skipped: false,
      xUrl: x.url,
      instagramUrl: ig.url,
    };
  } catch (err) {
    await notifyError("dailyPublishWorkflow failed", { runId, err: String(err) });
    throw err;
  }
}

function approvalUrlFor(runId: string): string {
  if (process.env.PUBLIC_BASE_URL) return `${process.env.PUBLIC_BASE_URL}/approval-queue/${runId}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}/approval-queue/${runId}`;
  return `http://localhost:3000/approval-queue/${runId}`;
}
