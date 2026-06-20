import "server-only";
import { createServiceClient } from "@/lib/supabase-server";
import { assertAdmin, StaffOnlyError } from "@/lib/db/scope";
import { assertTransition, type CleaningStatus } from "@/lib/status-machine";
import type { Actor } from "@/lib/auth";
import { todayInJST } from "@/lib/date";
import { offerWindow } from "@/lib/offer-window";
import {
  notify,
  resolveOwnerForProperty,
  type NotifyRecipient,
} from "@/lib/notify";
import { buildNotificationMessage } from "@/lib/notify/templates";
import {
  buildScheduleBlock,
  type ScheduleMarker,
} from "@/lib/notify/templates/schedule-block";

export type CleaningRequestInput = {
  property_id: string;
  checkin_date: string; // YYYY-MM-DD
  checkout_date: string; // YYYY-MM-DD
  guest_count: number;
  option_memo?: string;
  reservation_id?: string;
  staff_candidate_ids?: string[];
  excluded_staff_ids?: string[];
};

export type CleaningRequest = {
  id: string;
  property_id: string;
  checkin_date: string;
  checkout_date: string;
  guest_count: number;
  option_memo: string | null;
  status: CleaningStatus;
  assigned_staff_id: string | null;
  assignment_deadline: string | null;
  reservation_id: string | null;
  offer_date_start: string | null;
  offer_date_end: string | null;
  scheduled_clean_date: string | null;
  provisional_decision_at: string | null;
  confirmed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
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
    .in("id", staffIds)
    .is("archived_at", null);
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

async function propertyName(propertyId: string): Promise<string | null> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("properties")
    .select("name")
    .eq("id", propertyId)
    .maybeSingle();
  if (error) throw error;
  return data?.name ?? null;
}

async function defaultStaffCandidateIds(propertyId: string): Promise<string[]> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("staff_assignments")
    .select("staff_id, staff:staff_id(archived_at)")
    .eq("property_id", propertyId);
  if (error) throw error;
  return ((data ?? []) as unknown as Array<{
    staff_id: string;
    staff: { archived_at: string | null } | null;
  }>)
    .filter((row) => row.staff && row.staff.archived_at === null)
    .map((row) => row.staff_id);
}

async function nextCheckinAfterCheckout(
  propertyId: string,
  checkoutDate: string,
): Promise<string | null> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("reservations")
    .select("checkin_date")
    .eq("property_id", propertyId)
    .eq("status", "active")
    .gt("checkin_date", checkoutDate)
    .order("checkin_date", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.checkin_date ?? null;
}

async function activeRecipientStaffIds(requestId: string): Promise<string[]> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("cleaning_request_recipients")
    .select("staff_id")
    .eq("request_id", requestId)
    .eq("excluded", false);
  if (error) throw error;
  return (data ?? []).map((row) => row.staff_id as string);
}

async function notifyRequestRecipients(
  kind: "request_created" | "request_changed" | "request_cancelled",
  req: CleaningRequest,
  staffIds: string[],
  marker?: ScheduleMarker,
  previousGuestCount?: number,
): Promise<void> {
  const contacts = await getStaffContacts(staffIds);
  if (contacts.length === 0) return;
  const scheduleBlock = await buildScheduleBlock(req.property_id, {
    markers: marker ? { [req.id]: marker } : undefined,
  });
  const name = await propertyName(req.property_id);
  await Promise.all(
    contacts.map((staff) =>
      notify(
        kind,
        [recipientFromStaff(staff)],
        buildNotificationMessage(kind, {
          propertyName: name,
          checkinDate: req.checkin_date,
          checkoutDate: req.checkout_date,
          guestCount: req.guest_count,
          previousGuestCount,
          responseUrl:
            kind === "request_cancelled"
              ? null
              : staffUrl(staff.token, `/respond/${req.id}`),
          shiftUrl: staffUrl(staff.token),
          scheduleBlock,
        }),
        { request_id: req.id, property_id: req.property_id, staff_id: staff.id },
      ),
    ),
  );
}

