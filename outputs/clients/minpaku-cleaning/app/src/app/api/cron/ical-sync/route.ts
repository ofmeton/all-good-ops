import { NextResponse, type NextRequest } from "next/server";
import { isCronAuthenticated } from "@/lib/cron-auth";
import type { Actor } from "@/lib/auth";
import {
  detectCancellations,
  listAllIcalFeeds,
  syncFeedErrorStatus,
  syncFeed,
  updateIcalFeedFetchStatus,
} from "@/lib/db/reservations";

const cronActor: Actor = { role: "admin", adminId: "cron", roleLevel: 1 };

export async function GET(req: NextRequest) {
  if (!isCronAuthenticated(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const feeds = await listAllIcalFeeds(cronActor);
  let upsertCount = 0;
  let cancelCount = 0;
  let errorCount = 0;

  for (const feed of feeds) {
    try {
      const result = await syncFeed(cronActor, feed);
      const cancelled = await detectCancellations(cronActor, feed.id, result.seenUids);
      await updateIcalFeedFetchStatus(cronActor, feed.id, "ok");
      upsertCount += result.upsertedCount;
      cancelCount += cancelled.length;
    } catch (e) {
      errorCount += 1;
      console.error("ical-sync failed", { feedId: feed.id, error: e });
      await updateIcalFeedFetchStatus(cronActor, feed.id, syncFeedErrorStatus(e));
    }
  }

  return NextResponse.json({
    ok: true,
    feedCount: feeds.length,
    upsertCount,
    cancelCount,
    errorCount,
  });
}
