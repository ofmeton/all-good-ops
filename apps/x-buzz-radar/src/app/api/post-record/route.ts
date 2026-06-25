import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    draft_id: string;
    post_id: string;
    post_url: string;
    platform: string;
    is_paid?: boolean;
  };
  const sb = requireAdmin();

  const { data: draft, error: dErr } = await sb
    .from("enrichment_drafts")
    .select("buzz_tweet_id, variant_id")
    .eq("draft_id", body.draft_id)
    .single();

  if (dErr || !draft)
    return NextResponse.json({ error: "draft not found" }, { status: 404 });

  const { error } = await sb.from("our_posts").insert({
    post_id: body.post_id,
    source_buzz_tweet_id: draft.buzz_tweet_id,
    variant_id: draft.variant_id,
    platform: body.platform,
    post_url: body.post_url,
    posted_at: new Date().toISOString(),
    is_paid: body.is_paid ?? false,
  });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
