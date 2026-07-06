/* ------------------------------------------------------------------
 * 言語とURLパスの相互変換（純関数・サーバー/クライアント両用）
 *
 *   ja 基準の内部 href（"/rooms" など）を copy 側で1つだけ持ち、
 *   描画時に localizeHref(href, locale) で実URLへ変換する方針。
 *   これにより copy に /en 版の href を二重に持たなくて済む。
 * ------------------------------------------------------------------ */
import type { Locale } from "./config";

/** "/en/rooms" → "/rooms" 、 "/en" → "/" 、 ja のパスはそのまま */
export function stripLocale(pathname: string): string {
  if (pathname === "/en" || pathname === "/en/") return "/";
  if (pathname.startsWith("/en/")) return pathname.slice(3);
  return pathname || "/";
}

/** パス名から現在の言語を判定 */
export function currentLocale(pathname: string): Locale {
  return pathname === "/en" || pathname.startsWith("/en/") ? "en" : "ja";
}

/** ja 基準の内部 href を指定 locale の実URLへ。外部URL・アンカーは素通し */
export function localizeHref(href: string, locale: Locale): string {
  if (locale === "ja") return href;
  if (!href.startsWith("/")) return href; // https://... や #anchor はそのまま
  if (href === "/") return "/en";
  return `/en${href}`;
}

/** 言語切替: 今のパスを相手言語の同一ページURLへ */
export function switchLocalePath(pathname: string, to: Locale): string {
  return localizeHref(stripLocale(pathname), to);
}
