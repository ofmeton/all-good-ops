import "server-only";
import { randomBytes } from "crypto";
import { createServiceClient } from "@/lib/supabase-server";
import { resizeForUpload } from "@/lib/image";

const BUCKET = "report-photos";

// アップロード上限（DoS 防止）。sharp 処理の前に raw サイズで弾く。
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB
// Storage パスに安全に埋め込める requestId のみ許可（パストラバーサル防止）。
const SAFE_REQUEST_ID = /^[A-Za-z0-9_-]+$/;

// 完了写真を Storage にアップロードし、保存パスを返す。
// パスは requestId/タイムスタンプ-ランダム.拡張子 で衝突を避ける。
export async function uploadReportPhoto(
  requestId: string,
  file: ArrayBuffer | Buffer,
  contentType: string,
): Promise<string> {
  if (!SAFE_REQUEST_ID.test(requestId)) {
    throw new Error("requestId が不正です");
  }
  const size = file instanceof Buffer ? file.length : file.byteLength;
  if (size > MAX_UPLOAD_BYTES) {
    throw new Error("ファイルサイズが上限（10MB）を超えています");
  }
  const db = createServiceClient();
  // Plan 3: アップロード前にリサイズ・圧縮する（長辺1600px / JPEG q80 or PNG）
  const { buffer, contentType: outType } = await resizeForUpload(file, contentType);
  const ext = outType === "image/png" ? "png" : "jpg";
  const path = `${requestId}/${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;
  const { error } = await db.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: outType });
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
