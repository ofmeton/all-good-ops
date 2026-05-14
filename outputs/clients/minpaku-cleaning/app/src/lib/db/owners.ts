import "server-only";
import { createServiceClient } from "@/lib/supabase-server";
import { assertAdmin } from "@/lib/db/scope";
import type { Actor } from "@/lib/auth";

export type OwnerInput = {
  name: string;
  line_user_id?: string;
  email?: string;
};

export type Owner = {
  id: string;
  name: string;
  line_user_id: string | null;
  email: string | null;
};

export async function listOwners(actor: Actor): Promise<Owner[]> {
  assertAdmin(actor);
  const db = createServiceClient();
  const { data, error } = await db
    .from("owners")
    .select("id, name, line_user_id, email")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data as Owner[];
}

export async function createOwner(actor: Actor, input: OwnerInput): Promise<Owner> {
  assertAdmin(actor);
  const db = createServiceClient();
  const { data, error } = await db
    .from("owners")
    .insert(input)
    .select("id, name, line_user_id, email")
    .single();
  if (error) throw error;
  return data as Owner;
}

export async function updateOwner(
  actor: Actor,
  id: string,
  patch: Partial<OwnerInput>,
): Promise<void> {
  assertAdmin(actor);
  const db = createServiceClient();
  const { error } = await db.from("owners").update(patch).eq("id", id);
  if (error) throw error;
}
