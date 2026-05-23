import { resolveAdminActor } from "@/lib/supabase-auth";
import { listSupplyRequests } from "@/lib/db/supplies";
import { listProperties } from "@/lib/db/properties";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { PropertyPhoto } from "@/components/ui/PropertyPhoto";
import { Badge } from "@/components/ui/Badge";

const TONES = ["a", "b", "c", "d", "e", "f"] as const;
const toneOf = (idx: number) => TONES[((idx % TONES.length) + TONES.length) % TONES.length];

export default async function SuppliesPage() {
  const actor = await resolveAdminActor();
  if (!actor || actor.role !== "admin") redirect("/admin/login");
  const [supplies, properties] = await Promise.all([
    listSupplyRequests(actor),
    listProperties(actor),
  ]);
  const propIdxById = new Map(properties.map((p, i) => [p.id, i]));
  const propNameById = new Map(properties.map((p) => [p.id, p.name]));

  const pending = supplies.length;
  const handled = 0;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-ink-900">備品補充管理</h1>
          <p className="text-[12.5px] text-ink-500 mt-0.5">
            未対応 <span className="num font-bold text-st-warn-text">{pending}</span> 件 · 対応済み{" "}
            <span className="num font-bold text-st-confirmed-text">{handled}</span> 件
          </p>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead className="bg-ink-50 text-ink-500 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="text-left font-semibold px-5 py-2.5">日付</th>
                <th className="text-left font-semibold px-2 py-2.5">物件</th>
                <th className="text-left font-semibold px-2 py-2.5">品目</th>
                <th className="text-left font-semibold px-2 py-2.5">ステータス</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {supplies.map((s) => {
                const pIdx = propIdxById.get(s.property_id) ?? 0;
                const propName = propNameById.get(s.property_id) ?? "?";
                return (
                  <tr key={s.id} className="hover:bg-ink-50/50">
                    <td className="px-5 py-3 num text-ink-700">
                      {new Date(s.created_at).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" })}
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-2.5">
                        <PropertyPhoto tone={toneOf(pIdx)} size="xs" rounded="rounded-md" />
                        <span className="text-ink-800">{propName}</span>
                      </div>
                    </td>
                    <td className="px-2 py-3 text-ink-700">{s.items}</td>
                    <td className="px-2 py-3">
                      <Badge tone="warn">未対応</Badge>
                    </td>
                  </tr>
                );
              })}
              {supplies.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center">
                    <Icon name="Package" size={32} className="text-ink-400 mx-auto" />
                    <p className="text-[13px] text-ink-500 mt-2">
                      備品補充依頼はまだありません。
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
