/* ------------------------------------------------------------------
 * 英語コピー（EN）。
 * 工程5で Claude が本翻訳を流し込む。現在は ja のクローンで、
 * 型（SiteCopy）を先に効かせつつビルドを通すためのプレースホルダ。
 * 本翻訳時は `export const en: SiteCopy = { ... }` に置き換える。
 * ------------------------------------------------------------------ */
import { ja } from "./ja";
import type { SiteCopy } from "./types";

export const en: SiteCopy = ja;
