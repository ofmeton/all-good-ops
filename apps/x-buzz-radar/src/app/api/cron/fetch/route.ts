import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase";
import { searchTwitterApi } from "@/lib/fetchers/twitterapi";
import { judgeRelevance } from "@/lib/enrichment/relevance";
import { extractPattern } from "@/lib/enrichment/pattern";
import { notifyLine } from "@/lib/notify/line";
import type { Category } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  if (
    req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const sb = requireAdmin();

  const { data: queries, error: qErr } = await sb
    .from("query_pool")
    .select("query_id, query_string, total_hits")
    .eq("active", true);

  if (qErr) {
    return NextResponse.json({ error: qErr.message }, { status: 500 });
  }
  if (!queries || queries.length === 0)
    return NextResponse.json({ processed: 0, queries: 0 });

  const { data: cfgRows } = await sb.from("config").select("key, value");
  const cfgMap = Object.fromEntries((cfgRows ?? []).map((r) => [r.key, r.value]));
  const perQueryLimit = (cfgMap["per_query_limit"] as { value: number })?.value ?? 50;
  const adoptionThreshold = (cfgMap["adoption_threshold"] as { value: number })?.value ?? 60;
  const notifyThreshold = (cfgMap["notify_threshold"] as { value: number })?.value ?? 80;

  let totalFetched = 0;
  let totalInserted = 0;
  let totalNotified = 0;

  for (const q of queries) {
    try {
      const tweets = await searchTwitterApi({
        query: q.query_string,
        limit: perQueryLimit,
      });
      totalFetched += tweets.length;

      for (const t of tweets) {
        // dedup
        const { data: existing } = await sb
          .from("x_buzz_tweets")
          .select("id")
          .eq("tweet_id", t.tweet_id)
          .maybeSingle();

        if (existing) continue;

        // relevance + pattern (errors degrade gracefully)
        let relScore: number | null = null;
        let relReason: string | null = null;
        let relCategory: Category | null = null;
        try {
          const r = await judgeRelevance({
            body: t.body,
            author: t.author_screen_name,
          });
          relScore = r.score;
          relReason = r.reason;
          relCategory = r.category;
        } catch (err) {
          console.warn("relevance failed:", err);
        }

        let buzzPattern: string | null = null;
        let hookStructure: string | null = null;
        let visualHint: string | null = null;
        if (relScore !== null && relScore >= 40 && relCategory) {
          try {
            const p = await extractPattern({
              body: t.body,
              category: relCategory,
            });
            buzzPattern = p.buzz_pattern;
            hookStructure = p.hook_structure;
            visualHint = p.visual_hint;
          } catch (err) {
            console.warn("pattern failed:", err);
          }
        }

        const status =
          relScore !== null && relScore >= adoptionThreshold
            ? "pending_review"
            : "archived";

        const { error: insErr } = await sb.from("x_buzz_tweets").insert({
          tweet_id: t.tweet_id,
          author_screen_name: t.author_screen_name,
          author_id: t.author_id,
          body: t.body,
          lang: t.lang,
          posted_at: t.posted_at,
          likes: t.likes,
          retweets: t.retweets,
          replies: t.replies,
          source_query_id: q.query_id,
          category: relCategory,
          claude_relevance: relScore,
          buzz_pattern: buzzPattern,
          hook_structure: hookStructure,
          visual_hint: visualHint,
          status,
        });

        if (insErr) {
          console.warn("insert error:", insErr.message);
          continue;
        }
        totalInserted++;

        // LINE notify for high-relevance
        if (relScore !== null && relScore >= notifyThreshold) {
          const ok = await notifyLine(
            `🔥 high-relevance buzz (${relScore}/100)\n@${t.author_screen_name}\n${t.body.slice(0, 100)}\nhttps://twitter.com/${t.author_screen_name}/status/${t.tweet_id}`,
          );
          if (ok) totalNotified++;
        }
      }

      // update query_pool stats
      await sb
        .from("query_pool")
        .update({ total_hits: (q.total_hits ?? 0) + tweets.length })
        .eq("query_id", q.query_id);
    } catch (err) {
      console.error(`query ${q.query_id} failed:`, err);
    }
  }

  return NextResponse.json({
    totalFetched,
    totalInserted,
    totalNotified,
    queries: queries.length,
  });
}
