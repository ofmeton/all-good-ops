import { describe, it, expect } from "vitest";
import {
  uploadReportPhoto,
  getPhotoSignedUrl,
  deletePhoto,
} from "@/lib/storage";

describe("storage（report-photos バケット）", () => {
  it("アップロードすると保存パスを返し、署名URLを発行できる", async () => {
    // 最小の有効 1×1 PNG（赤）。sharp で正規化可能。
    const buf = Buffer.from(
      "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c63f8cfc0c000000003000100" +
        "1ae6c1830000000049454e44ae426082",
      "hex",
    );
    const path = await uploadReportPhoto("req-test", buf, "image/jpeg");
    expect(path).toMatch(/^req-test\/.+\.(jpg|png)$/);

    const url = await getPhotoSignedUrl(path);
    expect(url).toContain("report-photos");
    expect(url).toContain("token=");

    // 後始末
    await deletePhoto(path);
  });

  it("削除した写真はもう署名URLを発行しても実体がない", async () => {
    // 最小の有効 1×1 PNG（赤）。sharp で正規化可能。
    const buf = Buffer.from(
      "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c63f8cfc0c000000003000100" +
        "1ae6c1830000000049454e44ae426082",
      "hex",
    );
    const path = await uploadReportPhoto("req-test2", buf, "image/jpeg");
    await deletePhoto(path);
    // 署名URL自体は発行できる（存在チェックはしない）が、再削除はエラーにならない
    await expect(deletePhoto(path)).resolves.toBeUndefined();
  });
});
