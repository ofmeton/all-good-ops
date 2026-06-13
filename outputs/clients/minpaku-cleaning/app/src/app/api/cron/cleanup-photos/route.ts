import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { isCronAuthenticated } from "@/lib/cron-auth";
import { serverErrorResponse } from "@/lib/api-error";
import { deletePhoto } from "@/lib/storage";

// 毎日1回呼ばれ、expires_at を過ぎた report_photos の Storage 実体と DB 行を削除する。
export async function GET(req: NextRequest) {
  if (!isCronAuthenticated(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = createServiceClient();
  const now = new Date().toISOString();
  const { data: expired, error } = await db
    .from("report_photos")
    .select("id, storage_path")
    .lt("expires_at", now);
  if (error) {
    return serverErrorResponse(error, "cron/cleanup-photos");
  }
  const list = (expired ?? []) as Array<{ id: string; storage_path: string }>;

  let storageDeleted = 0;
  let dbDeleted = 0;
  for (const p of list) {
    try {
      await deletePhoto(p.storage_path);
      storageDeleted += 1;
    } catch {
      // Storage 削除エラーは無視して DB 行は削除する。孤立した Storage ファイルを
      // 残すリスクと引き換えに、DB 上は確実に期限切れ状態にする方を優先（無害方向）。
      // 孤立ファイルは Supabase ダッシュボードから手動掃除する運用とし、納品手順書に明記。
    }
    const { error: delErr } = await db.from("report_photos").delete().eq("id", p.id);
    if (!delErr) dbDeleted += 1;
  }
  return NextResponse.json({
    ok: true,
    candidates: list.length,
    storageDeleted,
    dbDeleted,
  });
}
