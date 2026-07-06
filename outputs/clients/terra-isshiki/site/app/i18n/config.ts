/* ------------------------------------------------------------------
 * i18n の基本設定（言語一覧・デフォルト・型）
 * 日本語=デフォルト（URLはそのまま）／英語=/en サブパス
 * ------------------------------------------------------------------ */
export const locales = ["ja", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "ja";

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
