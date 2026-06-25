import { requireAdmin } from "@/lib/supabase";

interface IgInsightsResponse {
  data?: Array<{
    name: string;
    values?: Array<{ value: number }>;
  }>;
}

export async function watchIgPost(
  post_id: string,
  hoursSincePost: number,
): Promise<void> {
  const token = process.env.IG_LONG_LIVED_TOKEN;
  if (!token) {
    console.warn("IG_LONG_LIVED_TOKEN not set — skip IG self-watch");
    return;
  }
  const metrics = "likes,comments,shares,saved,reach,impressions";
  const url = `https://graph.facebook.com/v21.0/${post_id}/insights?metric=${metrics}&access_token=${token}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.warn(`IG self-watch ${post_id} status ${res.status}: ${body.slice(0, 200)}`);
    return;
  }
  const json = (await res.json()) as IgInsightsResponse;
  const map = Object.fromEntries(
    (json.data ?? []).map((m) => [m.name, m.values?.[0]?.value ?? 0]),
  );

  const sb = requireAdmin();
  await sb.from("post_engagement_snapshots").insert({
    post_id,
    platform: "instagram",
    hours_since_post: hoursSincePost,
    likes: map.likes ?? 0,
    comments: map.comments ?? 0,
    shares: map.shares ?? 0,
    saves: map.saved ?? 0,
    reach: map.reach ?? 0,
    impressions: map.impressions ?? 0,
    source: "api",
  });
}
