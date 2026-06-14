import { NextResponse } from "next/server";
import {
  getAvailableYears,
  getYearlyExpenseByCategory,
} from "@/lib/tax-queries";

// 確定申告用 経費集計の CSV エクスポート（参考値）。
// GET /api/tax-export?year=YYYY
// Excel での文字化け防止のため UTF-8 BOM 付き・CRLF。
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// RFC4180 準拠の最小エスケープ（カンマ・引用符・改行を含む場合のみ quote）。
function csvField(v: string | number): string {
  const s = String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const yearParam = url.searchParams.get("year") ?? "";
  if (!/^\d{4}$/.test(yearParam)) {
    return NextResponse.json(
      { ok: false, error: "year は YYYY 形式で指定してください" },
      { status: 400 },
    );
  }
  const year = Number(yearParam);
  if (!getAvailableYears().includes(year)) {
    return NextResponse.json(
      { ok: false, error: `${year}年の支出データはありません` },
      { status: 404 },
    );
  }

  const rows = getYearlyExpenseByCategory(year);
  const lines: string[] = ["大項目,中項目,年間支出,按分%,科目,経費見込み"];
  for (const major of rows) {
    for (const m of major.middles) {
      lines.push(
        [
          csvField(major.major),
          csvField(m.middle),
          csvField(m.spend),
          // 按分は % 表記（0-100）。小数按分も保持。
          csvField(Math.round(m.effectiveRatio * 1000) / 10),
          csvField(m.effectiveAoiroItem ?? ""),
          csvField(m.estimate),
        ].join(","),
      );
    }
  }

  const body = "\uFEFF" + lines.join("\r\n") + "\r\n";
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="tax-export-${year}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
