import { createServiceClient } from "@/lib/supabase-server";

/**
 * テスト用 DB リセットヘルパー。
 * FK 制約を考慮した順序で全テーブルを削除する。
 * 各削除でエラーが発生した場合は即 throw する（silent failure 防止）。
 *
 * 削除順（子→親）:
 *   access_tokens → staff_assignments → cleaning_requests
 *   → properties → staff → owners
 */
export async function resetDb(): Promise<void> {
  const db = createServiceClient();

  const { error: e1 } = await db
    .from("access_tokens")
    .delete()
    .not("id", "is", null);
  if (e1) throw e1;

  const { error: e2 } = await db
    .from("staff_assignments")
    .delete()
    .not("staff_id", "is", null);
  if (e2) throw e2;

  const { error: e3 } = await db
    .from("cleaning_requests")
    .delete()
    .not("id", "is", null);
  if (e3) throw e3;

  const { error: e4 } = await db
    .from("properties")
    .delete()
    .not("id", "is", null);
  if (e4) throw e4;

  const { error: e5 } = await db
    .from("staff")
    .delete()
    .not("id", "is", null);
  if (e5) throw e5;

  const { error: e6 } = await db
    .from("owners")
    .delete()
    .not("id", "is", null);
  if (e6) throw e6;
}
