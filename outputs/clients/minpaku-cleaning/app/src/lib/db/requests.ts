import "server-only";
import { createServiceClient } from "@/lib/supabase-server";
import { assertAdmin } from "@/lib/db/scope";
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
      // created_by は admins(id) FK（UUID）。actor.adminId はアプリ層の識別子で
      // DB の admins テーブルに存在しない場合があるため省略（null = set null on delete）。
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