// 当日割り当て不可: checkin は翌日以降。checkout > checkin。guest_count > 0。
// current_date を使う CHECK 制約は immutable でないため不可 → アプリ層で検証する。
// 日付は JST 基準（@/lib/date の todayInJST）で取得しランタイム TZ に依存しない。
function validateRequestFields(input: {
  checkin_date: string;
  checkout_date: string;
  guest_count: number;
}): void {
  const today = todayInJST();
  if (input.checkin_date <= today) {
    throw new Error("チェックイン日は翌日以降にしてください");
  }
  if (input.checkout_date <= input.checkin_date) {
    throw new Error("チェックアウト日はチェックイン日より後にしてください");
  }
  if (input.guest_count <= 0) {
    throw new Error("人数は1以上にしてください");
  }
}

export async function listRequests(actor: Actor): Promise<CleaningRequest[]> {
  assertAdmin(actor);
  const db = createServiceClient();
  const { data, error } = await db
    .from("cleaning_requests")
    .select("*")
    .order("checkin_date", { ascending: true });
  if (error) throw error;
  return data as CleaningRequest[];
}

export async function getRequest(
  actor: Actor,
  id: string,
): Promise<CleaningRequest | null> {
  assertAdmin(actor);
  const db = createServiceClient();
  const { data, error } = await db
    .from("cleaning_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as CleaningRequest | null;
}

export async function createRequest(
  actor: Actor,
  input: CleaningRequestInput,
): Promise<CleaningRequest> {
  assertAdmin(actor);
  validateRequestFields(input);
  const db = createServiceClient();
  const candidateIds =
    input.staff_candidate_ids && input.staff_candidate_ids.length > 0
      ? [...new Set(input.staff_candidate_ids)]
      : await defaultStaffCandidateIds(input.property_id);
  const excluded = new Set(input.excluded_staff_ids ?? []);
  const nextCheckin = await nextCheckinAfterCheckout(input.property_id, input.checkout_date);
  const window = offerWindow(input.checkout_date, nextCheckin);
  // 24h 有効期限（設計書 6章: assignment_deadline = 送信 + 24h）
  const deadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await db
    .from("cleaning_requests")
    .insert({
      property_id: input.property_id,
      checkin_date: input.checkin_date,
      checkout_date: input.checkout_date,
      guest_count: input.guest_count,
      option_memo: input.option_memo ?? null,
      status: "unassigned",
      assignment_deadline: deadline,
      reservation_id: input.reservation_id ?? null,
      offer_date_start: window.start,
      offer_date_end: window.end,
      created_by: actor.adminId,
    })
    .select()
    .single();
  if (error) throw error;
  if (candidateIds.length > 0) {
    const { error: recipientError } = await db
      .from("cleaning_request_recipients")
      .insert(
        candidateIds.map((staffId) => ({
          request_id: data.id,
          staff_id: staffId,
          excluded: excluded.has(staffId),
        })),
      );
    if (recipientError) throw recipientError;
  }

  const request = data as CleaningRequest;
  const activeIds = candidateIds.filter((staffId) => !excluded.has(staffId));
  await notifyRequestRecipients("request_created", request, activeIds, { kind: "new" });
  if (activeIds.length > 0) {
    const { error: notifiedError } = await db
      .from("cleaning_request_recipients")
      .update({ notified_at: new Date().toISOString() })
      .eq("request_id", request.id)
      .eq("excluded", false);
    if (notifiedError) throw notifiedError;
  }
  return request;
}

// 編集可能フィールド: checkin/checkout/guest_count/option_memo。property_id は変更不可。
export type CleaningRequestPatch = Partial<
  Omit<CleaningRequestInput, "property_id">
>;

export async function updateRequest(
  actor: Actor,
  id: string,
  patch: CleaningRequestPatch,
): Promise<void> {
  assertAdmin(actor);
  const current = await getRequest(actor, id);
  if (!current) throw new Error("依頼が見つかりません");
  // 日付/人数を触る場合は現行値とマージして検証する
  if (
    patch.checkin_date !== undefined ||
    patch.checkout_date !== undefined ||
    patch.guest_count !== undefined
  ) {
    validateRequestFields({
      checkin_date: patch.checkin_date ?? current.checkin_date,
      checkout_date: patch.checkout_date ?? current.checkout_date,
      guest_count: patch.guest_count ?? current.guest_count,
    });
  }
  const db = createServiceClient();
  const { error } = await db
    .from("cleaning_requests")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;

  if (
    patch.guest_count !== undefined &&
    patch.guest_count !== current.guest_count
  ) {
    const updated = {
      ...current,
      ...patch,
      updated_at: new Date().toISOString(),
    } as CleaningRequest;
    const staffIds =
      current.status === "unassigned"
        ? await activeRecipientStaffIds(id)
        : current.assigned_staff_id
          ? [current.assigned_staff_id]
          : [];
    await notifyRequestRecipients(
      "request_changed",
      updated,
      staffIds,
      {
        kind: "changed",
        previousGuestCount: current.guest_count,
        currentGuestCount: patch.guest_count,
      },
      current.guest_count,
    );
  }
}

// 管理者による依頼キャンセル（cancelled へ遷移。物理削除しない）。
export async function cancelRequest(actor: Actor, id: string): Promise<void> {
  assertAdmin(actor);
  const db = createServiceClient();
  const { data: req, error: readError } = await db
    .from("cleaning_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (readError) throw readError;
  if (!req) throw new Error("依頼が見つかりません");
  assertTransition(req.status as CleaningStatus, "cancelled");
  // 読取と更新の間に他処理が状態を変えていないか条件付きUPDATEで排他する（TOCTOU 対策）。
  const { data, error } = await db
    .from("cleaning_requests")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", req.status)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error("依頼の状態が変更されたため取り消しできませんでした");
  }
  const request = {
    ...(req as CleaningRequest),
    status: "cancelled" as CleaningStatus,
  };
  const staffIds =
    req.status === "unassigned"
      ? await activeRecipientStaffIds(id)
      : req.assigned_staff_id
        ? [req.assigned_staff_id]
        : [];
  await notifyRequestRecipients(
    "request_cancelled",
    request,
    staffIds,
    { kind: "cancelled" },
  );
}

// ---- 割当・進行遷移 ----

export class RequestAlreadyClaimedError extends Error {}

// スタッフが対象依頼の物件を担当しているか確認する。担当外なら例外。
async function assertStaffAssignedToRequestProperty(
  db: ReturnType<typeof createServiceClient>,
  staffId: string,
  requestId: string,
): Promise<void> {
  const { data: req } = await db
    .from("cleaning_requests")
    .select("property_id")
    .eq("id", requestId)
    .maybeSingle();
  if (!req) throw new Error("依頼が見つかりません");
  const { data: assignment } = await db
    .from("staff_assignments")
    .select("property_id")
    .eq("staff_id", staffId)
    .eq("property_id", req.property_id)
    .maybeSingle();
  if (!assignment) throw new Error("この物件の担当ではありません");
}

// スタッフが対象依頼に対して操作権限を持つか（担当物件か）を検証する公開 API。
// 写真アップロード等、requests 以外のエンドポイントから IDOR 防止のために呼ぶ。
export async function assertStaffAssignedToRequest(
  actor: Actor,
  requestId: string,
): Promise<void> {
  if (actor.role !== "staff") throw new StaffOnlyError("スタッフ専用の操作です");
  const db = createServiceClient();
  await assertStaffAssignedToRequestProperty(db, actor.staffId, requestId);
}

// 旧 claim 互換口。即時割当は廃止し、回答フローへ委譲する。
export async function claimRequest(
  actor: Actor,
  requestId: string,
): Promise<void> {
  if (actor.role !== "staff") throw new StaffOnlyError("スタッフ専用の操作です");
  const { submitResponse } = await import("@/lib/db/responses");
  const db = createServiceClient();
  const { data: req, error } = await db
    .from("cleaning_requests")
    .select("offer_date_start")
    .eq("id", requestId)
    .maybeSingle();
  if (error) throw error;
  if (!req?.offer_date_start) throw new Error("回答可能期間が設定されていません");
  await submitResponse(actor, requestId, "available", req.offer_date_start);
}

// 管理者による手動割当（unassigned / assigned のどちらからも可・再割当含む）。
export async function assignRequest(
  actor: Actor,
  requestId: string,
  staffId: string,
): Promise<void> {
  assertAdmin(actor);
  const db = createServiceClient();
  const { data: req } = await db
    .from("cleaning_requests")
    .select("status")
    .eq("id", requestId)
    .maybeSingle();
  if (!req) throw new Error("依頼が見つかりません");
  if (req.status !== "unassigned" && req.status !== "assigned") {
    throw new Error(`${req.status} の依頼は割り当てを変更できません`);
  }
  // 読取後に in_progress 等へ進んだ依頼を割当で上書きしないよう条件付きUPDATE（TOCTOU 対策）。
  const { data, error } = await db
    .from("cleaning_requests")
    .update({
      status: "assigned",
      assigned_staff_id: staffId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .in("status", ["unassigned", "assigned"])
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error("依頼の状態が変更されたため割り当てできませんでした");
  }
}

// スタッフが清掃を開始する（assigned → in_progress）。担当本人のみ。
export async function startRequest(
  actor: Actor,
  requestId: string,
): Promise<void> {
  if (actor.role !== "staff") throw new StaffOnlyError("スタッフ専用の操作です");
  const db = createServiceClient();
  const { data: req } = await db
    .from("cleaning_requests")
    .select("status, assigned_staff_id")
    .eq("id", requestId)
    .maybeSingle();
  if (!req) throw new Error("依頼が見つかりません");
  if (req.assigned_staff_id !== actor.staffId) {
    throw new Error("自分が担当する依頼ではありません");
  }
  assertTransition(req.status as CleaningStatus, "in_progress");
  // assigned かつ自分担当のままであることを条件付きUPDATEで保証する（TOCTOU 対策）。
  const { data, error } = await db
    .from("cleaning_requests")
    .update({ status: "in_progress", updated_at: new Date().toISOString() })
    .eq("id", requestId)
    .eq("status", "assigned")
    .eq("assigned_staff_id", actor.staffId)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error("依頼の状態が変更されたため開始できませんでした");
  }
}

// 管理者が完了報告を確認する（reported → confirmed）。
export async function confirmRequest(
  actor: Actor,
  requestId: string,
): Promise<void> {
  assertAdmin(actor);
  const db = createServiceClient();
  const { data: req } = await db
    .from("cleaning_requests")
    .select("status, property_id")
    .eq("id", requestId)
    .maybeSingle();
  if (!req) throw new Error("依頼が見つかりません");
  assertTransition(req.status as CleaningStatus, "confirmed");
  // reported のままであることを条件付きUPDATEで保証し、二重確定＝重複通知を防ぐ（TOCTOU 対策）。
  const { data, error } = await db
    .from("cleaning_requests")
    .update({ status: "confirmed", updated_at: new Date().toISOString() })
    .eq("id", requestId)
    .eq("status", "reported")
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error("依頼の状態が変更されたため確認できませんでした");
  }
  // 物件オーナーに確認完了を通知
  const owner = await resolveOwnerForProperty(req.property_id);
  if (owner) {
    await notify(
      "request_confirmed",
      [owner],
      buildNotificationMessage("request_confirmed"),
      { request_id: requestId, property_id: req.property_id },
    );
  }
}

