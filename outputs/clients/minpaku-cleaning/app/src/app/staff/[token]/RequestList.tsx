"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { StatusBadge, type Status } from "@/components/ui/StatusBadge";
import { PropertyPhoto } from "@/components/ui/PropertyPhoto";

type Request = {
  id: string;
  property_name: string;
  property_id: string;
  checkin_date: string;
  checkout_date: string;
  status: string;
  assigned_staff_id: string | null;
};

const STATUS_MAP: Record<string, Status> = {
  unassigned: "unassigned",
  assigned: "assigned",
  in_progress: "cleaning",
  reported: "reported",
  confirmed: "confirmed",
  cancelled: "cancelled",
};
const TONES = ["a", "b", "c", "d", "e", "f"] as const;
const toneOf = (idx: number) => TONES[((idx % TONES.length) + TONES.length) % TONES.length];

export function RequestList({ token, requests }: { token: string; requests: Request[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function claim(id: string) {
    setBusyId(id);
    setError(null);
    const res = await fetch(`/api/staff/requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, action: "claim" }),
    });
    setBusyId(null);
    if (!res.ok) {
      const b = await res.json().catch(() => null);
      setError(typeof b?.error === "string" ? b.error : "承認に失敗しました");
      return;
    }
    router.refresh();
  }

  const unassigned = requests.filter((r) => r.status === "unassigned");
  const assigned = requests.filter((r) => r.status !== "unassigned" && r.status !== "cancelled");

  const propIdMap = new Map<string, number>();
  requests.forEach((r) => {
    if (!propIdMap.has(r.property_id)) propIdMap.set(r.property_id, propIdMap.size);
  });

  return (
    <div className="space-y-5">
      {error && (
        <p className="text-[12.5px] text-st-cancelled-text bg-st-cancelled-bg px-3 py-2 rounded-lg">
          {error}
        </p>
      )}

      <section>
        <h3 className="text-[13px] font-bold text-ink-900 flex items-center gap-2 mb-3">
          <StatusBadge status="unassigned" size="sm" />
          未割当の依頼{" "}
          <span className="num text-ink-500 font-semibold">({unassigned.length})</span>
        </h3>
        {unassigned.length === 0 ? (
          <Card className="p-5 text-center text-[12px] text-ink-500">
            未割当の依頼はありません。
          </Card>
        ) : (
          <ul className="space-y-2.5">
            {unassigned.map((r) => {
              const idx = propIdMap.get(r.property_id) ?? 0;
              return (
                <Card key={r.id} className="p-3.5">
                  <div className="flex gap-3">
                    <PropertyPhoto
                      tone={toneOf(idx)}
                      size="lg"
                      rounded="rounded-xl"
                      className="!h-[68px] !w-[68px]"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-bold text-ink-900 truncate">
                        {r.property_name}
                      </div>
                      <div className="num text-[11.5px] text-ink-600 mt-0.5 flex items-center gap-1">
                        <Icon name="Clock" size={11} className="text-ink-400" />
                        {r.checkin_date}〜{r.checkout_date}
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          icon="Check"
                          disabled={busyId === r.id}
                          onClick={() => claim(r.id)}
                        >
                          {busyId === r.id ? "承認中..." : "承認する"}
                        </Button>
                        <Link
                          href={`/staff/${token}/requests/${r.id}`}
                          className="text-[11.5px] text-brand-600 font-medium hover:underline"
                        >
                          詳細 →
                        </Link>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h3 className="text-[13px] font-bold text-ink-900 mb-3">
          自分の割当中の依頼{" "}
          <span className="num text-ink-500 font-semibold">({assigned.length})</span>
        </h3>
        {assigned.length === 0 ? (
          <Card className="p-5 text-center text-[12px] text-ink-500">
            割当中の依頼はありません。
          </Card>
        ) : (
          <ul className="space-y-2">
            {assigned.map((r) => {
              const idx = propIdMap.get(r.property_id) ?? 0;
              return (
                <Link key={r.id} href={`/staff/${token}/requests/${r.id}`}>
                  <Card className="p-3.5 hover:shadow-card-hi transition-shadow">
                    <div className="flex items-center gap-3">
                      <PropertyPhoto
                        tone={toneOf(idx)}
                        size="md"
                        rounded="rounded-xl"
                        className="!h-14 !w-14"
                      />
                      <StatusBadge status={STATUS_MAP[r.status]} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] font-bold text-ink-900 truncate">
                          {r.property_name}
                        </div>
                        <div className="num text-[11.5px] text-ink-600 mt-0.5 flex items-center gap-1">
                          <Icon name="Clock" size={11} className="text-ink-400" />
                          {r.checkin_date}〜{r.checkout_date}
                        </div>
                      </div>
                      <Icon name="ChevronRight" size={14} className="text-ink-400" />
                    </div>
                  </Card>
                </Link>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
