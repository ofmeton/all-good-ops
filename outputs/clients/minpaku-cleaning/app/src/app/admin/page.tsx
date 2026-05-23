import { Fragment } from "react";
import Link from "next/link";
import { resolveAdminActor } from "@/lib/supabase-auth";
import { listRequests } from "@/lib/db/requests";
import { listProperties } from "@/lib/db/properties";
import { listStaff } from "@/lib/db/staff";
import { createServiceClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { StatusBadge, type Status } from "@/components/ui/StatusBadge";
import { PropertyPhoto } from "@/components/ui/PropertyPhoto";
import { Avatar } from "@/components/ui/Avatar";

// DB status → UI status マッピング（DB は in_progress、UI は cleaning）
const STATUS_MAP: Record<string, Status> = {
  unassigned: "unassigned",
  assigned: "assigned",
  in_progress: "cleaning",
  reported: "reported",
  confirmed: "confirmed",
  cancelled: "cancelled",
};

const TONES = ["a", "b", "c", "d", "e", "f"] as const;
type Tone = (typeof TONES)[number];
const toneOf = (idx: number): Tone => TONES[((idx % TONES.length) + TONES.length) % TONES.length];

// JST 基準で今週（月曜〜日曜）の日付配列 YYYY-MM-DD
function thisWeekJST(): string[] {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const todayStr = fmt.format(new Date());
  const today = new Date(todayStr + "T00:00:00+09:00");
  const dow = today.getDay(); // 0=日,1=月,...
  const offsetToMonday = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(today.getTime() + offsetToMonday * 86400000);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday.getTime() + i * 86400000);
    return fmt.format(d);
  });
}

