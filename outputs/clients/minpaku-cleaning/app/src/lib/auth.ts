import "server-only";
import { createServiceClient } from "@/lib/supabase-server";

export type Actor =
  | { role: "admin"; adminId: string; roleLevel: number }
  | { role: "owner"; ownerId: string; propertyId: string }
  | { role: "staff"; staffId: string };

// トークン文字列からオーナー/スタッフのアクターを解決する。
// revoke済み・存在しないトークンは null。
export async function resolveActorByToken(token: string): Promise<Actor | null> {
  const db = createServiceClient();
  const { data } = await db
    .from("access_tokens")
    .select("type, property_id, staff_id, revoked_at")
    .eq("token", token)
    .maybeSingle();

  if (!data || data.revoked_at) return null;

  if (data.type === "owner" && data.property_id) {
    const { data: property } = await db
      .from("properties")
      .select("owner_id")
      .eq("id", data.property_id)
      .maybeSingle();
    if (!property) return null;
    return { role: "owner", ownerId: property.owner_id, propertyId: data.property_id };
  }

  if (data.type === "staff" && data.staff_id) {
    return { role: "staff", staffId: data.staff_id };
  }

  return null;
}
