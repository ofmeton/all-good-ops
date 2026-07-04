/* 開発用: 写真カタログ。public/images 配下を全列挙し、copy.ts で使用中のものにバッジを付ける。本番では 404。 */

import { notFound } from "next/navigation";
import fs from "node:fs";
import path from "node:path";
import * as COPY from "../copy";

export const metadata = {
  title: "写真ライブラリ",
  robots: { index: false },
};

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".webp", ".png"]);

type Section = {
  name: string;
  images: string[];
};

/* public/images 直下を「直下」セクション、各サブディレクトリを名前付きセクションとして列挙する。
 * ディレクトリの検出順（= fs.readdirSync の順）をそのままセクション表示順に使う。 */
function collectSections(): Section[] {
  const imagesRoot = path.join(process.cwd(), "public/images");
  const sections: Section[] = [];

  let rootEntries: fs.Dirent[] = [];
  try {
    rootEntries = fs.readdirSync(imagesRoot, { withFileTypes: true });
  } catch {
    return sections;
  }

  const rootFiles = rootEntries
    .filter((entry) => entry.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => `/images/${entry.name}`)
    .sort();
  if (rootFiles.length > 0) {
    sections.push({ name: "直下", images: rootFiles });
  }

  const subDirs = rootEntries.filter((entry) => entry.isDirectory());
  for (const dir of subDirs) {
    const dirPath = path.join(imagesRoot, dir.name);
    let dirEntries: fs.Dirent[] = [];
    try {
      dirEntries = fs.readdirSync(dirPath, { withFileTypes: true });
    } catch {
      continue;
    }
    const images = dirEntries
      .filter((entry) => entry.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
      .map((entry) => `/images/${dir.name}/${entry.name}`)
      .sort();
    if (images.length > 0) {
      sections.push({ name: dir.name, images });
    }
  }

  return sections;
}

/* COPY の全 export を再帰走査し、"/images/" から始まる文字列だけを集める。
 * 文字列以外（オブジェクト・配列）は再帰し、それ以外の値は無視する。 */
function collectUsedImagePaths(value: unknown, seen: Set<string>): void {
  if (typeof value === "string") {
    if (value.startsWith("/images/")) seen.add(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectUsedImagePaths(item, seen);
    return;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) collectUsedImagePaths(item, seen);
  }
}

export default function PhotosPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const sections = collectSections();
  const usedPaths = new Set<string>();
  collectUsedImagePaths(COPY, usedPaths);

  return (
    <main className="min-h-screen bg-(--color-base-light) px-6 py-12 text-(--color-base-dark) md:px-12">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">写真ライブラリ</h1>
        <p className="mt-2 text-sm text-(--color-mist)">
          画像の下のパスを app/copy.ts の src に貼ると、その場所の写真が差し替わります。このページは開発時のみ表示されます。
        </p>

        {sections.map((section) => (
          <section key={section.name} className="mt-10">
            <h2 className="mb-4 text-lg font-semibold">{section.name}</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {section.images.map((imgPath) => (
                <div key={imgPath} className="flex flex-col gap-1.5">
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imgPath}
                      loading="lazy"
                      className="aspect-[3/2] w-full object-cover"
                      alt={imgPath}
                    />
                    {usedPaths.has(imgPath) ? (
                      <span className="absolute right-1.5 top-1.5 rounded-full bg-(--color-soil) px-2 py-0.5 text-[10px] font-medium text-(--color-base-light)">
                        ✓ 使用中
                      </span>
                    ) : null}
                  </div>
                  <p className="break-all font-mono text-[11px] text-(--color-mist)">{imgPath}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
