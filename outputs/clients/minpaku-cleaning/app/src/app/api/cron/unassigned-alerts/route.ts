import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { isCronAuthenticated } from "@/lib/cron-auth";
import { serverErrorResponse } from "@/lib/api-error";
import {
  notify,
  resolveAllAdmins,
  resolveOwnerForProperty,
} from "@/lib/notify";
import { buildNotificationMessage } from "@/lib/notify/templates";

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
    return serverErrorResponse(error, "cron/unassigned-alerts");
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
      buildNotificationMessage("unassigned_alert", {
        propertyName: r.properties?.name,
        checkinDate: r.checkin_date,
        checkoutDate: r.checkout_date,
        reason: "24h未確定",
      }),
      { request_id: r.id, property_id: r.property_id },
      { dedupeToday: true },
    );
    processed += 1;
  }
  return NextResponse.json({ ok: true, processed });
}
