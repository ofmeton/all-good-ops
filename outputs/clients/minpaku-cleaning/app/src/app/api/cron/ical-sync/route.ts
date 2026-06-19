import { NextResponse, type NextRequest } from "next/server";
import { isCronAuthenticated } from "@/lib/cron-auth";
import type { Actor } from "@/lib/auth";
import {
  detectCancellations,
  listAllIcalFeeds,
  syncFeed,
  updateIcalFeedFetchStatus,
} from "@/lib/db/reservations";

const cronActor: Actor = { role: "admin", adminId: "cron", roleLevel: 1 };

function errorStatus(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return `error:${message}`.slice(0, 500);
}

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
      await updateIcalFeedFetchStatus(cronActor, feed.id, errorStatus(e));
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
