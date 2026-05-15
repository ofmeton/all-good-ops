import "server-only";
import { randomBytes } from "crypto";
import { createServiceClient } from "@/lib/supabase-server";

const BUCKET = "report-photos";

// 完了写真を Storage にアップロードし、保存パスを返す。
// パスは requestId/タイムスタンプ-ランダム.拡張子 で衝突を避ける。
export async function uploadReportPhoto(
  requestId: string,
  file: ArrayBuffer | Buffer,
  contentType: string,
): Promise<string> {
  const db = createServiceClient();
  // Plan 2 では png/jpg のみ判定。webp/heic（iPhone カメラ等）は .jpg 拡張子で
  // 保存されるが contentType 自体は正しく渡る。拡張子マップの整備は Plan 3。
  const ext = contentType === "image/png" ? "png" : "jpg";
  const path = `${requestId}/${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;
  const { error } = await db.storage
    .from(BUCKET)
    .upload(path, file, { contentType });
  if (error) throw error;
  return path;
}

// 保存パスから短期署名付きURLを発行する（閲覧用・デフォルト5分）。
export async function getPhotoSignedUrl(
  path: string,
  expiresInSec = 300,
): Promise<string> {
  const db = createServiceClient();
  const { data, error } = await db.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresInSec);
  if (error) throw error;
  return data.signedUrl;
}

// Storage から写真を削除する（Plan 3 の期限切れ削除 cron が利用予定）。
// 存在しないパスへの remove() は現状エラーにならず再削除も安全だが、これは
// Supabase Storage の挙動依存。冪等性を要件化するなら Plan 3 で要確認。
export async function deletePhoto(path: string): Promise<void> {
  const db = createServiceClient();
  const { error } = await db.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}
