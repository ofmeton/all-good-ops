import { listApprovedStock, type PublishStock } from "@/lib/publish-queries";
import { PublishNowClient } from "./PublishNowClient";

// 「今すぐ手動投稿」: 承認済み未予約・未公開ストックを 1 件選び、chrome 半自動投稿用の
// ハンドオフ payload を出して投稿 → 投稿後に published_at を確定する。X API は介在しない。
export const dynamic = "force-dynamic";
const LIMIT = 100;

export default async function PublishPage() {
  const stock: PublishStock[] = await listApprovedStock(LIMIT).catch(() => []);
  return <PublishNowClient initialStock={stock} />;
}
