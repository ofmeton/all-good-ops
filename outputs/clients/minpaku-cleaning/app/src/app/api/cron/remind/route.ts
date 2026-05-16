import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { isCronAuthenticated } from "@/lib/cron-auth";
import { notify, resolveStaffRecipients } from "@/lib/notify";

// 翌日の YYYY-MM-DD（JST 想定 / Node ランタイムローカルタイム）
function tomorrowDateStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

// 前日17:00 に Vercel Cron で呼ばれ、翌日チェックインの assigned 依頼の担当スタッフへ
// リマインドを送る。dedupeToday=true で重複起動を防御する。
export async function GET(req: NextRequest) {
  if (!isCronAuthenticated(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = createServiceClient();
  const tomorrow = tomorrowDateStr();
  const { data: requests, error } = await db
    .from("cleaning_requests")
    .select("id, property_id, checkin_date, checkout_date, assigned_staff_id, properties(name)")
    .eq("checkin_date", tomorrow)
    .eq("status", "assigned")
    .not("assigned_staff_id", "is", null);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const list = (requests ?? []) as unknown as Array<{
    id: string;
    property_id: string;
    checkin_date: string;
    checkout_date: string;
    assigned_staff_id: string;
    properties: { name: string } | null;
  }>;

  let sent = 0;
  for (const r of list) {
    const staff = await resolveStaffRecipients([r.assigned_staff_id]);
    await notify(
      "reminder",
      staff,
      {
        subject: "明日の清掃リマインド",
        text: `明日 ${r.checkin_date} は ${r.properties?.name ?? "物件"} の清掃です（チェックアウト: ${r.checkout_date}）。`,
      },
      { request_id: r.id, date: r.checkin_date },
      { dedupeToday: true },
    );
    sent += 1;
  }
  return NextResponse.json({ ok: true, processed: list.length, sent });
}