// ---- スタッフ向けクエリ ----

export type StaffRequestListItem = CleaningRequest & { property_name: string };

// スタッフの「回答対象の未確定依頼」+「自分に割当済み」依頼。
// 一覧表示用に物件名を同梱する。
export async function listRequestsForStaff(
  actor: Actor,
): Promise<StaffRequestListItem[]> {
  // staffId は検証済みのサーバ側トークン由来。未検証入力ではこの補間を使わないこと。
  if (actor.role !== "staff") throw new StaffOnlyError("スタッフ専用の操作です");
  const db = createServiceClient();
  const { data: recipientRows, error: recipientError } = await db
    .from("cleaning_request_recipients")
    .select("request_id")
    .eq("staff_id", actor.staffId)
    .eq("excluded", false);
  if (recipientError) throw recipientError;
  const recipientRequestIds = (recipientRows ?? []).map((row) => row.request_id as string);

  const byId = new Map<string, StaffRequestListItem>();
  if (recipientRequestIds.length > 0) {
    const { data, error } = await db
      .from("cleaning_requests")
      .select("*, properties(name)")
      .in("id", recipientRequestIds)
      .eq("status", "unassigned")
      .order("checkin_date", { ascending: true });
    if (error) throw error;
    for (const item of normalizeStaffRequestRows(data ?? [])) byId.set(item.id, item);
  }

  const { data: assignedRows, error: assignedError } = await db
    .from("cleaning_requests")
    .select("*, properties(name)")
    .eq("assigned_staff_id", actor.staffId)
    .order("checkin_date", { ascending: true });
  if (assignedError) throw assignedError;
  for (const item of normalizeStaffRequestRows(assignedRows ?? [])) byId.set(item.id, item);

  return [...byId.values()].sort((a, b) =>
    a.checkin_date === b.checkin_date
      ? a.checkout_date.localeCompare(b.checkout_date)
      : a.checkin_date.localeCompare(b.checkin_date),
  );
}

