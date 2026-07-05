import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { appendImageToArray, extractGalleries, removeArrayElement, reorderArrayElement, replaceField } from "../../studio/lib";

/**
 * studio（開発サーバー限定の編集 UI）専用の Route Handler。
 * app/copy.ts の文字列リテラルをピンポイントで書き換える。
 * 変更系は POST のみ。GET は定義しない（一覧取得は不要なため）。
 *
 * op で挙動を分岐する:
 *   - 省略 or "replace"（後方互換）: { path, value } で replaceField
 *   - "append": { op, arrayPath, value } で画像ギャラリー末尾に1枚追加
 *   - "remove": { op, arrayPath, index } で画像ギャラリーから1枚削除
 *   - "reorder": { op, arrayPath, fromIndex, toIndex } で画像を別位置へ移動（枚数不変）
 */

// リクエストボディの形（value.length の上限含めて検証する）
const FIELD_PATH_PATTERN = /^[A-Z_][\w$]*(\.[\w$]+)*$/;
const MAX_VALUE_LENGTH = 5000;
// append で受け付ける画像パス（extractFields の image 判定と同じ "/images/" 始まり）
const IMAGE_PATH_PATTERN = /^\/images\//;
const MAX_IMAGE_PATH_LENGTH = 300;

// 書き換え対象は copy.ts に固定する（リクエストからファイルパスは受け取らない）
function getTargetPath(): string {
  return path.join(process.cwd(), "app", "copy", "ja.ts");
}

export async function POST(req: Request) {
  // 1. 本番では studio 機能そのものが存在しない扱いにする（最優先ガード）
  if (process.env.NODE_ENV === "production") {
    return new NextResponse(null, { status: 404 });
  }

  // 2. リクエストボディのパース
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const op = "op" in body ? (body as { op: unknown }).op : undefined;

  if (op === "append") {
    return handleAppend(body as Record<string, unknown>);
  }

  if (op === "remove") {
    return handleRemove(body as Record<string, unknown>);
  }

  if (op === "reorder") {
    return handleReorder(body as Record<string, unknown>);
  }

  if (op !== undefined && op !== "replace") {
    return NextResponse.json({ error: "invalid op" }, { status: 400 });
  }

  return handleReplace(body as Record<string, unknown>);
}

