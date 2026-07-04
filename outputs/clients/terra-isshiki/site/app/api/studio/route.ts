import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { replaceField } from "../../studio/lib";

/**
 * studio（開発サーバー限定の編集 UI）専用の Route Handler。
 * app/copy.ts の文字列リテラルをピンポイントで書き換える。
 * 変更系は POST のみ。GET は定義しない（一覧取得は不要なため）。
 */

// リクエストボディの形（value.length の上限含めて検証する）
const FIELD_PATH_PATTERN = /^[A-Z_][\w$]*(\.[\w$]+)*$/;
const MAX_VALUE_LENGTH = 5000;

export async function POST(req: Request) {
  // 1. 本番では studio 機能そのものが存在しない扱いにする（最優先ガード）
  if (process.env.NODE_ENV === "production") {
    return new NextResponse(null, { status: 404 });
  }

  // 2. リクエストボディのパースと検証
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("path" in body) ||
    !("value" in body)
  ) {
    return NextResponse.json({ error: "body must have path and value" }, { status: 400 });
  }

  const { path: fieldPath, value } = body as { path: unknown; value: unknown };

  if (typeof fieldPath !== "string" || !FIELD_PATH_PATTERN.test(fieldPath)) {
    return NextResponse.json({ error: "invalid path" }, { status: 400 });
  }

  if (typeof value !== "string" || value.length > MAX_VALUE_LENGTH) {
    return NextResponse.json({ error: "invalid value" }, { status: 400 });
  }

  // 3. 書き換え対象は copy.ts に固定する（リクエストからファイルパスは受け取らない）
  const targetPath = path.join(process.cwd(), "app", "copy.ts");

  try {
    const source = fs.readFileSync(targetPath, "utf-8");

    // 4. AST 置換。フィールド未検出・構文破損は replaceField 側が throw する
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

  // 5. 成功
  return NextResponse.json({ ok: true });
}
