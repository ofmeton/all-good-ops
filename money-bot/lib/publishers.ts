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
  return data ? { id: data.id as string } : {};
}

export async function recordApprovalDecision(args: {
  runId: string;
  approved: boolean;
  edits?: Record<string, unknown> | null;
  decidedBy?: string;
}): Promise<void> {
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

export async function publishNote(_args: {
  runId: string;
  reviewed: Reviewed;
}): Promise<PublishResult> {
  return {
    url: `${publicBaseUrl()}/approval-queue/${_args.runId}#note`,
    status: "queued",
    channel: "note",
  };
}

export async function postX(_args: {
  runId: string;
  tweet: string;
}): Promise<PublishResult> {
  return {
    url: `${publicBaseUrl()}/approval-queue/${_args.runId}#x`,
    status: "queued",
    channel: "x",
  };
}

interface InstagramSlide {
  imageUrl: string;
  caption: string;
}

export async function publishInstagram(args: {
  carousel: SnsContent["carousel"];
  caption?: string;
}): Promise<PublishResult> {
  const accessToken = process.env.INSTAGRAM_GRAPH_API_TOKEN;
  const igUserId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

  if (!accessToken || !igUserId || args.carousel.length === 0) {
    return {
      url: `https://instagram.com/__mock__/${Date.now()}`,
      status: "mock",
      channel: "instagram",
    };
  }

  const slides: InstagramSlide[] = args.carousel
    .slice()
    .sort((a, b) => a.slideIndex - b.slideIndex)
    .map((s) => ({ imageUrl: s.imageUrl, caption: s.caption }));

  const childContainerIds = await Promise.all(
    slides.map((slide) =>
      graphPost(`/${igUserId}/media`, {
        image_url: slide.imageUrl,
        is_carousel_item: "true",
        access_token: accessToken,
      }).then((r) => String(r["id"] ?? "")),
    ),
  );

  const carouselContainer = await graphPost(`/${igUserId}/media`, {
    media_type: "CAROUSEL",
    children: childContainerIds.join(","),
    caption:
      args.caption ?? slides.map((s) => s.caption).join("\n\n").slice(0, 2000),
    access_token: accessToken,
  });

  const carouselId = String(carouselContainer["id"] ?? "");
  if (!carouselId) throw new Error("Graph API: missing carousel container id");

  const published = await graphPost(`/${igUserId}/media_publish`, {
    creation_id: carouselId,
    access_token: accessToken,
  });

  const publishedId = String(published["id"] ?? "");
  const igMedia = await graphGet(
    `/${publishedId}?fields=permalink&access_token=${accessToken}`,
  );
  const permalink =
    typeof igMedia["permalink"] === "string" ? (igMedia["permalink"] as string) : null;

  return {
    url: permalink ?? `https://instagram.com/p/${publishedId}`,
    status: "published",
    channel: "instagram",
  };
}

const GRAPH_BASE = "https://graph.facebook.com/v22.0";

async function graphPost(path: string, params: Record<string, string>): Promise<Record<string, unknown>> {
  const url = `${GRAPH_BASE}${path}`;
  const body = new URLSearchParams(params);
  const res = await fetch(url, {
    method: "POST",
    body,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Graph POST ${path} failed (${res.status}): ${text.slice(0, 400)}`);
  }
  return res.json() as Promise<Record<string, unknown>>;
}

async function graphGet(path: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${GRAPH_BASE}${path}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Graph GET ${path} failed (${res.status}): ${text.slice(0, 400)}`);
  }
  return res.json() as Promise<Record<string, unknown>>;
}

function publicBaseUrl(): string {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
