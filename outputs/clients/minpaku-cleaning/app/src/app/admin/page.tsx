import { resolveAdminActor } from "@/lib/supabase-auth";
import { listRequests } from "@/lib/db/requests";
import { listProperties } from "@/lib/db/properties";
import { redirect } from "next/navigation";
import Link from "next/link";

const STATUS_LABEL: Record<string, string> = {
  unassigned: "未割当",
  assigned: "割当済み",
  in_progress: "清掃中",
  reported: "報告済み",
  confirmed: "確認済み",
  cancelled: "キャンセル",
};

// 当月のカレンダーグリッドを返す。weeks[week][day] = YYYY-MM-DD or null（前月/翌月の埋め）。
function monthGrid(year: number, month: number): (string | null)[][] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startDow = first.getDay(); // 日曜=0
  const totalDays = last.getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) {
    const m = String(month + 1).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    cells.push(`${year}-${m}-${dd}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export default async function AdminDashboard() {
  const actor = await resolveAdminActor();
  if (!actor) redirect("/admin/login");
  const [requests, properties] = await Promise.all([
    listRequests(actor),
    listProperties(actor),
  ]);
  const nameById = new Map(properties.map((p) => [p.id, p.name]));

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const weeks = monthGrid(year, month);

  // 当月の依頼を日付ごとにまとめる（checkin_date 基準）。
  const byDate = new Map<string, typeof requests>();
  for (const r of requests) {
    if (!byDate.has(r.checkin_date)) byDate.set(r.checkin_date, []);
    byDate.get(r.checkin_date)!.push(r);
  }

  const todayStr = now.toISOString().slice(0, 10);
  const upcoming = requests
    .filter((r) => r.checkin_date >= todayStr && r.status !== "cancelled")
    .slice(0, 10);

  return (
    <main className="space-y-6 max-w-4xl">
      <h1 className="text-xl font-bold">
        ダッシュボード（{year}年{month + 1}月）
      </h1>

      <section className="border rounded p-3">
        <div className="grid grid-cols-7 gap-1 text-xs">
          {["日", "月", "火", "水", "木", "金", "土"].map((w) => (
            <div key={w} className="text-center text-gray-500">{w}</div>
          ))}
          {weeks.flat().map((d, i) => (
            <div
              key={i}
              className={`min-h-16 border rounded p-1 ${d ? "" : "bg-gray-50"}`}
            >
              {d && (
                <>
                  <div className="text-[10px] text-gray-500">
                    {Number(d.slice(-2))}
                  </div>
                  {(byDate.get(d) ?? []).map((r) => (
                    <Link
                      key={r.id}
                      href={`/admin/requests/${r.id}`}
                      className="block truncate underline text-[10px]"
                      title={`${nameById.get(r.property_id) ?? "?"} — ${STATUS_LABEL[r.status] ?? r.status}`}
                    >
                      {nameById.get(r.property_id) ?? "?"}
                    </Link>
                  ))}
                </>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-bold text-sm">今後の依頼（最大10件）</h2>
        <ul className="divide-y border rounded">
          {upcoming.map((r) => (
            <li key={r.id} className="px-3 py-2 text-sm flex justify-between">
              <Link href={`/admin/requests/${r.id}`} className="underline">
                {nameById.get(r.property_id) ?? "?"} / {r.checkin_date}〜{r.checkout_date}
              </Link>
              <span className="text-gray-500">
                {STATUS_LABEL[r.status] ?? r.status}
              </span>
            </li>
          ))}
          {upcoming.length === 0 && (
            <li className="px-3 py-2 text-sm text-gray-500">
              今後の依頼はありません。
            </li>
          )}
        </ul>
      </section>
    </main>
  );
}
