import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase";
import { generateDraft } from "@/lib/enrichment/draft";
import type { Platform } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

interface Body {
  buzz_id: string;
  platforms: Platform[];
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Body;
  const sb = requireAdmin();

  const { data: tweet, error } = await sb
    .from("x_buzz_tweets")
    .select("*")
    .eq("id", body.buzz_id)
    .single();

  if (error || !tweet)
    return NextResponse.json({ error: "tweet not found" }, { status: 404 });
  if (!tweet.category)
    return NextResponse.json({ error: "no category" }, { status: 400 });

  const results: Array<{
    platform: Platform;
    draft_id: string;
    variant_id: string;
  }> = [];

  for (const platform of body.platforms) {
    try {
      const { draft, variant_id } = await generateDraft({
        platform,
        category: tweet.category,
        body: tweet.body,
        author: tweet.author_screen_name,
        likes: tweet.likes,
        retweets: tweet.retweets,
      });

      const { data: inserted, error: insErr } = await sb
        .from("enrichment_drafts")
        .insert({
          buzz_tweet_id: tweet.id,
          variant_id,
          platform,
          payload: draft,
        })
        .select("draft_id")
        .single();

      if (insErr) {
        console.warn("draft insert failed:", insErr);
        continue;
      }
      if (inserted)
        results.push({
          platform,
          draft_id: inserted.draft_id as string,
          variant_id,
        });
    } catch (err) {
      console.error(`generate ${platform} failed:`, err);
    }
  }

  return NextResponse.json({ generated: results });
}
