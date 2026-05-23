import { resolveAdminActor } from "@/lib/supabase-auth";
import { listAdmins } from "@/lib/db/admins";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { AdminForm } from "./AdminForm";

export default async function AdminsPage() {
  const actor = await resolveAdminActor();
  if (!actor || actor.role !== "admin") redirect("/admin/login");
  const admins = await listAdmins(actor);
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-ink-900">管理者管理</h1>
          <p className="text-[12.5px] text-ink-500 mt-0.5">
            登録管理者 <span className="num font-bold text-ink-800">{admins.length}</span> 名
          </p>
        </div>
      </div>

      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-8 w-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
            <Icon name="ShieldPlus" size={16} />
          </div>
          <h3 className="text-[14px] font-bold text-ink-900">管理者を追加</h3>
        </div>
        <AdminForm />
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead className="bg-ink-50 text-ink-500 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="text-left font-semibold px-5 py-2.5">管理者</th>
                <th className="text-left font-semibold px-2 py-2.5">メール</th>
                <th className="text-left font-semibold px-2 py-2.5">権限レベル</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {admins.map((a) => (
                <tr key={a.id} className="hover:bg-ink-50/50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={a.name?.slice(0, 1) ?? "管"} color="bg-ink-700" size={32} />
                      <span className="font-semibold text-ink-800">{a.name ?? "—"}</span>
                    </div>
                  </td>
                  <td className="px-2 py-3 num text-ink-700">{a.email}</td>
                  <td className="px-2 py-3">
                    <Badge tone="neutral">Lv. {a.role_level}</Badge>
                  </td>
                </tr>
              ))}
              {admins.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-5 py-10 text-center text-[12.5px] text-ink-500">
                    管理者はまだ登録されていません。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="text-[11px] text-ink-500">
        権限レベルの変更・削除は API 経由で行います（暫定 UI）。
      </p>
    </div>
  );
}
