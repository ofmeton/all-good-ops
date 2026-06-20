import "server-only";
import { createServiceClient } from "@/lib/supabase-server";
import type { Actor } from "@/lib/auth";
import { StaffOnlyError } from "@/lib/db/scope";
import { offsetOf, isWithinWindow } from "@/lib/offer-window";
import { notify, resolveAllAdmins, type NotifyRecipient } from "@/lib/notify";
import { buildNotificationMessage } from "@/lib/notify/templates";
import { hasSentToday } from "@/lib/db/notifications";

export type ResponseAnswer = "available" | "unavailable";

export type CleaningResponse = {
  id: string;
  request_id: string;
  staff_id: string;
  answer: ResponseAnswer;
  offered_date: string | null;
  responded_at: string;
};

type RequestForDecision = {
  id: string;
  property_id: string;
  checkin_date: string;
  checkout_date: string;
  guest_count: number;
  status: string;
  assignment_deadline: string | null;
  offer_date_start: string | null;
  offer_date_end: string | null;
  provisional_decision_at: string | null;
  properties?: { name: string } | null;
};

type StaffContact = {
  id: string;
  name: string;
  line_user_id: string | null;
  email: string | null;
  token: string | null;
};

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
}

function staffUrl(token: string | null, path = ""): string | null {
  const base = appUrl();
  if (!base || !token) return null;
  return `${base}/staff/${token}${path}`;
}

function recipientFromStaff(staff: StaffContact): NotifyRecipient {
  return {
    line_user_id: staff.line_user_id,
    email: staff.email,
    key: `staff:${staff.id}`,
  };
}

async function getStaffContacts(staffIds: string[]): Promise<StaffContact[]> {
  if (staffIds.length === 0) return [];
  const db = createServiceClient();
  const { data, error } = await db
    .from("staff")
    .select("id, name, line_user_id, email")
    .in("id", staffIds);
  if (error) throw error;

  const { data: tokens, error: tokenError } = await db
    .from("access_tokens")
    .select("staff_id, token")
    .eq("type", "staff")
    .is("revoked_at", null)
    .in("staff_id", staffIds);
  if (tokenError) throw tokenError;
  const tokenByStaff = new Map(
    ((tokens ?? []) as Array<{ staff_id: string; token: string }>).map((t) => [
      t.staff_id,
      t.token,
    ]),
  );

  return ((data ?? []) as Array<Omit<StaffContact, "token">>).map((staff) => ({
    ...staff,
    token: tokenByStaff.get(staff.id) ?? null,
  }));
}

async function getRequestForDecision(
  requestId: string,
): Promise<RequestForDecision | null> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("cleaning_requests")
    .select("id, property_id, checkin_date, checkout_date, guest_count, status, assignment_deadline, offer_date_start, offer_date_end, provisional_decision_at, properties(name)")
    .eq("id", requestId)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as RequestForDecision | null) ?? null;
}

function sortByResponseTime(a: CleaningResponse, b: CleaningResponse): number {
  return a.responded_at.localeCompare(b.responded_at);
}

function sortForDueDecision(
  checkoutDate: string,
): (a: CleaningResponse, b: CleaningResponse) => number {
  return (a, b) => {
    const offsetA = offsetOf(a.offered_date!, checkoutDate);
    const offsetB = offsetOf(b.offered_date!, checkoutDate);
    if (offsetA !== offsetB) return offsetA - offsetB;
    return sortByResponseTime(a, b);
  };
}

async function listAvailableResponses(requestId: string): Promise<CleaningResponse[]> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("cleaning_responses")
    .select("*")
    .eq("request_id", requestId)
    .eq("answer", "available")
    .not("offered_date", "is", null);
  if (error) throw error;
  return (data ?? []) as CleaningResponse[];
}

