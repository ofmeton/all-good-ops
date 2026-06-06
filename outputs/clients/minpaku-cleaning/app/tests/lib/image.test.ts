import { describe, it, expect } from "vitest";
import { resizeForUpload } from "@/lib/image";

// 最小の有効 1×1 PNG（赤）
const VALID_PNG = Buffer.from(
  "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c63f8cfc0c000000003000100" +
    "1ae6c1830000000049454e44ae426082",
  "hex",
);

describe("resizeForUpload", () => {
  it("有効な画像はリサイズ・正規化して返す", async () => {
    const { buffer, contentType } = await resizeForUpload(VALID_PNG, "image/png");
    expect(buffer.length).toBeGreaterThan(0);
    expect(contentType).toBe("image/png");
  });

  it("画像でないデータ（Content-Type 偽装）を拒否する", async () => {
    const notImage = Buffer.from("これは画像ではありません".repeat(10), "utf8");
    await expect(
      resizeForUpload(notImage, "image/jpeg"),
    ).rejects.toThrow(/画像/);
  });
});
