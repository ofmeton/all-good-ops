"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

// /tax 用の書込 server actions（tax_mappings のみ）。
// lib/actions.ts と同じ規律: prepared statement・入力を信頼しない・終了時 revalidate。

export interface UpsertTaxMappingInput {
  category_major: string;
  category_middle: string; // '' = 大項目全体に適用
  business_ratio: number; // UI 入力は 0-100（%）。保存時に 0-1 へ正規化。
  aoiro_item?: string | null;
  note?: string | null;
}

function trimOrNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

export async function upsertTaxMapping(
  input: UpsertTaxMappingInput,
): Promise<void> {
  const major = typeof input.category_major === "string"
    ? input.category_major.trim()
    : "";
  if (!major) throw new Error("大項目は必須です");
  // middle は '' を「大項目全体」として許容（trim のみ）。
  const middle = typeof input.category_middle === "string"
    ? input.category_middle.trim()
    : "";

  // 0-100（%）→ 0-1。範囲外は clamp（CHECK 制約違反で落とすより入力ミスに寛容に）。
  const pct = Number(input.business_ratio);
  if (!Number.isFinite(pct)) throw new Error("按分率は数値で入力してください");
  const ratio = Math.min(100, Math.max(0, pct)) / 100;

  const aoiro = trimOrNull(input.aoiro_item);
  const note = trimOrNull(input.note);

  db.prepare(
    `INSERT INTO tax_mappings (category_major, category_middle, business_ratio, aoiro_item, note)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(category_major, category_middle) DO UPDATE SET
       business_ratio = excluded.business_ratio,
       aoiro_item     = excluded.aoiro_item,
       note           = excluded.note`,
  ).run(major, middle, ratio, aoiro, note);
  revalidatePath("/tax");
}

export async function deleteTaxMapping(id: number): Promise<void> {
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) throw new Error("無効な id です");
  db.prepare("DELETE FROM tax_mappings WHERE id = ?").run(n);
  revalidatePath("/tax");
}