async function notifyUnassignedAlert(
  req: RequestForDecision,
  reason: string,
): Promise<void> {
  const admins = await resolveAllAdmins();
  const recipients: NotifyRecipient[] = [];
  for (const admin of admins) {
    if (!(await hasSentToday("unassigned_alert", admin.key))) {
      recipients.push(admin);
    }
  }
  if (recipients.length === 0) return;
  await notify(
    "unassigned_alert",
    recipients,
    buildNotificationMessage("unassigned_alert", {
      propertyName: req.properties?.name,
      checkinDate: req.checkin_date,
      checkoutDate: req.checkout_date,
      reason,
      adminUrl: appUrl() ? `${appUrl()}/admin/requests/${req.id}` : null,
    }),
    { request_id: req.id, property_id: req.property_id, reason },
  );
}

export async function submitResponse(
  actor: Actor,
  requestId: string,
  answer: ResponseAnswer,
  offeredDate?: string | null,
): Promise<CleaningResponse> {
  if (actor.role !== "staff") throw new StaffOnlyError("スタッフ専用の操作です");
  const db = createServiceClient();
  const { data: req, error: readError } = await db
    .from("cleaning_requests")
    .select("id, status, offer_date_start, offer_date_end")
    .eq("id", requestId)
    .maybeSingle();
  if (readError) throw readError;
  if (!req) throw new Error("依頼が見つかりません");
  if (req.status !== "unassigned") {
    throw new Error("この依頼は回答受付を終了しています");
  }

  const { data: recipient, error: recipientError } = await db
    .from("cleaning_request_recipients")
    .select("staff_id, excluded")
    .eq("request_id", requestId)
    .eq("staff_id", actor.staffId)
    .maybeSingle();
  if (recipientError) throw recipientError;
  if (!recipient || recipient.excluded) {
    throw new Error("この依頼の回答対象ではありません");
  }

  const normalizedOfferedDate = answer === "available" ? offeredDate : null;
  if (answer === "available") {
    if (!normalizedOfferedDate) throw new Error("清掃可能日を選択してください");
    if (!req.offer_date_start || !req.offer_date_end) {
      throw new Error("回答可能期間が設定されていません");
    }
    if (!isWithinWindow(normalizedOfferedDate, req.offer_date_start, req.offer_date_end)) {
      throw new Error("清掃可能日が回答可能期間外です");
    }
  }

  const { data, error } = await db
    .from("cleaning_responses")
    .upsert(
      {
        request_id: requestId,
        staff_id: actor.staffId,
        answer,
        offered_date: normalizedOfferedDate,
        responded_at: new Date().toISOString(),
      },
      { onConflict: "request_id,staff_id" },
    )
    .select()
    .single();
  if (error) throw error;

  await tryConfirm(requestId);
  return data as CleaningResponse;
}

export async function getResponseForStaff(
  actor: Actor,
  requestId: string,
): Promise<CleaningResponse | null> {
  if (actor.role !== "staff") throw new StaffOnlyError("スタッフ専用の操作です");
  const db = createServiceClient();
  const { data, error } = await db
    .from("cleaning_responses")
    .select("*")
    .eq("request_id", requestId)
    .eq("staff_id", actor.staffId)
    .maybeSingle();
  if (error) throw error;
  return (data as CleaningResponse | null) ?? null;
}

export async function tryConfirm(requestId: string): Promise<void> {
  const req = await getRequestForDecision(requestId);
  if (!req || req.status !== "unassigned") return;

  const db = createServiceClient();
  const { data: responseRows, error: responseError } = await db
    .from("cleaning_responses")
    .select("*")
    .eq("request_id", requestId);
  if (responseError) throw responseError;
  const responses = (responseRows ?? []) as CleaningResponse[];
  const available = responses.filter(
    (response) => response.answer === "available" && response.offered_date,
  );

  const sameDay = available
    .filter((response) => offsetOf(response.offered_date!, req.checkout_date) === 0)
    .sort(sortByResponseTime)[0];
  if (sameDay) {
    await finalize(requestId, sameDay);
    return;
  }

  if (available.length > 0 && !req.provisional_decision_at) {
    const firstRespondedAt = available.map((r) => r.responded_at).sort()[0];
    const provisionalAt = new Date(
      new Date(firstRespondedAt).getTime() + 24 * 60 * 60 * 1000,
    ).toISOString();
    const { error } = await db
      .from("cleaning_requests")
      .update({ provisional_decision_at: provisionalAt })
      .eq("id", requestId)
      .eq("status", "unassigned")
      .is("provisional_decision_at", null);
    if (error) throw error;
  }

  const { count: totalRecipients, error: recipientCountError } = await db
    .from("cleaning_request_recipients")
    .select("staff_id", { count: "exact", head: true })
    .eq("request_id", requestId)
    .eq("excluded", false);
  if (recipientCountError) throw recipientCountError;
  const answeredStaff = new Set(responses.map((response) => response.staff_id));
  if (
    (totalRecipients ?? 0) > 0 &&
    answeredStaff.size >= (totalRecipients ?? 0) &&
    available.length === 0
  ) {
    await notifyUnassignedAlert(req, "全員不可");
  }
}

