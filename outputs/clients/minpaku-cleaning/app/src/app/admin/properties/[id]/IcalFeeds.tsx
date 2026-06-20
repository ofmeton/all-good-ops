"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import type { IcalFeed } from "@/lib/db/reservations";

const inputCls =
  "w-full h-10 px-3 rounded-lg ring-1 ring-ink-200 bg-white text-[13px] text-ink-800 outline-none placeholder:text-ink-400 focus:ring-brand-500 focus:ring-2";
const labelCls = "block text-[11.5px] text-ink-600 font-medium mb-1.5";

export function IcalFeeds({
  propertyId,
  feeds,
}: {
  propertyId: string;
  feeds: IcalFeed[];
}) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [otaLabel, setOtaLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const loading = busy || pending;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch(`/api/admin/properties/${propertyId}/ical-feeds`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, ota_label: otaLabel || undefined }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast.error(typeof body?.error === "string" ? body.error : "iCal URL の追加に失敗しました");
      return;
    }
    toast.success("iCal URL を追加しました");
    setUrl("");
    setOtaLabel("");
    startTransition(() => router.refresh());
  }

  async function remove(feed: IcalFeed) {
    if (!confirm(`${feed.ota_label ?? "iCal"} の URL を削除します。よろしいですか？`)) return;
    setBusy(true);
    const res = await fetch(
      `/api/admin/properties/${propertyId}/ical-feeds?feedId=${feed.id}`,
      { method: "DELETE" },
    );
    setBusy(false);
    if (!res.ok) {
      toast.error("iCal URL の削除に失敗しました");
      return;
    }
    toast.success("iCal URL を削除しました");
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="space-y-3">
        <label className="block">
          <span className={labelCls}>iCal URL</span>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            placeholder="https://..."
            className={inputCls}
          />
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
          <label className="block">
            <span className={labelCls}>OTAラベル（任意）</span>
            <input
              value={otaLabel}
              onChange={(e) => setOtaLabel(e.target.value)}
              placeholder="Airbnb / Booking.com など"
              className={inputCls}
            />
          </label>
          <Button type="submit" variant="secondary" icon="Plus" loading={loading}>
            追加
          </Button>
        </div>
      </form>

      <div className="divide-y divide-ink-100">
        {feeds.map((feed) => (
          <div key={feed.id} className="py-3 first:pt-0 last:pb-0">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                <Icon name="CalendarClock" size={15} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="text-[12.5px] font-semibold text-ink-800">
                    {feed.ota_label ?? "iCal"}
                  </div>
                  <div className="num text-[10.5px] text-ink-500">
                    {feed.last_status ?? "未同期"}
                  </div>
                </div>
                <div className="num text-[11px] text-ink-500 truncate mt-0.5">{feed.url}</div>
                <div className="num text-[10.5px] text-ink-400 mt-1">
                  最終取得: {feed.last_fetched_at ?? "未取得"}
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                icon="Trash2"
                loading={loading}
                onClick={() => remove(feed)}
                aria-label="iCal URL を削除"
              />
            </div>
          </div>
        ))}
        {feeds.length === 0 && (
          <p className="text-[12px] text-ink-500">
            iCal URL はまだ登録されていません。
          </p>
        )}
      </div>
    </div>
  );
}
