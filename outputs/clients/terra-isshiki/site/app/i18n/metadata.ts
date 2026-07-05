/* ------------------------------------------------------------------
 * ページ metadata の言語別ヘルパー（hreflang alternates / OpenGraph）。
 * 各 page.tsx（ja / en 両方）から呼び、相互の言語シグナルを揃える。
 * jaPath は ja 基準の内部パス（"/rooms" 等）。en の実URLは localizeHref で導出。
 * ------------------------------------------------------------------ */
import type { Metadata } from "next";
import type { Locale } from "./config";
import { localizeHref } from "./routing";

/** hreflang alternates。canonical は当該 locale の実URL、languages は ja/en/x-default */
export function alternatesFor(jaPath: string, locale: Locale): Metadata["alternates"] {
  return {
    canonical: localizeHref(jaPath, locale),
    languages: {
      "ja-JP": jaPath,
      "en-US": localizeHref(jaPath, "en"),
      "x-default": jaPath,
    },
  };
}

/** OpenGraph の locale 情報＋当該ページの実URL */
export function openGraphFor(locale: Locale, jaPath: string): Metadata["openGraph"] {
  return {
    locale: locale === "ja" ? "ja_JP" : "en_US",
    alternateLocale: locale === "ja" ? ["en_US"] : ["ja_JP"],
    url: localizeHref(jaPath, locale),
  };
}
