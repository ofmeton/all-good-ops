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
  const img = sharp(src, { failOn: "none" }).rotate(); // EXIF 回転を保持
  const meta = await img.metadata();
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