function normalizeStaffRequestRows(rows: unknown[]): StaffRequestListItem[] {
  return rows.map((row) => {
    const { properties, ...request } = row as Record<string, unknown> & {
      properties: { name: string } | null;
    };
    return {
      ...(request as unknown as CleaningRequest),
      property_name: properties?.name ?? "?",
    };
  });
}

export type StaffRequestDetail = CleaningRequest & {
  property: {
    name: string;
    address: string | null;
    access_info_note: string | null;
    checklist_template: unknown[];
  };
};

// スタッフ向けの依頼詳細。担当外物件の依頼は null。物件名・住所・アクセス情報・チェックリストテンプレ同梱。
export async function getRequestForStaff(
  actor: Actor,
  requestId: string,
): Promise<StaffRequestDetail | null> {
  if (actor.role !== "staff") throw new StaffOnlyError("スタッフ専用の操作です");
  const db = createServiceClient();
  const { data, error } = await db
    .from("cleaning_requests")
    .select("*, properties(name, address, access_info_note, checklist_template)")
    .eq("id", requestId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  if (data.status === "unassigned") {
    const { data: recipient, error: recipientError } = await db
      .from("cleaning_request_recipients")
      .select("staff_id")
      .eq("request_id", requestId)
      .eq("staff_id", actor.staffId)
      .eq("excluded", false)
      .maybeSingle();
    if (recipientError) throw recipientError;
    if (!recipient) return null;
  } else if (data.assigned_staff_id !== actor.staffId) {
    return null;
  }
  const { properties, ...request } = data as Record<string, unknown> & {
    properties: {
      name: string;
      address: string | null;
      access_info_note: string | null;
      checklist_template: unknown[];
    };
  };
  return {
    ...(request as unknown as CleaningRequest),
    property: {
      name: properties.name,
      address: properties.address ?? null,
      access_info_note: properties.access_info_note ?? null,
      checklist_template: properties.checklist_template ?? [],
    },
  };
}
