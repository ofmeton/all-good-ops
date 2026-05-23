import { start } from "workflow/api";

import { dailyPublishWorkflow } from "../../../../workflows/daily-publish";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request): Promise<Response> {
  const auth = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (!expected) return new Response("CRON_SECRET not set", { status: 500 });
  if (auth !== `Bearer ${expected}`) return new Response("unauthorized", { status: 401 });

  const run = await start(dailyPublishWorkflow, []);
  return Response.json({ ok: true, runId: run.runId, triggeredAt: new Date().toISOString() });
}

export const POST = GET;
