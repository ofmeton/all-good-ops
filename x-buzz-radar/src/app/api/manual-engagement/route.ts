import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    post_id: string;
    hours_since_post: number;
    views?: number;
    paid_purchases?: number;
    likes?: number;
    comments?: number;
  };
  const sb = requireAdmin();

  const { data: post, error: pErr } = await sb
    .from("our_posts")
    .select("platform")
    .eq("post_id", body.post_id)
    .single();

  if (pErr || !post)
    return NextResponse.json({ error: "post not found" }, { status: 404 });

  const { error } = await sb.from("post_engagement_snapshots").insert({
    post_id: body.post_id,
    platform: post.platform,
    hours_since_post: body.hours_since_post,
    views: body.views ?? null,
    paid_purchases: body.paid_purchases ?? null,
    likes: body.likes ?? null,
    comments: body.comments ?? null,
    source: "manual_entry",
  });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
