import { NextResponse } from "next/server";
import { fetchSlotPlan } from "@/lib/schedule-queries";

/**
 * POST /api/schedule/plan
 * body: { includeToday?: boolean, days?: number }
 * → Worker /admin/plan-slots を呼び { plan } を返す（当日トグル/再プラン用）。
 * fetchSlotPlan は fail-loud（throw）。worker 不達/失敗は 502 で UI に明示。
 */
export async function POST(req: Request) {
  let body: { includeToday?: unknown; days?: unknown };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const includeToday = body?.includeToday === true;
  const daysNum = Number(body?.days);
  const days = Number.isFinite(daysNum) && daysNum > 0 ? Math.floor(daysNum) : undefined;
  try {
    const plan = await fetchSlotPlan({ includeToday, days });
    return NextResponse.json({ ok: true, plan, includeToday });
  } catch (e) {
    return NextResponse.json(
      { error: `スロット提案に失敗しました: ${(e as Error).message}` },
      { status: 502 },
    );
  }
}
