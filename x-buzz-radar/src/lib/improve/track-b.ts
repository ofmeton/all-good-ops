import { requireAdmin } from "@/lib/supabase";
import { callJson, SONNET } from "@/lib/anthropic";
import type { Platform } from "@/lib/types";

interface EngagementSnap {
  likes?: number | null;
  retweets?: number | null;
  impressions?: number | null;
  saves?: number | null;
  reach?: number | null;
  comments?: number | null;
  views?: number | null;
}

interface TrackBOutput {
  insights: string;
  new_variants: Array<{
    platform: string;
    hook_template: string;
    tone: string;
    format: string;
  }>;
  retire_variants: Array<{ variant_id: string; reason: string }>;
}

function zScore(arr: number[]): number[] {
  if (arr.length === 0) return [];
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length;
  const std = Math.sqrt(variance) || 1;
  return arr.map((v) => (v - mean) / std);
}

function platformEngagement(snap: EngagementSnap, platform: Platform): number {
  if (platform === "x")
    return (snap.likes ?? 0) + (snap.retweets ?? 0) * 5 + (snap.impressions ?? 0) * 0.01;
  if (platform === "instagram")
    return (snap.likes ?? 0) + (snap.saves ?? 0) * 3 + (snap.reach ?? 0) * 0.02;
  // note
  return (snap.likes ?? 0) + (snap.comments ?? 0) * 5 + (snap.views ?? 0) * 0.01;
}

export async function runTrackB(): Promise<{
  updated: number;
  proposals: TrackBOutput | { message: string };
}> {
  const sb = requireAdmin();
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();

  const { data: posts } = await sb
    .from("our_posts")
    .select(
      "post_id, platform, variant_id, source_buzz_tweet_id, posted_at, buzz:x_buzz_tweets(category)",
    )
    .gte("posted_at", since);

  if (!posts || posts.length === 0) {
    return { updated: 0, proposals: { message: "no data" } };
  }

  // get latest snapshot per post
  const snapshotsByPost = new Map<string, EngagementSnap>();
  for (const p of posts) {
    const { data } = await sb
      .from("post_engagement_snapshots")
      .select("likes, retweets, impressions, saves, reach, comments, views")
      .eq("post_id", p.post_id)
      .order("hours_since_post", { ascending: false })
      .limit(1);
    if (data && data[0]) snapshotsByPost.set(p.post_id as string, data[0]);
  }

  let updated = 0;
  for (const platform of ["x", "instagram", "note"] as Platform[]) {
    const platformPosts = posts.filter((p) => p.platform === platform);
    if (platformPosts.length === 0) continue;

    const engagements = platformPosts.map((p) => {
      const snap = snapshotsByPost.get(p.post_id as string);
      return snap ? platformEngagement(snap, platform) : 0;
    });
    const z = zScore(engagements);

    for (let i = 0; i < platformPosts.length; i++) {
      const p = platformPosts[i];
      const cat = (p.buzz as { category?: string } | null)?.category;
      if (!cat || !p.variant_id) continue;
      const zVal = z[i] ?? 0;

      const { data: existing } = await sb
        .from("variant_weights")
        .select("*")
        .eq("platform", platform)
        .eq("category", cat)
        .eq("variant_id", p.variant_id)
        .maybeSingle();

      if (existing) {
        const newN = (existing.n_observations as number) + 1;
        const oldAvg = Number(existing.avg_engagement_z ?? 0);
        const newAvg =
          (oldAvg * (existing.n_observations as number) + zVal) / newN;
        await sb
          .from("variant_weights")
          .update({
            avg_engagement_z: newAvg,
            n_observations: newN,
            exploration_weight: newN >= 5 ? 1.0 : 1.5,
            last_updated_at: new Date().toISOString(),
          })
          .eq("weight_id", existing.weight_id);
      } else {
        await sb.from("variant_weights").insert({
          platform,
          category: cat,
          variant_id: p.variant_id,
          avg_engagement_z: zVal,
          n_observations: 1,
          exploration_weight: 1.5,
        });
      }
      updated++;
    }
  }

  // cold start: <5 posts なら observation only
  if (posts.length < 5) {
    return {
      updated,
      proposals: { message: "cold start — observation only (need 5+ posts)" },
    };
  }

  const xCount = posts.filter((p) => p.platform === "x").length;
  const igCount = posts.filter((p) => p.platform === "instagram").length;
  const noteCount = posts.filter((p) => p.platform === "note").length;

  const proposals = await callJson<TrackBOutput>({
    model: SONNET,
    system:
      "あなたは投稿生成 prompt の自己改善エンジニアです。出力は JSON のみ。",
    user: `過去30日の variant 別 engagement (媒体別 z_score 正規化済) を見て、改善案を出してください。

総 post 数: ${posts.length}
媒体内訳: X=${xCount}, IG=${igCount}, note=${noteCount}

JSON:
{
  "insights": "媒体横断の知見 (300字)",
  "new_variants": [{"platform": "x|instagram|note", "hook_template": "...", "tone": "...", "format": "..."}],
  "retire_variants": [{"variant_id": "...", "reason": "..."}]
}`,
    maxTokens: 1500,
  });

  return { updated, proposals };
}
