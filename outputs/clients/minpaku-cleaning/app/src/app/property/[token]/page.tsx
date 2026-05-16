import { resolveActorByToken } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase-server";
import { getPhotoSignedUrl } from "@/lib/storage";
import { notFound } from "next/navigation";

const STATUS_LABEL: Record<string, string> = {
  unassigned: "未割当",
  assigned: "割当済み",
  in_progress: "清掃中",
  reported: "報告済み",
  confirmed: "確認済み",
  cancelled: "キャンセル",
};

// オーナーの propertyId に紐づく履歴データをまとめて取得し、
// 写真は署名URLにする。閲覧専用なので action なし。
export default async function OwnerPropertyPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const actor = await resolveActorByToken(token);
  if (!actor || actor.role !== "owner") return null; // layout でガード済み

  const db = createServiceClient();
  const propertyId = actor.propertyId;

  // 物件情報
  const { data: property } = await db
    .from("properties")
    .select("id, name, address")
    .eq("id", propertyId)
    .maybeSingle();
  if (!property) notFound();

  // 依頼一覧（cancelled も含めて履歴として見せる）
  const { data: requests } = await db
    .from("cleaning_requests")
    .select("*")
    .eq("property_id", propertyId)
    .order("checkin_date", { ascending: false });
  const list = requests ?? [];

  // 各 reported/confirmed 依頼に紐づく完了報告と写真
  const reportedIds = list
    .filter((r) => r.status === "reported" || r.status === "confirmed")
    .map((r) => r.id);
  const reportsByRequest = new Map<
    string,
    {
      report: { id: string; checklist_result: { label: string; checked: boolean; note?: string }[]; submitted_at: string };
      photoUrls: string[];
    }
  >();
  if (reportedIds.length > 0) {
    const { data: reports } = await db
      .from("cleaning_reports")
      .select("id, request_id, checklist_result, submitted_at")
      .in("request_id", reportedIds);
    const reportList = (reports ?? []) as Array<{
      id: string;
      request_id: string;
      checklist_result: { label: string; checked: boolean; note?: string }[];
      submitted_at: string;
    }>;
    for (const r of reportList) {
      const { data: photos } = await db
        .from("report_photos")
        .select("storage_path")
        .eq("report_id", r.id);
      const photoUrls = await Promise.all(
        ((photos ?? []) as { storage_path: string }[]).map((p) =>
          getPhotoSignedUrl(p.storage_path),
        ),
      );
      reportsByRequest.set(r.request_id, { report: r, photoUrls });
    }
  }

  // 備品補充依頼の履歴
  const { data: supplies } = await db
    .from("supply_requests")
    .select("id, items, created_at")
    .eq("property_id", propertyId)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <main className="space-y-6 max-w-2xl">
      <h1 className="text-xl font-bold">
        {property.name}
        {property.address && (
          <span className="block text-sm font-normal text-gray-500">
            {property.address}
          </span>
        )}
      </h1>

      <section className="space-y-2">
        <h2 className="font-bold text-sm">清掃履歴</h2>
        <ul className="space-y-2">
          {list.map((r) => {
            const rep = reportsByRequest.get(r.id);
            return (
              <li key={r.id} className="border rounded p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>{r.checkin_date}〜{r.checkout_date}（{r.guest_count}名）</span>
                  <span className="text-gray-500">
                    {STATUS_LABEL[r.status as string] ?? r.status}
                  </span>
                </div>
                {rep && (
                  <>
                    <ul className="text-xs space-y-1">
                      {rep.report.checklist_result.map((item, i) => (
                        <li key={i}>
                          {item.checked ? "☑" : "☐"} {item.label}
                          {item.note ? ` — ${item.note}` : ""}
                        </li>
                      ))}
                    </ul>
                    {rep.photoUrls.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {rep.photoUrls.map((url, i) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={i}
                            src={url}
                            alt={`完了写真 ${i + 1}`}
                            className="w-24 h-24 object-cover rounded border"
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </li>
            );
          })}
          {list.length === 0 && (
            <li className="border rounded p-3 text-sm text-gray-500">
              依頼の履歴はまだありません。
            </li>
          )}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-bold text-sm">備品補充依頼の履歴</h2>
        <ul className="divide-y border rounded">
          {(supplies ?? []).map((s) => (
            <li key={s.id} className="px-3 py-2 text-sm">
              <div className="text-gray-500 text-xs">
                {new Date(s.created_at).toLocaleDateString("ja-JP")}
              </div>
              {s.items}
            </li>
          ))}
          {(supplies ?? []).length === 0 && (
            <li className="px-3 py-2 text-sm text-gray-500">
              備品補充依頼の履歴はまだありません。
            </li>
          )}
        </ul>
      </section>
    </main>
  );
}
