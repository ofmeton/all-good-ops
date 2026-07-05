/* ------------------------------------------------------------------
 * サイト文言の共通型。ja から自動抽出し、en に強制することで
 * 翻訳漏れ・構造ズレをコンパイルエラーとして検出する。
 *
 *   Widen: readonly を外し、"mist" のようなリテラル型を string へ広げる
 *   （en に別の文字列を入れられるようにするため）。配列の要素数までは
 *   型で守れないので、要素数ズレは copy/index.ts の dev assert で補完する。
 * ------------------------------------------------------------------ */
import { ja } from "./ja";

type Widen<T> = T extends readonly (infer U)[]
  ? Widen<U>[]
  : T extends string
    ? string
    : T extends number
      ? number
      : T extends boolean
        ? boolean
        : T extends object
          ? { -readonly [K in keyof T]: Widen<T[K]> }
          : T;

export type SiteCopy = Widen<typeof ja>;