// ------------------------------------------------------------------
// op === "replace"（省略時も含む、既存挙動を維持）
// ------------------------------------------------------------------
function handleReplace(body: Record<string, unknown>) {
  if (!("path" in body) || !("value" in body)) {
    return NextResponse.json({ error: "body must have path and value" }, { status: 400 });
  }

  const { path: fieldPath, value } = body as { path: unknown; value: unknown };

  if (typeof fieldPath !== "string" || !FIELD_PATH_PATTERN.test(fieldPath)) {
    return NextResponse.json({ error: "invalid path" }, { status: 400 });
  }

  if (typeof value !== "string" || value.length > MAX_VALUE_LENGTH) {
    return NextResponse.json({ error: "invalid value" }, { status: 400 });
  }

  const targetPath = getTargetPath();

  try {
    const source = fs.readFileSync(targetPath, "utf-8");

    // AST 置換。フィールド未検出・構文破損は replaceField 側が throw する
    let newSource: string;
    try {
      newSource = replaceField(source, fieldPath, value);
    } catch (e) {
      const message = e instanceof Error ? e.message : "replacement failed";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    fs.writeFileSync(targetPath, newSource, "utf-8");
  } catch {
    // ファイル読み書きレベルの想定外エラー
    return NextResponse.json({ error: "failed to read or write copy.ts" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// ------------------------------------------------------------------
// op === "append": 画像ギャラリー末尾に1枚追加
// ------------------------------------------------------------------
function handleAppend(body: Record<string, unknown>) {
  if (!("arrayPath" in body) || !("value" in body)) {
    return NextResponse.json({ error: "body must have arrayPath and value" }, { status: 400 });
  }

  const { arrayPath, value } = body as { arrayPath: unknown; value: unknown };

  if (typeof arrayPath !== "string" || !FIELD_PATH_PATTERN.test(arrayPath)) {
    return NextResponse.json({ error: "invalid arrayPath" }, { status: 400 });
  }

  if (
    typeof value !== "string" ||
    !IMAGE_PATH_PATTERN.test(value) ||
    value.length > MAX_IMAGE_PATH_LENGTH
  ) {
    return NextResponse.json({ error: "invalid value" }, { status: 400 });
  }

  const targetPath = getTargetPath();

  try {
    const source = fs.readFileSync(targetPath, "utf-8");

    // 対象が画像ギャラリーであることを保証する
    let galleries: ReturnType<typeof extractGalleries>;
    try {
      galleries = extractGalleries(source);
    } catch {
      return NextResponse.json({ error: "failed to inspect copy.ts" }, { status: 500 });
    }

    const gallery = galleries.find((g) => g.path === arrayPath);
    if (!gallery) {
      return NextResponse.json({ error: "not an image array" }, { status: 400 });
    }

    let newSource: string;
    try {
      newSource = appendImageToArray(source, arrayPath, value);
    } catch (e) {
      const message = e instanceof Error ? e.message : "append failed";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    fs.writeFileSync(targetPath, newSource, "utf-8");
  } catch {
    return NextResponse.json({ error: "failed to read or write copy.ts" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// ------------------------------------------------------------------
// op === "remove": 画像ギャラリーから1枚削除（最低1枚は保証する）
// ------------------------------------------------------------------
function handleRemove(body: Record<string, unknown>) {
  if (!("arrayPath" in body) || !("index" in body)) {
    return NextResponse.json({ error: "body must have arrayPath and index" }, { status: 400 });
  }

  const { arrayPath, index } = body as { arrayPath: unknown; index: unknown };

  if (typeof arrayPath !== "string" || !FIELD_PATH_PATTERN.test(arrayPath)) {
    return NextResponse.json({ error: "invalid arrayPath" }, { status: 400 });
  }

  if (typeof index !== "number" || !Number.isInteger(index) || index < 0) {
    return NextResponse.json({ error: "invalid index" }, { status: 400 });
  }

  const targetPath = getTargetPath();

  try {
    const source = fs.readFileSync(targetPath, "utf-8");

    // 対象が画像ギャラリーであること・index が範囲内であることを保証する
    let galleries: ReturnType<typeof extractGalleries>;
    try {
      galleries = extractGalleries(source);
    } catch {
      return NextResponse.json({ error: "failed to inspect copy.ts" }, { status: 500 });
    }

    const gallery = galleries.find((g) => g.path === arrayPath);
    if (!gallery || index >= gallery.images.length) {
      return NextResponse.json({ error: "not an image array" }, { status: 400 });
    }

    // 最低1枚を保証する（要素が1個しかない場合は削除拒否）
    if (gallery.images.length <= 1) {
      return NextResponse.json({ error: "cannot remove the last image" }, { status: 400 });
    }

    let newSource: string;
    try {
      newSource = removeArrayElement(source, arrayPath, index);
    } catch (e) {
      const message = e instanceof Error ? e.message : "remove failed";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    fs.writeFileSync(targetPath, newSource, "utf-8");
  } catch {
    return NextResponse.json({ error: "failed to read or write copy.ts" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// ------------------------------------------------------------------
// op === "reorder": 画像ギャラリー内の1枚を別位置へ移動（枚数は変わらない）
// ------------------------------------------------------------------
function handleReorder(body: Record<string, unknown>) {
  if (!("arrayPath" in body) || !("fromIndex" in body) || !("toIndex" in body)) {
    return NextResponse.json(
      { error: "body must have arrayPath, fromIndex, toIndex" },
      { status: 400 },
    );
  }

  const { arrayPath, fromIndex, toIndex } = body as {
    arrayPath: unknown;
    fromIndex: unknown;
    toIndex: unknown;
  };

  if (typeof arrayPath !== "string" || !FIELD_PATH_PATTERN.test(arrayPath)) {
    return NextResponse.json({ error: "invalid arrayPath" }, { status: 400 });
  }

  if (
    typeof fromIndex !== "number" ||
    !Number.isInteger(fromIndex) ||
    fromIndex < 0 ||
    typeof toIndex !== "number" ||
    !Number.isInteger(toIndex) ||
    toIndex < 0
  ) {
    return NextResponse.json({ error: "invalid indices" }, { status: 400 });
  }

  const targetPath = getTargetPath();

  try {
    const source = fs.readFileSync(targetPath, "utf-8");

    // 対象が画像ギャラリーであること・両 index が範囲内であることを保証する
    let galleries: ReturnType<typeof extractGalleries>;
    try {
      galleries = extractGalleries(source);
    } catch {
      return NextResponse.json({ error: "failed to inspect copy.ts" }, { status: 500 });
    }

    const gallery = galleries.find((g) => g.path === arrayPath);
    if (!gallery || fromIndex >= gallery.images.length || toIndex >= gallery.images.length) {
      return NextResponse.json({ error: "not an image array or index out of range" }, { status: 400 });
    }

    let newSource: string;
    try {
      newSource = reorderArrayElement(source, arrayPath, fromIndex, toIndex);
    } catch (e) {
      const message = e instanceof Error ? e.message : "reorder failed";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    fs.writeFileSync(targetPath, newSource, "utf-8");
  } catch {
    return NextResponse.json({ error: "failed to read or write copy.ts" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
