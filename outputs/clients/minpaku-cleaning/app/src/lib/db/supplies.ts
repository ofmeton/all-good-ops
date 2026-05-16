import "server-only";
import { createServiceClient } from "@/lib/supabase-server";
import { assertAdmin, StaffOnlyError } from "@/lib/db/scope";
import type { Actor } from "@/lib/auth";
import { notify, resolveAllAdmins, resolveOwnerForProperty } from "@/lib/notify";

export type SupplyRequestInput = {
  property_id: string;
  request_id?: string;
  items: string;
};

export type SupplyRequest = {
  id: string;
  property_id: string;
  request_id: string | null;
  staff_id: string;
  items: string;
  created_at: string;
};

// スタッフが備品補充依頼を作成する。担当物件のみ。
export async function createSupplyRequest(
  actor: Actor,
  input: SupplyRequestInput,
): Promise<SupplyRequest> {
  if (actor.role !== "staff") throw new StaffOnlyError("スタッフ専用の操作です");
  const db = createServiceClient();
  const { data: assignment } = await db
    .from("staff_assignments")
    .select("property_id")
    .eq("staff_id", actor.staffId)
    .eq("property_id", input.property_id)
    .maybeSingle();
  if (!assignment) throw new Error("この物件の担当ではありません");
  const { data, error } = await db
    .from("supply_requests")
    .insert({
      property_id: input.property_id,
      request_id: input.request_id ?? null,
      staff_id: actor.staffId,
      items: input.items,
    })
    .select()
    .single();
  if (error) throw error;
  // 管理者＋オーナーに備品補充依頼を通知
  const admins = await resolveAllAdmins();
  const owner = await resolveOwnerForProperty(input.property_id);
  const recipients = owner ? [...admins, owner] : admins;
  await notify(
    "supply_requested",
    recipients,
    {
      subject: "備品補充の依頼があります",
      text: `スタッフから備品補充の依頼がありました: ${input.items}`,
    },
    { supply_request_id: data.id, property_id: input.property_id },
  );
  return data as SupplyRequest;
}

// 管理者向け: 全備品補充依頼を新しい順に取得する。
export async function listSupplyRequests(
  actor: Actor,
): Promise<SupplyRequest[]> {
  assertAdmin(actor);
  const db = createServiceClient();
  const { data, error } = await db
    .from("supply_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as SupplyRequest[];
}
