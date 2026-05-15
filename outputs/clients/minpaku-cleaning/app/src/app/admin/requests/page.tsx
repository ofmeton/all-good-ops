import { resolveAdminActor } from "@/lib/supabase-auth";
import { listRequests } from "@/lib/db/requests";
import { listProperties } from "@/lib/db/properties";
import { redirect } from "next/navigation";
import Link from "next/link";
import { RequestForm } from "./RequestForm";

const STATUS_LABEL: Record<string, string> = {
  unassigned: "未割当",
  assigned: "割当済み",
  in_progress: "清掃中",
  reported: "報告済み",
  confirmed: "確認済み",
  cancelled: "キャンセル",
};

export default async function RequestsPage() {
  const actor = await resolveAdminActor();
  if (!actor) redirect("/admin/login");
  const [requests, properties] = await Promise.all([
    listRequests(actor),
    listProperties(actor),
  ]);
  const nameById = new Map(properties.map((p) => [p.id, p.name]));
  return (
    <main className="space-y-4 max-w-3xl">
      <h1 className="text-xl font-bold">清掃依頼</h1>
      {properties.length === 0 ? (
        <p className="text-sm text-gray-500">先に物件を登録してください。</p>
      ) : (
        <RequestForm properties={properties} />
      )}
      <ul className="divide-y border rounded">
        {requests.map((r) => (
          <li key={r.id} className="px-3 py-2 text-sm flex justify-between">
            <Link href={`/admin/requests/${r.id}`} className="underline">
              {nameById.get(r.property_id) ?? "?"} / {r.checkin_date}〜
              {r.checkout_date}
            </Link>
            <span className="text-gray-500">
              {STATUS_LABEL[r.status] ?? r.status}
            </span>
          </li>
        ))}
        {requests.length === 0 && (
          <li className="px-3 py-2 text-sm text-gray-500">依頼はまだありません。</li>
        )}
      </ul>
    </main>
  );
}
