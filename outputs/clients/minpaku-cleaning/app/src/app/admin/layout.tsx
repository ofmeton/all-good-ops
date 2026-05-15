import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { resolveAdminActor } from "@/lib/supabase-auth";
import Link from "next/link";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const path = (await headers()).get("x-pathname") ?? "";
  // ログイン画面自身はガードしない
  if (path !== "/admin/login") {
    const actor = await resolveAdminActor();
    if (!actor) redirect("/admin/login");
  }
  return (
    <div className="min-h-screen">
      <nav className="border-b px-4 py-3 flex gap-4 text-sm">
        <Link href="/admin">ダッシュボード</Link>
        <Link href="/admin/requests">依頼</Link>
        <Link href="/admin/properties">物件</Link>
        <Link href="/admin/owners">オーナー</Link>
        <Link href="/admin/staff">スタッフ</Link>
        <Link href="/admin/supplies">備品</Link>
      </nav>
      <div className="p-4">{children}</div>
    </div>
  );
}
