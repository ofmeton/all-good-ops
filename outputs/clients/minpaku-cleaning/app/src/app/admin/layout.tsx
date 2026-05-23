import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { resolveAdminActor } from "@/lib/supabase-auth";
import { createServiceClient } from "@/lib/supabase-server";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const path = (await headers()).get("x-pathname") ?? "";

  // ログイン画面はガードもシェルも不要（proxy.ts が x-pathname を載せる前提）
  if (path === "/admin/login") {
    return <>{children}</>;
  }

  const actor = await resolveAdminActor();
  if (!actor || actor.role !== "admin") redirect("/admin/login");

  // 表示名は admins テーブルから引く（未取得時は "管"）
  const db = createServiceClient();
  const { data: admin } = await db
    .from("admins")
    .select("name, email")
    .eq("id", actor.adminId)
    .maybeSingle();
  const userName = admin?.name ?? admin?.email ?? "管";

  return <AdminShell userName={userName}>{children}</AdminShell>;
}
