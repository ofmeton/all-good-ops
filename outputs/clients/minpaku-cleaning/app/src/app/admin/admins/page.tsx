import { resolveAdminActor } from "@/lib/supabase-auth";
import { listAdmins } from "@/lib/db/admins";
import { redirect } from "next/navigation";
import { AdminForm } from "./AdminForm";

export default async function AdminsPage() {
  const actor = await resolveAdminActor();
  if (!actor) redirect("/admin/login");
  const admins = await listAdmins(actor);
  return (
    <main className="space-y-4 max-w-2xl">
      <h1 className="text-xl font-bold">管理者管理</h1>
      <AdminForm />
      <ul className="divide-y border rounded">
        {admins.map((a) => (
          <li key={a.id} className="px-3 py-2 text-sm flex justify-between">
            <div>
              {a.name} <span className="text-gray-500">— {a.email}</span>
            </div>
            <div className="text-gray-500 text-xs">権限 {a.role_level}</div>
          </li>
        ))}
      </ul>
      <p className="text-xs text-gray-500">
        権限レベルの変更・削除は当面 API 経由（Plan 3 仕上げ段階の暫定 UI）。
      </p>
    </main>
  );
}
