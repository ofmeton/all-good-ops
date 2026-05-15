import "server-only";
import { createServiceClient } from "@/lib/supabase-server";
import { assertAdmin, StaffOnlyError } from "@/lib/db/scope";
import { assertTransition, type CleaningStatus } from "@/lib/status-machine";
import type { Actor } from "@/lib/auth";

export type CleaningRequestInput = {
  property_id: string;
  checkin_date: string; // YYYY-MM-DD
  checkout_date: string; // YYYY-MM-DD
  guest_count: number;
  option_memo?: string;
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
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

// 当日割り当て不可: checkin は翌日以降。checkout > checkin。guest_count > 0。
// current_date を使う CHECK 制約は immutable でないため不可 → アプリ層で検証する。
// 日付比較は Node ランタイムのローカルタイム前提（本番は TZ=Asia/Tokyo を想定）。
function validateRequestFields(input: {
  checkin_date: string;
  checkout_date: string;
  guest_count: number;
}): void {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkin = new Date(input.checkin_date + "T00:00:00");
  const checkout = new Date(input.checkout_date + "T00:00:00");
  if (checkin <= today) {
    throw new Error("チェックイン日は翌日以降にしてください");
  }
  if (checkout <= checkin) {
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
      created_by: actor.adminId,
    })
    .select()
    .single();
  if (error) throw error;
  // TODO(Plan 3): 依頼作成時に担当スタッフへ通知
  return data as CleaningRequest;
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
  // 日付/人数を触る場合は現行値とマージして検証する
  if (
    patch.checkin_date !== undefined ||
    patch.checkout_date !== undefined ||
    patch.guest_count !== undefined
  ) {
    const current = await getRequest(actor, id);
    if (!current) throw new Error("依頼が見つかりません");
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
}

// 管理者による依頼キャンセル（cancelled へ遷移。物理削除しない）。
export async function cancelRequest(actor: Actor, id: string): Promise<void> {
  assertAdmin(actor);
  const db = createServiceClient();
  const { data: req, error: readError } = await db
    .from("cleaning_requests")
    .select("status")
    .eq("id", id)
    .maybeSingle();
  if (readError) throw readError;
  if (!req) throw new Error("依頼が見つかりません");
  assertTransition(req.status as CleaningStatus, "cancelled");
  const { error } = await db
    .from("cleaning_requests")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
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

// 早い者勝ち承認: status='unassigned' の条件付きUPDATEで排他する。
// 影響行数1 → 承認確定 / 0 → 既に他スタッフが取得済み。
export async function claimRequest(
  actor: Actor,
  requestId: string,
): Promise<void> {
  if (actor.role !== "staff") throw new StaffOnlyError("スタッフ専用の操作です");
  const db = createServiceClient();
  // NOTE: 担当チェックは条件付きUPDATEとは別クエリ。staff_assignments の
  // 変更は管理者のみ・低頻度のため TOCTOU は許容（将来 join 化を検討）。
  await assertStaffAssignedToRequestProperty(db, actor.staffId, requestId);
  const { data, error } = await db
    .from("cleaning_requests")
    .update({
      status: "assigned",
      assigned_staff_id: actor.staffId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("status", "unassigned")
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new RequestAlreadyClaimedError("この依頼は既に他のスタッフが承認しました");
  }
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
  const { error } = await db
    .from("cleaning_requests")
    .update({
      status: "assigned",
      assigned_staff_id: staffId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId);
  if (error) throw error;
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
  const { error } = await db
    .from("cleaning_requests")
    .update({ status: "in_progress", updated_at: new Date().toISOString() })
    .eq("id", requestId);
  if (error) throw error;
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
    .select("status")
    .eq("id", requestId)
    .maybeSingle();
  if (!req) throw new Error("依頼が見つかりません");
  assertTransition(req.status as CleaningStatus, "confirmed");
  const { error } = await db
    .from("cleaning_requests")
    .update({ status: "confirmed", updated_at: new Date().toISOString() })
    .eq("id", requestId);
  if (error) throw error;
  // TODO(Plan 3): 確認完了時に物件オーナーへ通知
}

// ---- スタッフ向けクエリ ----

export type StaffRequestListItem = CleaningRequest & { property_name: string };

// スタッフの担当物件の「未割当（承認可能）」依頼 + 「自分に割当済み」依頼。
// 一覧表示用に物件名を同梱する。
export async function listRequestsForStaff(
  actor: Actor,
): Promise<StaffRequestListItem[]> {
  // staffId は検証済みのサーバ側トークン由来。未検証入力ではこの補間を使わないこと。
  if (actor.role !== "staff") throw new StaffOnlyError("スタッフ専用の操作です");
  const db = createServiceClient();
  const { data: assignments } = await db
    .from("staff_assignments")
    .select("property_id")
    .eq("staff_id", actor.staffId);
  const propertyIds = (assignments ?? []).map((a) => a.property_id);
  if (propertyIds.length === 0) return [];
  const { data, error } = await db
    .from("cleaning_requests")
    .select("*, properties(name)")
    .in("property_id", propertyIds)
    .or(`status.eq.unassigned,assigned_staff_id.eq.${actor.staffId}`)
    .order("checkin_date", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row: Record<string, unknown>) => {
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
  property: { name: string; checklist_template: unknown[] };
};

// スタッフ向けの依頼詳細。担当外物件の依頼は null。物件名・チェックリストテンプレ同梱。
export async function getRequestForStaff(
  actor: Actor,
  requestId: string,
): Promise<StaffRequestDetail | null> {
  if (actor.role !== "staff") throw new StaffOnlyError("スタッフ専用の操作です");
  const db = createServiceClient();
  const { data, error } = await db
    .from("cleaning_requests")
    .select("*, properties(name, checklist_template)")
    .eq("id", requestId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { data: assignment } = await db
    .from("staff_assignments")
    .select("property_id")
    .eq("staff_id", actor.staffId)
    .eq("property_id", data.property_id)
    .maybeSingle();
  if (!assignment) return null;
  const { properties, ...request } = data as Record<string, unknown> & {
    properties: { name: string; checklist_template: unknown[] };
  };
  return {
    ...(request as unknown as CleaningRequest),
    property: {
      name: properties.name,
      checklist_template: properties.checklist_template ?? [],
    },
  };
}
