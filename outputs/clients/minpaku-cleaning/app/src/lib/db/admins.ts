import "server-only";
import { createServiceClient } from "@/lib/supabase-server";
import { assertAdmin } from "@/lib/db/scope";
import type { Actor } from "@/lib/auth";

export type Admin = {
  id: string;
  email: string;
  name: string;
  role_level: number;
  created_at: string;
};

export type CreateAdminInput = {
  email: string;
  name: string;
  role_level: number;
  password: string;
};

export async function listAdmins(actor: Actor): Promise<Admin[]> {
  assertAdmin(actor);
  const db = createServiceClient();
  const { data, error } = await db
    .from("admins")
    .select("id, email, name, role_level, created_at")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data as Admin[];
}

// 管理者を追加: auth.users を作って admins 行を紐付ける。
// auth.users 作成失敗時は admins への insert もせず例外を投げる。
export async function createAdmin(
  actor: Actor,
  input: CreateAdminInput,
): Promise<Admin> {
  assertAdmin(actor);
  const db = createServiceClient();
  const { data: created, error: userError } = await db.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
  });
  if (userError || !created.user) {
    throw new Error(`auth user 作成失敗: ${userError?.message ?? "unknown"}`);
  }
  const { data, error } = await db
    .from("admins")
    .insert({
      id: created.user.id,
      email: input.email,
      name: input.name,
      role_level: input.role_level,
    })
    .select("id, email, name, role_level, created_at")
    .single();
  if (error) {
    // admins 失敗時は auth user もロールバックする
    await db.auth.admin.deleteUser(created.user.id);
    throw error;
  }
  return data as Admin;
}

export async function updateAdminRoleLevel(
  actor: Actor,
  id: string,
  role_level: number,
): Promise<void> {
  assertAdmin(actor);
  const db = createServiceClient();
  const { error } = await db
    .from("admins")
    .update({ role_level })
    .eq("id", id);
  if (error) throw error;
}

// 削除: auth.users を消すと admins は ON DELETE CASCADE で消える。
export async function deleteAdmin(actor: Actor, id: string): Promise<void> {
  assertAdmin(actor);
  const db = createServiceClient();
  const { error } = await db.auth.admin.deleteUser(id);
  if (error) throw error;
}