export async function finalize(
  requestId: string,
  winningResponse: CleaningResponse,
): Promise<boolean> {
  if (!winningResponse.offered_date) return false;
  const db = createServiceClient();
  const { data, error } = await db
    .from("cleaning_requests")
    .update({
      status: "assigned",
      assigned_staff_id: winningResponse.staff_id,
      scheduled_clean_date: winningResponse.offered_date,
      confirmed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("status", "unassigned")
    .select("id, property_id, checkin_date, checkout_date, guest_count, scheduled_clean_date, properties(name)");
  if (error) throw error;
  if (!data || data.length === 0) return false;

  const req = data[0] as unknown as RequestForDecision & {
    scheduled_clean_date: string;
  };
  const available = await listAvailableResponses(requestId);
  const contacts = await getStaffContacts([
    ...new Set(available.map((response) => response.staff_id)),
  ]);
  const byStaff = new Map(contacts.map((staff) => [staff.id, staff]));
  const winner = byStaff.get(winningResponse.staff_id);
  if (winner) {
    await notify(
      "clean_confirmed",
      [recipientFromStaff(winner)],
      buildNotificationMessage("clean_confirmed", {
        propertyName: req.properties?.name,
        checkinDate: req.checkin_date,
        checkoutDate: req.checkout_date,
        guestCount: req.guest_count,
        cleanDate: winningResponse.offered_date,
        staffName: winner.name,
        shiftUrl: staffUrl(winner.token),
      }),
      { request_id: requestId, property_id: req.property_id, staff_id: winner.id },
    );
  }

  const passedOver = contacts.filter((staff) => staff.id !== winningResponse.staff_id);
  await notify(
    "clean_passed_over",
    passedOver.map(recipientFromStaff),
    buildNotificationMessage("clean_passed_over", {
      propertyName: req.properties?.name,
      cleanDate: winningResponse.offered_date,
    }),
    { request_id: requestId, property_id: req.property_id, winner_staff_id: winningResponse.staff_id },
  );
  return true;
}

export async function finalizeDueOffers(): Promise<{
  finalized: number;
  alerted: number;
}> {
  const db = createServiceClient();
  const now = new Date().toISOString();
  const { data: dueRequests, error: dueError } = await db
    .from("cleaning_requests")
    .select("id, property_id, checkin_date, checkout_date, guest_count, status, assignment_deadline, offer_date_start, offer_date_end, provisional_decision_at, properties(name)")
    .eq("status", "unassigned")
    .lt("provisional_decision_at", now);
  if (dueError) throw dueError;

  let finalized = 0;
  for (const req of (dueRequests ?? []) as unknown as RequestForDecision[]) {
    const best = (await listAvailableResponses(req.id)).sort(
      sortForDueDecision(req.checkout_date),
    )[0];
    if (best && (await finalize(req.id, best))) finalized += 1;
  }

  const { data: expiredRequests, error: expiredError } = await db
    .from("cleaning_requests")
    .select("id, property_id, checkin_date, checkout_date, guest_count, status, assignment_deadline, offer_date_start, offer_date_end, provisional_decision_at, properties(name)")
    .eq("status", "unassigned")
    .lt("assignment_deadline", now);
  if (expiredError) throw expiredError;

  let alerted = 0;
  for (const req of (expiredRequests ?? []) as unknown as RequestForDecision[]) {
    await notifyUnassignedAlert(req, "24h未確定");
    alerted += 1;
  }

  return { finalized, alerted };
}
