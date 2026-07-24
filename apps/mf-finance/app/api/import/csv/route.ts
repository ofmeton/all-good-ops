import { NextResponse } from "next/server";
import { importMoneyForwardCsv } from "@/lib/csv-import";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("csv");
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "CSVファイルが必要です" }, { status: 400 });
    }

    const result = await importMoneyForwardCsv(file);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
