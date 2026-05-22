import { defineHook } from "workflow";

import {
  contentReviewerAgent,
  snsGeneratorAgent,
  visualDesignerAgent,
  writerAgent,
  type Reviewed,
  type SnsContent,
} from "../lib/agents";
import { fetchAiRadarSignals, selectTopic } from "../lib/ai-radar";
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
  publishNote,
} from "../lib/publishers";

export interface ApprovalDecision {
  approved: boolean;
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
  noteUrl?: string;
  xUrl?: string;
  instagramUrl?: string;
}

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

    const signals = await fetchAiRadarSignals();
    const topic = selectTopic(signals);

    const draftRes = await writerAgent(topic);
    const visualsRes = await visualDesignerAgent(draftRes.output);
    const reviewedRes = await contentReviewerAgent({
      draft: draftRes.output,
      visuals: visualsRes.output,
    });
    const reviewed: Reviewed = reviewedRes.output;

    const snsRes = await snsGeneratorAgent(reviewed);
    const sns: SnsContent = snsRes.output;

    await persistPublishQueue({
      runId,
      reviewed,
      sns,
      status: reviewed.approved ? "pending" : "rejected",
    });

    if (!reviewed.approved) {
      return { runId, skipped: true, reason: "rubric_failed" };
    }

    await notifyApprovalReady({
      runId,
      approvalUrl: approvalUrlFor(runId),
      draftTitle: reviewed.draft.title,
      thumbnailUrl: reviewed.visuals.headerImageUrl ?? undefined,
    });

    const hook = approvalHook.create({ token: approvalTokenForRun(runId) });
    const approval = await hook;

    if (!approval.approved) {
      await markPublished({ runId, errorMessage: "rejected by user" });
      return { runId, skipped: true, reason: "user_rejected" };
    }

    const finalReviewed = applyEdits(reviewed, approval.edits);
    const finalSns = applySnsEdits(sns, approval.edits);

    const note = await publishNote({ runId, reviewed: finalReviewed });
    const x = await postX({ runId, tweet: finalSns.tweet });
    const ig = await publishInstagram({
      carousel: finalSns.carousel,
      caption: finalReviewed.draft.title,
    });

    await markPublished({
      runId,
      noteUrl: note.url,
      xUrl: x.url,
      instagramUrl: ig.url,
    });

    const cost = costFromUsage([draftRes, visualsRes, reviewedRes, snsRes]);
    const today = todayIsoDate();
    await Promise.all([
      recordKpi({ date: today, channel: "note", posts: 1, cost: cost / 3 }),
      recordKpi({ date: today, channel: "x", posts: 1, cost: cost / 3 }),
      recordKpi({ date: today, channel: "instagram", posts: 1, cost: cost / 3 }),
    ]);

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

function applyEdits(
  reviewed: Reviewed,
  edits: ApprovalDecision["edits"],
): Reviewed {
  if (!edits) return reviewed;
  return {
    ...reviewed,
    draft: {
      ...reviewed.draft,
      ...(edits.title ? { title: edits.title } : {}),
      ...(edits.body ? { body: edits.body } : {}),
    },
  };
}

function applySnsEdits(
  sns: SnsContent,
  edits: ApprovalDecision["edits"],
): SnsContent {
  if (!edits?.snsTweet) return sns;
  return { ...sns, tweet: edits.snsTweet };
}

interface UsageBearing {
  usage?: { totalCostUsd?: number };
}

const USD_TO_JPY = 150;

function costFromUsage(results: UsageBearing[]): number {
  const usd = results.reduce((acc, r) => acc + (r.usage?.totalCostUsd ?? 0), 0);
  return Math.round(usd * USD_TO_JPY * 100) / 100;
}

function approvalUrlFor(runId: string): string {
  if (process.env.PUBLIC_BASE_URL) return `${process.env.PUBLIC_BASE_URL}/approval-queue/${runId}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}/approval-queue/${runId}`;
  return `http://localhost:3000/approval-queue/${runId}`;
}
