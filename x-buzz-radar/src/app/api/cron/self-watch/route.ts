import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase";
import { watchXPost } from "@/lib/self-watch/x";
import { watchIgPost } from "@/lib/self-watch/instagram";
import { watchNotePost } from "@/lib/self-watch/note";

export const runtime = "nodejs";
export const maxDuration = 300;

interface Stage {
  hours: number;
  lower: number;
  upper: number;
}

const STAGES: Stage[] = [
  { hours: 24, lower: 18, upper: 30 },
  { hours: 72, lower: 60, upper: 84 },
  { hours: 168, lower: 156, upper: 180 },
  { hours: 720, lower: 700, upper: 740 },
];

export async function GET(req: NextRequest) {
  if (
    req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const sb = requireAdmin();

  const { data: posts, error } = await sb.from("our_posts").select("*");
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  if (!posts) return NextResponse.json({ processed: 0 });

  const now = Date.now();
  let processed = 0;
  const errors: Array<{ post_id: string; stage: number; error: string }> = [];

  for (const p of posts) {
    const ageMs = now - new Date(p.posted_at as string).getTime();
    const ageHrs = ageMs / 3600000;

    for (const stage of STAGES) {
      // 720h は note のみ
      if (stage.hours === 720 && p.platform !== "note") continue;
      if (ageHrs < stage.lower || ageHrs >= stage.upper) continue;

      // 同 stage 既取得チェック
      const { data: exist } = await sb
        .from("post_engagement_snapshots")
        .select("id")
        .eq("post_id", p.post_id)
        .eq("hours_since_post", stage.hours)
        .maybeSingle();
      if (exist) continue;

      try {
        if (p.platform === "x") await watchXPost(p.post_id as string, stage.hours);
        else if (p.platform === "instagram")
          await watchIgPost(p.post_id as string, stage.hours);
        else if (p.platform === "note" && p.post_url)
          await watchNotePost(
            p.post_url as string,
            p.post_id as string,
            stage.hours,
          );
        processed++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push({ post_id: p.post_id as string, stage: stage.hours, error: msg });
        console.error(
          `watch failed post=${p.post_id} stage=${stage.hours}`,
          err,
        );
      }
    }
  }

  return NextResponse.json({ processed, errors });
}