export default async function AdminDashboard() {
  const actor = await resolveAdminActor();
  if (!actor) redirect("/admin/login");

  const [requests, properties, staff] = await Promise.all([
    listRequests(actor),
    listProperties(actor),
    listStaff(actor),
  ]);

  // 備品補充未対応数
  const db = createServiceClient();
  const { count: suppliesPending } = await db
    .from("supply_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  // 今週の日付
  const week = thisWeekJST();
  const weekStart = week[0];
  const weekEnd = week[6];

  // KPI
  const thisWeekCount = requests.filter(
    (r) => r.checkin_date >= weekStart && r.checkin_date <= weekEnd,
  ).length;
  const unassignedCount = requests.filter((r) => r.status === "unassigned").length;
  const reportedCount = requests.filter((r) => r.status === "reported").length;

  const kpis: {
    label: string;
    value: string;
    icon: IconName;
    accent: string;
  }[] = [
    { label: "今週の依頼数", value: String(thisWeekCount), icon: "ClipboardList", accent: "text-brand-600" },
    { label: "未割当件数", value: String(unassignedCount), icon: "UserX", accent: "text-st-unassigned-text" },
    { label: "完了報告待ち", value: String(reportedCount), icon: "FileCheck", accent: "text-st-reported-text" },
    { label: "備品補充未対応", value: String(suppliesPending ?? 0), icon: "Package", accent: "text-st-cleaning-text" },
  ];

  // 週間カレンダー: 物件 × 7日
  const grid = properties.slice(0, 5).map((p, i) => ({
    p,
    tone: toneOf(i),
    cells: week.map((d) =>
      requests.find((r) => r.property_id === p.id && r.checkin_date === d) ?? null,
    ),
  }));

  const dayLabels = week.map((d) => {
    const dt = new Date(d + "T00:00:00+09:00");
    const dow = ["日", "月", "火", "水", "木", "金", "土"][dt.getDay()];
    const md = `${dt.getMonth() + 1}/${dt.getDate()}`;
    return { date: d, md, dow };
  });

  // 直近 5 件
  const propIdxById = new Map(properties.map((p, i) => [p.id, i]));
  const staffById = new Map(staff.map((s) => [s.id, s]));
  const recent = [...requests]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 5)
    .map((r) => {
      const idx = propIdxById.get(r.property_id) ?? 0;
      const prop = properties.find((p) => p.id === r.property_id);
      return {
        ...r,
        propName: prop?.name ?? "?",
        tone: toneOf(idx),
        staffObj: r.assigned_staff_id ? staffById.get(r.assigned_staff_id) ?? null : null,
      };
    });

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-ink-900">ダッシュボード</h1>
          <p className="text-[12.5px] text-ink-500 mt-0.5">
            今週の運営状況サマリ・直近の依頼・週間カレンダー
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/requests">
            <Button variant="primary" icon="Plus">
              新規依頼
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <Card key={k.label} className="p-5">
            <div className="flex items-start justify-between">
              <div className="text-[12.5px] text-ink-500">{k.label}</div>
              <div
                className={`h-8 w-8 rounded-lg bg-ink-100 flex items-center justify-center ${k.accent}`}
              >
                <Icon name={k.icon} size={16} />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <div className="num text-[34px] font-extrabold text-ink-900 leading-none">
                {k.value}
              </div>
              <div className="text-[12px] text-ink-500">件</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Weekly calendar + Recent */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[14px] font-bold text-ink-900">週間カレンダー</h3>
              <span className="text-[11.5px] text-ink-500">
                物件別 · {dayLabels[0].md} — {dayLabels[6].md}
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <div className="grid grid-cols-[120px_repeat(7,minmax(64px,1fr))] gap-1.5 min-w-[680px]">
              <div></div>
              {dayLabels.map((d) => (
                <div
                  key={d.date}
                  className="num text-center pb-1.5 border-b border-ink-100 leading-tight"
                >
                  <div className="text-[10.5px] font-semibold text-ink-700">{d.md}</div>
                  <div
                    className={`text-[9.5px] ${
                      d.dow === "土"
                        ? "text-blue-500"
                        : d.dow === "日"
                          ? "text-rose-500"
                          : "text-ink-400"
                    }`}
                  >
                    {d.dow}
                  </div>
                </div>
              ))}
              {grid.map((row) => (
                <Fragment key={row.p.id}>
                  <div className="flex items-center gap-2 text-[12.5px] text-ink-800 font-medium pr-2 min-w-0">
                    <PropertyPhoto tone={row.tone} size="xs" rounded="rounded-md" />
                    <span className="truncate">{row.p.name}</span>
                  </div>
                  {row.cells.map((c, i) => (
                    <div
                      key={i}
                      className="h-9 rounded-md bg-ink-50/60 ring-1 ring-ink-100 flex items-center justify-center px-1"
                    >
                      {c && (
                        <Link
                          href={`/admin/requests/${c.id}`}
                          aria-label={`${row.p.name} ${c.checkin_date}`}
                        >
                          <StatusBadge status={STATUS_MAP[c.status]} size="sm" dot={false} />
                        </Link>
                      )}
                    </div>
                  ))}
                </Fragment>
              ))}
              {grid.length === 0 && (
                <div className="col-span-8 text-[12px] text-ink-500 text-center py-8">
                  物件と依頼が登録されると、ここに週間スケジュールが表示されます。
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[14px] font-bold text-ink-900">直近の依頼</h3>
            <Link
              href="/admin/requests"
              className="text-[11.5px] text-brand-600 font-medium hover:underline"
            >
              すべて見る →
            </Link>
          </div>
          <ul className="space-y-2.5">
            {recent.map((r) => (
              <li key={r.id} className="flex items-center gap-3 py-1">
                <PropertyPhoto tone={r.tone} size="xs" rounded="rounded-md" />
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/admin/requests/${r.id}`}
                    className="flex items-center gap-2 hover:underline"
                  >
                    <span className="text-[12.5px] font-semibold text-ink-800 truncate">
                      {r.propName}
                    </span>
                    <span className="num text-[10.5px] text-ink-400 shrink-0">
                      #{r.id.slice(0, 6)}
                    </span>
                  </Link>
                  <div className="num text-[11px] text-ink-500">
                    {r.checkin_date}〜{r.checkout_date}
                  </div>
                </div>
                {r.staffObj && (
                  <Avatar
                    name={r.staffObj.name.slice(0, 1)}
                    color="bg-brand-600"
                    size={22}
                  />
                )}
                <StatusBadge status={STATUS_MAP[r.status]} size="sm" />
              </li>
            ))}
            {recent.length === 0 && (
              <li className="text-[12px] text-ink-500 text-center py-6">
                直近の依頼はありません。
              </li>
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}
