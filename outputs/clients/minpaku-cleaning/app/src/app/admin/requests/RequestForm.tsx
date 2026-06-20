"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";

type Property = { id: string; name: string };
type Staff = { id: string; name: string; property_ids: string[] };

const inputCls =
  "w-full h-10 px-3 rounded-lg ring-1 ring-ink-200 bg-white text-[13px] text-ink-800 outline-none placeholder:text-ink-400 focus:ring-brand-500 focus:ring-2";
const labelCls = "block text-[11.5px] text-ink-600 font-medium mb-1.5";

export function RequestForm({
  properties,
  staff,
}: {
  properties: Property[];
  staff: Staff[];
}) {
  const router = useRouter();
  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? "");
  const [checkin, setCheckin] = useState("");
  const [checkout, setCheckout] = useState("");
  const [guestCount, setGuestCount] = useState(1);
  const [memo, setMemo] = useState("");
  const [excludedStaffIds, setExcludedStaffIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();

  const candidateStaff = staff.filter((s) => s.property_ids.includes(propertyId));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/admin/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        property_id: propertyId,
        checkin_date: checkin,
        checkout_date: checkout,
        guest_count: guestCount,
        option_memo: memo || undefined,
        staff_candidate_ids: candidateStaff.map((s) => s.id),
        excluded_staff_ids: excludedStaffIds,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast.error(typeof body?.error === "string" ? body.error : "登録に失敗しました");
      return;
    }
    toast.success("依頼を作成しました");
    setCheckin("");
    setCheckout("");
    setGuestCount(1);
    setMemo("");
    setExcludedStaffIds([]);
    startTransition(() => router.refresh());
  }

  const loading = busy || pending;

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <label className="block">
          <span className={labelCls}>物件</span>
          <select
            value={propertyId}
            onChange={(e) => {
              setPropertyId(e.target.value);
              setExcludedStaffIds([]);
            }}
            className={inputCls}
          >
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={labelCls}>チェックイン</span>
          <input
            type="date"
            value={checkin}
            onChange={(e) => setCheckin(e.target.value)}
            required
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className={labelCls}>チェックアウト</span>
          <input
            type="date"
            value={checkout}
            onChange={(e) => setCheckout(e.target.value)}
            required
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className={labelCls}>人数</span>
          <input
            type="number"
            min={1}
            value={guestCount}
            onChange={(e) => setGuestCount(Number(e.target.value))}
            required
            className={inputCls}
          />
        </label>
      </div>
      <label className="block">
        <span className={labelCls}>オプションメモ（任意）</span>
        <input
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="特記事項があれば入力"
          className={inputCls}
        />
      </label>
      <div>
        <span className={labelCls}>送信対象スタッフ</span>
        {candidateStaff.length === 0 ? (
          <p className="text-[12px] text-st-cancelled-text bg-st-cancelled-bg px-3 py-2 rounded-lg">
            この物件に担当スタッフがいません。
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {candidateStaff.map((s) => {
              const excluded = excludedStaffIds.includes(s.id);
              return (
                <label
                  key={s.id}
                  className="flex items-center justify-between gap-3 rounded-lg ring-1 ring-ink-200 px-3 py-2 bg-white"
                >
                  <span className="text-[13px] font-medium text-ink-800">{s.name}</span>
                  <span className="inline-flex items-center gap-2 text-[12px] text-ink-600">
                    対象外
                    <input
                      type="checkbox"
                      checked={excluded}
                      onChange={(e) =>
                        setExcludedStaffIds((prev) =>
                          e.target.checked
                            ? [...prev, s.id]
                            : prev.filter((id) => id !== s.id),
                        )
                      }
                    />
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>
      <div className="flex justify-end">
        <Button
          type="submit"
          variant="primary"
          icon="Check"
          loading={loading}
          disabled={candidateStaff.length === 0}
        >
          {loading ? "作成中..." : "依頼を作成"}
        </Button>
      </div>
    </form>
  );
}
