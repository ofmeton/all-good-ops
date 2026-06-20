import "server-only";
import { createServiceClient } from "@/lib/supabase-server";
import { assertAdmin } from "@/lib/db/scope";
import type { Actor } from "@/lib/auth";

export type RequestRecipient = {
  request_id: string;
  staff_id: string;
  excluded: boolean;
  notified_at: string | null;
  staff: {
    id: string;
    name: string;
    email: string | null;
    line_user_id: string | null;
  } | null;
};

export async function listRecipients(
  actor: Actor,
  requestId: string,
): Promise<RequestRecipient[]> {
  assertAdmin(actor);
  const db = createServiceClient();
  const { data, error } = await db
    .from("cleaning_request_recipients")
    .select("request_id, staff_id, excluded, notified_at, staff:staff_id(id, name, email, line_user_id)")
    .eq("request_id", requestId)
    .order("staff_id", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as RequestRecipient[];
}
