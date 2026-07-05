/* ------------------------------------------------------------------
 * copy の入口。getCopy(locale) で言語別の文言オブジェクトを返す。
 * 併せて個別 export（SITE / NAV / …）を再エクスポートして、
 * 既存の `import { TOP } from "../copy"` を無改修で動かす（段階移行用）。
 * ------------------------------------------------------------------ */
import { ja } from "./ja";
import { en } from "./en";
import type { SiteCopy } from "./types";
import type { Locale } from "../i18n/config";

// 後方互換: SITE / NAV / META / … の名前付き export をそのまま通す
export * from "./ja";
export type { SiteCopy };

const MAP: Record<Locale, SiteCopy> = { ja, en };

export function getCopy(locale: Locale): SiteCopy {
  return MAP[locale] ?? ja;
}

// dev 限定: 型では守れない配列要素数のズレを早期検出（工程5の翻訳漏れ防止）
if (process.env.NODE_ENV !== "production") {
  const pairs: Array<[string, number, number]> = [
    ["TOP.bands", ja.TOP.bands.length, en.TOP.bands.length],
    ["NAV", ja.NAV.length, en.NAV.length],
    ["NOTICES", ja.NOTICES.length, en.NOTICES.length],
    ["POINTS", ja.POINTS.length, en.POINTS.length],
  ];
  for (const [name, a, b] of pairs) {
    if (a !== b) console.warn(`[copy] length mismatch: ${name} ja=${a} en=${b}`);
  }
}
