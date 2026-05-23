import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { resolveAdminActor } from "@/lib/supabase-auth";
import { createServiceClient } from "@/lib/supabase-server";
import { AdminShell } from "@/components/admin/AdminShell";

type NavKey =
  | "dashboard"
  | "requests"
  | "properties"
  | "staff"
  | "owners"
  | "supplies"
  | "admins";

function pathToCurrent(path: string): NavKey {
  if (path.startsWith("/admin/requests")) return "requests";
  if (path.startsWith("/admin/properties")) return "properties";
  if (path.startsWith("/admin/staff")) return "staff";
  if (path.startsWith("/admin/owners")) return "owners";
  if (path.startsWith("/admin/supplies")) return "supplies";
  if (path.startsWith("/admin/admins")) return "admins";
  return "dashboard";
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const path = (await headers()).get("x-pathname") ?? "";

  // ログイン画面はガードもシェルも不要
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

  return (
    <AdminShell current={pathToCurrent(path)} userName={userName}>
      {children}
    </AdminShell>
  );
}
