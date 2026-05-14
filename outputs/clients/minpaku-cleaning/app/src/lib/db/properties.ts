import "server-only";
import { createServiceClient } from "@/lib/supabase-server";
import { assertAdmin } from "@/lib/db/scope";
import type { Actor } from "@/lib/auth";

export type PropertyInput = {
  owner_id: string;
  name: string;
  address?: string;
  access_info_note?: string;
  checklist_template?: unknown[];
};

export type Property = {
  id: string;
  owner_id: string;
  name: string;
  address: string | null;
  access_info_note: string | null;
  checklist_template: unknown[];
  archived_at: string | null;
};

export async function listProperties(actor: Actor): Promise<Property[]> {
  assertAdmin(actor);
  const db = createServiceClient();
  const { data, error } = await db
    .from("properties")
    .select("*")
    .is("archived_at", null)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data as Property[];
}

export async function createProperty(actor: Actor, input: PropertyInput): Promise<Property> {
  assertAdmin(actor);
  const db = createServiceClient();
  const { data, error } = await db.from("properties").insert(input).select().single();
  if (error) throw error;
  return data as Property;
}

export async function updateProperty(
  actor: Actor,
  id: string,
  patch: Partial<PropertyInput>,
): Promise<void> {
  assertAdmin(actor);
  const db = createServiceClient();
  const { error } = await db.from("properties").update(patch).eq("id", id);
  if (error) throw error;
}

export async function archiveProperty(actor: Actor, id: string): Promise<void> {
  assertAdmin(actor);
  const db = createServiceClient();
  const { error } = await db
    .from("properties")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
