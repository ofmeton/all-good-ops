import "server-only";
import sharp from "sharp";

// アップロード前にリサイズ・圧縮する。長辺 1600px に縮小し JPEG 品質 80 で出力。
// PNG は透過を保つため PNG のまま（圧縮レベル 8）出力する。
// 戻り値は { buffer, contentType }: Storage への upload にそのまま渡せる形。
export async function resizeForUpload(
  input: ArrayBuffer | Buffer,
  inputContentType: string,
): Promise<{ buffer: Buffer; contentType: string }> {
  const src = input instanceof Buffer ? input : Buffer.from(new Uint8Array(input));
  // failOn: "truncated" で破損画像は弾く（"none" は壊れた入力を黙って通す）。
  const img = sharp(src, { failOn: "truncated" }).rotate(); // EXIF 回転を保持
  let meta;
  try {
    meta = await img.metadata();
  } catch {
    throw new Error("対応していない画像形式です");
  }
  // ラスター画像として認識できない（= 画像でない / Content-Type 偽装）入力を拒否する。
  if (!meta.format) {
    throw new Error("対応していない画像形式です");
  }
  const longSide = Math.max(meta.width ?? 0, meta.height ?? 0);
  const needsResize = longSide > 1600;
  if (inputContentType === "image/png") {
    const buffer = await (
      needsResize
        ? img.resize({ width: 1600, height: 1600, fit: "inside" })
        : img
    )
      .png({ compressionLevel: 8 })
      .toBuffer();
    return { buffer, contentType: "image/png" };
  }
  // それ以外（jpeg/webp/heic 含む）は jpeg 80 に正規化する
  const buffer = await (
    needsResize
      ? img.resize({ width: 1600, height: 1600, fit: "inside" })
      : img
  )
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer();
  return { buffer, contentType: "image/jpeg" };
}
