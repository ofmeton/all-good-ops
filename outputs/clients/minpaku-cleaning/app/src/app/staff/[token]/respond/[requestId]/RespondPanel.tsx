"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

type Props = {
  token: string;
  requestId: string;
  status: string;
  offerDateStart: string | null;
  offerDateEnd: string | null;
  currentAnswer: "available" | "unavailable" | null;
  currentOfferedDate: string | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function dateOptions(start: string, end: string): string[] {
  const out: string[] = [];
  for (
    let ms = new Date(`${start}T00:00:00+09:00`).getTime();
    ms <= new Date(`${end}T00:00:00+09:00`).getTime();
    ms += DAY_MS
  ) {
    out.push(new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(ms)));
  }
  return out;
}

export function RespondPanel({
  token,
  requestId,
  status,
  offerDateStart,
  offerDateEnd,
  currentAnswer,
  currentOfferedDate,
}: Props) {
  const router = useRouter();
  const options = useMemo(
    () => (offerDateStart && offerDateEnd ? dateOptions(offerDateStart, offerDateEnd) : []),
    [offerDateStart, offerDateEnd],
  );
  const [answer, setAnswer] = useState<"available" | "unavailable">(
    currentAnswer ?? "available",
  );
  const [offeredDate, setOfferedDate] = useState(
    currentOfferedDate ?? options[0] ?? "",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(nextAnswer = answer) {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/staff/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        request_id: requestId,
        answer: nextAnswer,
        offered_date: nextAnswer === "available" ? offeredDate : null,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(typeof body?.error === "string" ? body.error : "回答に失敗しました");
      return;
    }
    setDone(true);
    router.refresh();
  }

  if (status !== "unassigned") {
    return (
      <Card className="p-5 bg-ink-50">
        <div className="flex items-center gap-3">
          <Icon name="CircleCheckBig" size={20} className="text-brand-600" />
          <div>
            <div className="text-[13px] font-bold text-ink-900">回答受付は終了しました</div>
            <div className="text-[11.5px] text-ink-500">一覧で現在の割当状況を確認できます。</div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <h2 className="text-[15px] font-bold text-ink-900 mb-1">都合を回答</h2>
      <p className="text-[12px] text-ink-500 mb-4">
        清掃に入れる日を選ぶか、入れない場合は不可で回答してください。
      </p>

      {error && (
        <p className="text-[12.5px] text-st-cancelled-text bg-st-cancelled-bg px-3 py-2 rounded-lg mb-3">
          {error}
        </p>
      )}
      {done && (
        <p className="text-[12.5px] text-st-confirmed-text bg-st-confirmed-bg px-3 py-2 rounded-lg mb-3">
          回答を送信しました。
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          type="button"
          onClick={() => setAnswer("available")}
          className={`h-10 rounded-lg text-[13px] font-bold ring-1 ${
            answer === "available"
              ? "bg-brand-600 text-white ring-brand-600"
              : "bg-white text-ink-700 ring-ink-200"
          }`}
        >
          入れる
        </button>
        <button
          type="button"
          onClick={() => setAnswer("unavailable")}
          className={`h-10 rounded-lg text-[13px] font-bold ring-1 ${
            answer === "unavailable"
              ? "bg-ink-800 text-white ring-ink-800"
              : "bg-white text-ink-700 ring-ink-200"
          }`}
        >
          入れない
        </button>
      </div>

      {answer === "available" && (
        <label className="block mb-4">
          <span className="block text-[11.5px] text-ink-600 font-medium mb-1.5">
            清掃可能日
          </span>
          <select
            value={offeredDate}
            onChange={(e) => setOfferedDate(e.target.value)}
            className="w-full h-10 px-3 rounded-lg ring-1 ring-ink-200 bg-white text-[13px] text-ink-800 outline-none focus:ring-brand-500 focus:ring-2"
          >
            {options.map((date) => (
              <option key={date} value={date}>
                {date}
              </option>
            ))}
          </select>
        </label>
      )}

      <Button
        variant={answer === "available" ? "primary" : "secondary"}
        size="xl"
        icon="Send"
        disabled={busy || (answer === "available" && !offeredDate)}
        onClick={() => submit()}
        className="w-full"
      >
        {busy ? "送信中..." : "回答を送信"}
      </Button>
    </Card>
  );
}
