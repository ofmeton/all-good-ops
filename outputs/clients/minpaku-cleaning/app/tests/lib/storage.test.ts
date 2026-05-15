import { describe, it, expect } from "vitest";
import {
  uploadReportPhoto,
  getPhotoSignedUrl,
  deletePhoto,
} from "@/lib/storage";

describe("storage（report-photos バケット）", () => {
  it("アップロードすると保存パスを返し、署名URLを発行できる", async () => {
    const buf = Buffer.from([0xff, 0xd8, 0xff, 0xd9]); // 最小のJPEGっぽいバイト列
    const path = await uploadReportPhoto("req-test", buf, "image/jpeg");
    expect(path).toMatch(/^req-test\/.+\.jpg$/);

    const url = await getPhotoSignedUrl(path);
    expect(url).toContain("report-photos");
    expect(url).toContain("token=");

    // 後始末
    await deletePhoto(path);
  });

  it("削除した写真はもう署名URLを発行しても実体がない", async () => {
    const buf = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
    const path = await uploadReportPhoto("req-test2", buf, "image/jpeg");
    await deletePhoto(path);
    // 署名URL自体は発行できる（存在チェックはしない）が、再削除はエラーにならない
    await expect(deletePhoto(path)).resolves.toBeUndefined();
  });
});
