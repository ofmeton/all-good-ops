import { NextResponse } from "next/server";
import { setProposalDecision, type ApplyDescriptor } from "@/lib/proposals-queries";
import { TIER_T_PARAM_IDS } from "@/lib/proposal-tier-t-params";

export const dynamic = "force-dynamic";

function validateApply(raw: unknown): { ok: true; value: ApplyDescriptor | null } | { ok: false; error: string } {
  if (raw == null) return { ok: true, value: null };
  if (typeof raw !== "object") return { ok: false, error: "apply は object で指定してください" };
  const o = raw as Record<string, unknown>;
  if (typeof o.paramId !== "string" || typeof o.value !== "number") {
    return { ok: false, error: "apply は {paramId:string, value:number} 形式で指定してください" };
  }
  if (!(TIER_T_PARAM_IDS as readonly string[]).includes(o.paramId)) {
    return { ok: false, error: `apply.paramId は tier-T 許可レバーのみ: ${o.paramId}` };
  }
  if (o.value < 0 || o.value > 1) {
    return { ok: false, error: "apply.value は 0〜1 の比率で指定してください" };
  }
  return { ok: true, value: { paramId: o.paramId, value: o.value } };
}

export async function POST(req: Request) {
  let body: { ids?: string[]; decision?: "accept" | "reject"; reason?: unknown; apply?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const ids = body.ids ?? [];
  const decision = body.decision;
  if (!decision || !["accept", "reject"].includes(decision) || ids.length === 0) {
    return NextResponse.json({ error: "ids/decision required" }, { status: 400 });
  }
  const accepted = decision === "accept";

  // reason: 任意（2000字上限）
  let reason: string | null = null;
  if (body.reason != null) {
    if (typeof body.reason !== "string") {
      return NextResponse.json({ error: "reason は文字列で指定してください" }, { status: 400 });
    }
    const trimmed = body.reason.trim();
    if (trimmed.length > 2000) {
      return NextResponse.json({ error: `reason が長すぎます（${trimmed.length}/2000字）` }, { status: 400 });
    }
    reason = trimmed.length > 0 ? trimmed : null;
  }

  // apply: accept かつ単一提案のときのみ
  let apply: ApplyDescriptor | null = null;
  if (body.apply != null) {
    if (!accepted || ids.length !== 1) {
      return NextResponse.json({ error: "apply は単一提案の accept 時のみ指定できます" }, { status: 400 });
    }
    const v = validateApply(body.apply);
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
    apply = v.value;
  }

  try {
    const updated = await setProposalDecision(ids, accepted, reason, apply);
    console.info(JSON.stringify({ level: "info", msg: "[proposals/decide]", decision, ids: ids.length, updated, has_reason: reason != null, has_apply: apply != null }));
    return NextResponse.json({ ok: true, updated });
  } catch (e) {
    console.error(JSON.stringify({ level: "error", msg: "[proposals/decide] failed", err: String(e) }));
    return NextResponse.json({ error: "decision failed" }, { status: 500 });
  }
}
