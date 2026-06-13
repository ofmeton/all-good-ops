import { NextResponse } from "next/server";

// サーバ内部エラーを返すときの共通ヘルパー。
// クライアントには汎用メッセージのみ返し、DB エラー詳細（テーブル名・スキーマ・
// クエリ構造）を漏らさない。詳細はサーバログにのみ残す。
export function serverErrorResponse(
  error: unknown,
  context: string,
): NextResponse {
  console.error(`[${context}] server error:`, error);
  return NextResponse.json(
    { error: "内部エラーが発生しました" },
    { status: 500 },
  );
}
