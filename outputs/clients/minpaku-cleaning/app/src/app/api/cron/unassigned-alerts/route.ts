import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { isCronAuthenticated } from "@/lib/cron-auth";
import {
  notify,
  resolveAllAdmins,
  resolveOwnerForProperty,
} from "@/lib/notify";

// 1時間ごとに走り、assignment_deadline（送信+24h）を過ぎてもまだ status='unassigned'
// の依頼を管理者＋オーナーにアラート通知する。dedupeToday=true で1日1回に絞る。
export async function GET(req: NextRequest) {
  if (!isCronAuthenticated(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = createServiceClient();
  const now = new Date().toISOString();
  const { data: requests, error } = await db
    .from("cleaning_requests")
    .select("id, property_id, checkin_date, checkout_date, assignment_deadline, properties(name)")
    .eq("status", "unassigned")
    .lt("assignment_deadline", now);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const list = (requests ?? []) as unknown as Array<{
    id: string;
    property_id: string;
    checkin_date: string;
    checkout_date: string;
    properties: { name: string } | null;
  }>;

  const admins = await resolveAllAdmins();
  let processed = 0;
  for (const r of list) {
    const owner = await resolveOwnerForProperty(r.property_id);
    const recipients = owner ? [...admins, owner] : admins;
    await notify(
      "unassigned_alert",
      recipients,
      {
        subject: "未割当の清掃依頼があります",
        text: `${r.properties?.name ?? "物件"} の依頼（${r.checkin_date}〜${r.checkout_date}）が24時間を経過しても未割当です。手動割当を検討してください。`,
      },
      { request_id: r.id, property_id: r.property_id },
      { dedupeToday: true },
    );
    processed += 1;
  }
  return NextResponse.json({ ok: true, processed });
}
