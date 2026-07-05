/* 開発用: 編集スタジオ（本番では 404）。
 * app/copy.ts を読み直してフィールド一覧を作り、public/images を再帰列挙して
 * StudioClient に渡す。保存の実処理は app/api/studio（POST）が担う。 */

import { notFound } from "next/navigation";
import fs from "node:fs";
import path from "node:path";
import { extractFields, extractGalleries } from "./lib";
import { StudioClient } from "./StudioClient";

export const metadata = {
  title: "編集スタジオ",
  robots: { index: false },
};

// 手動編集にも追従できるよう、毎リクエストで copy.ts を読み直す。
export const dynamic = "force-dynamic";

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".webp", ".png"]);

/* public/images 配下を再帰的に列挙し、"/images/..." 形式のパス配列を返す。
 * library ディレクトリ由来のパスを先頭に、それ以外はアルファベット順で続ける。 */
function collectImages(): string[] {
  const imagesRoot = path.join(process.cwd(), "public", "images");
  const all: string[] = [];

  function walk(dir: string, relDir: string) {
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const entryRel = relDir ? `${relDir}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        walk(path.join(dir, entry.name), entryRel);
      } else if (entry.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        all.push(`/images/${entryRel}`);
      }
    }
  }

  walk(imagesRoot, "");

  const library = all.filter((p) => p.startsWith("/images/library/")).sort();
  const rest = all.filter((p) => !p.startsWith("/images/library/")).sort();
  return [...library, ...rest];
}

export default function StudioPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const copySource = fs.readFileSync(path.join(process.cwd(), "app", "copy", "ja.ts"), "utf8");
  const fields = extractFields(copySource);
  const galleries = extractGalleries(copySource);
  const images = collectImages();

  return <StudioClient fields={fields} images={images} galleries={galleries} />;
}
