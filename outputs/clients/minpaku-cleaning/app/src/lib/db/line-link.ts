import "server-only";
import { createServiceClient } from "@/lib/supabase-server";
import { generateToken } from "@/lib/tokens";

export type LineLinkTarget =
  | { type: "staff"; staffId: string }
  | { type: "owner"; ownerId: string };

type LineLinkNonceRow = {
  target_type: "staff" | "owner";
  staff_id: string | null;
  owner_id: string | null;
};

function rowToTarget(row: LineLinkNonceRow): LineLinkTarget | null {
  if (row.target_type === "staff" && row.staff_id) {
    return { type: "staff", staffId: row.staff_id };
  }
  if (row.target_type === "owner" && row.owner_id) {
    return { type: "owner", ownerId: row.owner_id };
  }
  return null;
}

export async function issueNonce(target: LineLinkTarget): Promise<string> {
  const db = createServiceClient();
  const nonce = generateToken();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const { error } =
    target.type === "staff"
      ? await db.from("line_link_nonces").insert({
          nonce,
          target_type: "staff" as const,
          staff_id: target.staffId,
          expires_at: expiresAt,
        })
      : await db.from("line_link_nonces").insert({
          nonce,
          target_type: "owner" as const,
          owner_id: target.ownerId,
          expires_at: expiresAt,
        });
  if (error) throw error;
  return nonce;
}

export async function consumeNonce(nonce: string): Promise<LineLinkTarget | null> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("line_link_nonces")
    .update({ consumed_at: new Date().toISOString() })
    .eq("nonce", nonce)
    .is("consumed_at", null)
    .gt("expires_at", new Date().toISOString())
    .select("target_type, staff_id, owner_id")
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return rowToTarget(data as LineLinkNonceRow);
}

export async function bindLineUser(
  target: LineLinkTarget,
  lineUserId: string,
): Promise<void> {
  const db = createServiceClient();
  const query =
    target.type === "staff"
      ? db.from("staff").update({ line_user_id: lineUserId }).eq("id", target.staffId)
      : db.from("owners").update({ line_user_id: lineUserId }).eq("id", target.ownerId);
  const { error } = await query;
  if (error) throw error;
}

export async function getLineLinkReturnPath(
  target: LineLinkTarget,
): Promise<string | null> {
  const db = createServiceClient();
  if (target.type === "staff") {
    const { data, error } = await db
      .from("access_tokens")
      .select("token")
      .eq("type", "staff")
      .eq("staff_id", target.staffId)
      .is("revoked_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data?.token ? `/staff/${data.token}` : null;
  }

  const { data: properties, error: propertyError } = await db
    .from("properties")
    .select("id")
    .eq("owner_id", target.ownerId)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(20);
  if (propertyError) throw propertyError;
  const propertyIds = (properties ?? []).map((p) => p.id as string);
  if (propertyIds.length === 0) return null;

  const { data, error } = await db
    .from("access_tokens")
    .select("token")
    .eq("type", "owner")
    .in("property_id", propertyIds)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.token ? `/property/${data.token}` : null;
}
