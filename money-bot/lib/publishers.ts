import { getSupabase, hasSupabase } from "./supabase";
import type { Reviewed, SnsContent } from "./agents";

export interface PublishResult {
  url: string;
  status: "published" | "queued" | "mock";
  channel: "note" | "x" | "instagram";
}

export async function persistPublishQueue(args: {
  runId: string;
  reviewed: Reviewed;
  sns: SnsContent;
  status: "pending" | "approved" | "rejected" | "published" | "failed";
}): Promise<{ id?: string }> {
  "use step";
  if (!hasSupabase()) {
    console.warn("[publishers] supabase not configured, skipping queue persist");
    return {};
  }
  const supabase = getSupabase();
  const row = {
    workflow_run_id: args.runId,
    draft: args.reviewed.draft,
    visuals: args.reviewed.visuals,
    sns_content: args.sns,
    status: args.status,
  };
  const { data, error } = await supabase
    .from("publish_queue")
    .upsert(row, { onConflict: "workflow_run_id" })
    .select("id")
    .maybeSingle();
  if (error) throw new Error(`publish_queue upsert failed: ${error.message}`);
  return data ? { id: data["id"] as string } : {};
}

export async function recordApprovalDecision(args: {
  runId: string;
  approved: boolean;
  edits?: Record<string, unknown> | null;
  decidedBy?: string;
}): Promise<void> {
  "use step";
  if (!hasSupabase()) return;
  const supabase = getSupabase();
  const { error } = await supabase.from("approvals").insert({
    run_id: args.runId,
    approved: args.approved,
    edits: args.edits ?? null,
    decided_by: args.decidedBy ?? null,
  });
  if (error) throw new Error(`approvals insert failed: ${error.message}`);

  const newStatus = args.approved ? "approved" : "rejected";
  const { error: upErr } = await supabase
    .from("publish_queue")
    .update({ status: newStatus })
    .eq("workflow_run_id", args.runId);
  if (upErr) throw new Error(`publish_queue status update failed: ${upErr.message}`);
}

export async function markPublished(args: {
  runId: string;
  noteUrl?: string;
  xUrl?: string;
  instagramUrl?: string;
  errorMessage?: string;
}): Promise<void> {
  "use step";
  if (!hasSupabase()) return;
  const supabase = getSupabase();
  const patch: Record<string, unknown> = {
    status: args.errorMessage ? "failed" : "published",
  };
  if (args.noteUrl) patch["note_url"] = args.noteUrl;
  if (args.xUrl) patch["x_url"] = args.xUrl;
  if (args.instagramUrl) patch["instagram_url"] = args.instagramUrl;
  if (args.errorMessage) patch["error_message"] = args.errorMessage;
  const { error } = await supabase
    .from("publish_queue")
    .update(patch)
    .eq("workflow_run_id", args.runId);
  if (error) throw new Error(`publish_queue mark failed: ${error.message}`);
}

export async function publishNote(args: {
  runId: string;
  reviewed: Reviewed;
}): Promise<PublishResult> {
  "use step";
  void args.reviewed;
  return {
    url: `${publicBaseUrl()}/approval-queue/${args.runId}#note`,
    status: "queued",
    channel: "note",
  };
}

export async function postX(args: {
  runId: string;
  tweet: string;
}): Promise<PublishResult> {
  "use step";
  void args.tweet;
  return {
    url: `${publicBaseUrl()}/approval-queue/${args.runId}#x`,
    status: "queued",
    channel: "x",
  };
}

export async function publishInstagram(args: {
  carousel: SnsContent["carousel"];
  caption?: string;
}): Promise<PublishResult> {
  "use step";
  const accessToken = process.env.INSTAGRAM_GRAPH_API_TOKEN;
  const igUserId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

  if (!accessToken || !igUserId || args.carousel.length === 0) {
    return {
      url: `https://instagram.com/__mock__/${Date.now()}`,
      status: "mock",
      channel: "instagram",
    };
  }

  void args.caption;
  return {
    url: `https://instagram.com/__phase1_pending__/${Date.now()}`,
    status: "mock",
    channel: "instagram",
  };
}

function publicBaseUrl(): string {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
