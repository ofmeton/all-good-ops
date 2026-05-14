import "server-only";
import { createServiceClient } from "@/lib/supabase-server";
import { assertAdmin } from "@/lib/db/scope";
import { generateToken } from "@/lib/tokens";
import type { Actor } from "@/lib/auth";

export type TokenTarget =
  | { type: "owner"; propertyId: string }
  | { type: "staff"; staffId: string };

export type AccessToken = {
  id: string;
  token: string;
  type: "owner" | "staff";
  property_id: string | null;
  staff_id: string | null;
  revoked_at: string | null;
};

function targetFilter(target: TokenTarget) {
  return target.type === "owner"
    ? { type: "owner" as const, property_id: target.propertyId }
    : { type: "staff" as const, staff_id: target.staffId };
}

export async function getActiveToken(
  actor: Actor,
  target: TokenTarget,
): Promise<AccessToken | null> {
  assertAdmin(actor);
  const db = createServiceClient();
  const { data, error } = await db
    .from("access_tokens")
    .select("*")
    .match(targetFilter(target))
    .is("revoked_at", null)
    .maybeSingle();
  if (error) throw error;
  return data as AccessToken | null;
}

export async function issueToken(
  actor: Actor,
  target: TokenTarget,
): Promise<AccessToken> {
  assertAdmin(actor);
  const existing = await getActiveToken(actor, target);
  if (existing) {
    throw new Error("既に有効なトークンが存在します。再発行してください。");
  }
  const db = createServiceClient();
  const tokenValue = generateToken();
  const { data, error } =
    target.type === "owner"
      ? await db
          .from("access_tokens")
          .insert({ token: tokenValue, type: "owner" as const, property_id: target.propertyId })
          .select()
          .single()
      : await db
          .from("access_tokens")
          .insert({ token: tokenValue, type: "staff" as const, staff_id: target.staffId })
          .select()
          .single();
  if (error) throw error;
  return data as AccessToken;
}

export async function revokeToken(actor: Actor, id: string): Promise<void> {
  assertAdmin(actor);
  const db = createServiceClient();
  const { error } = await db
    .from("access_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

// 既存の有効トークンがあれば revoke し、新しいトークンを発行する。
export async function reissueToken(
  actor: Actor,
  target: TokenTarget,
): Promise<AccessToken> {
  assertAdmin(actor);
  const existing = await getActiveToken(actor, target);
  if (existing) await revokeToken(actor, existing.id);
  return issueToken(actor, target);
}
