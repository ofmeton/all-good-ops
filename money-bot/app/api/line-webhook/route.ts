import { validateSignature } from "@line/bot-sdk";

import { getSupabase, hasSupabase } from "../../../lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 10;

interface LineEvent {
  type: string;
  source?: { type?: string; userId?: string };
  replyToken?: string;
  message?: { type?: string; text?: string };
}

export async function POST(req: Request): Promise<Response> {
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  const signature = req.headers.get("x-line-signature") ?? "";
  const bodyText = await req.text();

  if (!channelSecret) {
    return new Response("LINE_CHANNEL_SECRET not set", { status: 500 });
  }
  if (!validateSignature(bodyText, channelSecret, signature)) {
    return new Response("invalid signature", { status: 401 });
  }

  let parsed: { events?: LineEvent[] };
  try {
    parsed = JSON.parse(bodyText) as { events?: LineEvent[] };
  } catch {
    return Response.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const userIds = new Set<string>();
  for (const evt of parsed.events ?? []) {
    const uid = evt.source?.userId;
    if (uid) userIds.add(uid);
  }

  if (hasSupabase() && userIds.size > 0) {
    const supabase = getSupabase();
    const rows = Array.from(userIds).map((userId) => ({
      signal_id: `line:user:${userId}`,
      content: { kind: "line-userId", userId },
      fetched_at: new Date().toISOString(),
    }));
    const { error } = await supabase
      .from("ai_radar_signals_cache")
      .upsert(rows, { onConflict: "signal_id" });
    if (error) {
      console.warn("[line-webhook] supabase upsert failed", error.message);
    }
  }

  return Response.json({ ok: true, capturedUsers: Array.from(userIds) });
}

export async function GET(): Promise<Response> {
  return Response.json({ ok: true, hint: "POST your LINE webhook here" });
}
