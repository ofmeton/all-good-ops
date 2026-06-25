import { NextRequest, NextResponse } from "next/server";
import { runTrackA } from "@/lib/improve/track-a";
import { runTrackB } from "@/lib/improve/track-b";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  if (
    req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const [a, b] = await Promise.allSettled([runTrackA(), runTrackB()]);

  return NextResponse.json({
    trackA: a.status === "fulfilled" ? a.value : { error: String(a.reason) },
    trackB: b.status === "fulfilled" ? b.value : { error: String(b.reason) },
  });
}
