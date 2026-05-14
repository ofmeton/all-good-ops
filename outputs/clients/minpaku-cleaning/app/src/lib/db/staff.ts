import "server-only";
import { createServiceClient } from "@/lib/supabase-server";
import { assertAdmin } from "@/lib/db/scope";
import type { Actor } from "@/lib/auth";

export type StaffInput = {
  name: string;
  line_user_id?: string;
  email?: string;
};

export type Staff = {
  id: string;
  name: string;
  line_user_id: string | null;
  email: string | null;
  property_ids: string[];
};

export async function listStaff(actor: Actor): Promise<Staff[]> {
  assertAdmin(actor);
  const db = createServiceClient();
  const { data, error } = await db
    .from("staff")
    .select("id, name, line_user_id, email, staff_assignments(property_id)")
    .is("archived_at", null)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((s: Record<string, unknown>) => ({
    id: s.id as string,
    name: s.name as string,
    line_user_id: s.line_user_id as string | null,
    email: s.email as string | null,
    property_ids: ((s.staff_assignments as { property_id: string }[]) ?? []).map(
      (a) => a.property_id,
    ),
  }));
}

async function syncAssignments(staffId: string, propertyIds: string[]) {
  const db = createServiceClient();
  await db.from("staff_assignments").delete().eq("staff_id", staffId);
  if (propertyIds.length > 0) {
    const { error } = await db
      .from("staff_assignments")
      .insert(propertyIds.map((property_id) => ({ staff_id: staffId, property_id })));
    if (error) throw error;
  }
}

export async function createStaff(
  actor: Actor,
  input: StaffInput,
  propertyIds: string[],
): Promise<Staff> {
  assertAdmin(actor);
  const db = createServiceClient();
  const { data, error } = await db.from("staff").insert(input).select().single();
  if (error) throw error;
  await syncAssignments(data.id, propertyIds);
  return { ...data, property_ids: propertyIds } as Staff;
}

export async function updateStaff(
  actor: Actor,
  id: string,
  patch: Partial<StaffInput>,
  propertyIds: string[],
): Promise<void> {
  assertAdmin(actor);
  const db = createServiceClient();
  const { error } = await db.from("staff").update(patch).eq("id", id);
  if (error) throw error;
  await syncAssignments(id, propertyIds);
}

export async function archiveStaff(actor: Actor, id: string): Promise<void> {
  assertAdmin(actor);
  const db = createServiceClient();
  const { data: active, error: checkError } = await db
    .from("cleaning_requests")
    .select("id")
    .eq("assigned_staff_id", id)
    .in("status", ["assigned", "in_progress"])
    .limit(1);
  if (checkError) throw checkError;
  if (active && active.length > 0) {
    throw new Error("稼働中の清掃依頼があるスタッフはアーカイブできません");
  }
  const { error } = await db
    .from("staff")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
