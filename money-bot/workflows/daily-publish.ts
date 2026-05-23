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
    });

    const hook = approvalHook.create({ token: approvalTokenForRun(runId) });
    const approval = await hook;

    if (!approval.approved) {
      await markPublished({ runId, errorMessage: "rejected by user" });
      return { runId, skipped: true, reason: "user_rejected" };
    }

    const note = await publishNote({ runId, reviewed });
    const x = await postX({ runId, tweet: sns.tweet });
    const ig = await publishInstagram({
      carousel: sns.carousel,
      caption: reviewed.draft.title,
    });

    await markPublished({
      runId,
      noteUrl: note.url,
      xUrl: x.url,
      instagramUrl: ig.url,
    });

    const today = todayIsoDate();
    await recordKpi({ date: today, channel: "note", posts: 1, cost: 0 });
    await recordKpi({ date: today, channel: "x", posts: 1, cost: 0 });
    await recordKpi({ date: today, channel: "instagram", posts: 1, cost: 0 });

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

function approvalUrlFor(runId: string): string {
  if (process.env.PUBLIC_BASE_URL) return `${process.env.PUBLIC_BASE_URL}/approval-queue/${runId}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}/approval-queue/${runId}`;
  return `http://localhost:3000/approval-queue/${runId}`;
}
