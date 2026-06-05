import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

type Action = "adopt" | "reject" | "save_for_later";
const STATUS_MAP: Record<Action, string> = {
  adopt: "adopted",
  reject: "rejected",
  save_for_later: "saved_for_later",
};

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    buzz_id: string;
    action: Action;
    rejection_reason?: string;
  };
  const sb = requireAdmin();

  const status = STATUS_MAP[body.action];
  if (!status)
    return NextResponse.json({ error: "invalid action" }, { status: 400 });

  const { error } = await sb
    .from("x_buzz_tweets")
    .update({
      status,
      rejection_reason:
        body.action === "reject" ? body.rejection_reason ?? null : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", body.buzz_id);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  // increment adoption counter on the source query
  if (body.action === "adopt") {
    const { data: row } = await sb
      .from("x_buzz_tweets")
      .select("source_query_id")
      .eq("id", body.buzz_id)
      .single();
    if (row?.source_query_id) {
      const { data: q } = await sb
        .from("query_pool")
        .select("total_adoptions")
        .eq("query_id", row.source_query_id)
        .single();
      if (q) {
        await sb
          .from("query_pool")
          .update({ total_adoptions: (q.total_adoptions ?? 0) + 1 })
          .eq("query_id", row.source_query_id);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
