/**
 * studio 専用ユーティリティ（server only）
 * ----------------------------------------------------------------------
 * app/copy.ts（サイト文言・写真パスの一元管理ファイル）を TypeScript AST として
 * 走査し、文字列リテラルのフィールド一覧化・ピンポイント置換を行う。
 * コメント・整形を壊さず該当リテラルの範囲だけをテキスト置換することが前提。
 * 開発サーバー限定の編集 UI（/studio）からのみ利用される想定で、
 * 本番ビルドや一般ページからは import されない。
 */

import ts from "typescript";

export type CopyField = { path: string; value: string; kind: "text" | "image" };

/**
 * ObjectLiteralExpression / ArrayLiteralExpression を再帰的に走査するための
 * 共通コールバック型。StringLiteral ノードに出会うたびに呼ばれる。
 */
type StringLiteralVisitor = (node: ts.StringLiteral, fieldPath: string) => void;

/**
 * AsExpression（`"..." as string | null`）と ParenthesizedExpression は
 * 中身の式へ透過する。それ以外はそのまま返す。
 */
function unwrapExpression(node: ts.Expression): ts.Expression {
  let current = node;
  while (ts.isAsExpression(current) || ts.isParenthesizedExpression(current)) {
    current = current.expression;
  }
  return current;
}

/**
 * プロパティ名を文字列として取り出す。
 * copy.ts は Identifier（例: `href:`）のみのはずだが、
 * StringLiteral（例: `"href":`）にも安全側で対応する。
 */
function getPropertyName(name: ts.PropertyName): string | undefined {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name)) {
    return name.text;
  }
  return undefined;
}

/**
 * 式ノードを走査し、StringLiteral に出会うたびに visitor を呼ぶ。
 * ObjectLiteralExpression のプロパティ、ArrayLiteralExpression の要素を
 * 再帰的に辿る。SITE.postalAddress のような PropertyAccessExpression 参照や
 * NullLiteral・数値リテラル等は無視する（列挙しない・置換対象にしない）。
 */
function visitExpression(
  expr: ts.Expression,
  currentPath: string,
  visitor: StringLiteralVisitor,
): void {
  const node = unwrapExpression(expr);

  if (ts.isStringLiteral(node)) {
    visitor(node, currentPath);
    return;
  }

  if (ts.isObjectLiteralExpression(node)) {
    for (const prop of node.properties) {
      if (!ts.isPropertyAssignment(prop)) {
        // ShorthandPropertyAssignment / SpreadAssignment / MethodDeclaration 等は対象外
        continue;
      }
      const key = getPropertyName(prop.name);
      if (key === undefined) continue;
      visitExpression(prop.initializer, `${currentPath}.${key}`, visitor);
    }
    return;
  }

  if (ts.isArrayLiteralExpression(node)) {
    node.elements.forEach((el, index) => {
      if (ts.isExpression(el)) {
        visitExpression(el, `${currentPath}.${index}`, visitor);
      }
    });
    return;
  }

  // Identifier（SITE.postalAddress 等の参照）・PropertyAccessExpression・
  // NullLiteral・NumericLiteral・BooleanLiteral 等は列挙しない
}

/**
 * ソース全体を走査し、トップレベルの `export const NAME = {...}` /
 * `export const NAME = [...]` を起点に visitor を適用する。
 */
function walkSource(sourceFile: ts.SourceFile, visitor: StringLiteralVisitor): void {
  for (const stmt of sourceFile.statements) {
    if (!ts.isVariableStatement(stmt)) continue;

    const isExported = stmt.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    if (!isExported) continue;

    for (const decl of stmt.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name)) continue;
      if (!decl.initializer) continue;

      const rootName = decl.name.text;
      const init = unwrapExpression(decl.initializer);

      if (ts.isObjectLiteralExpression(init) || ts.isArrayLiteralExpression(init)) {
        visitExpression(init, rootName, visitor);
      }
    }
  }
}

/**
 * copy.ts のソース文字列から、フィールド一覧を抽出する。
 * kind は value が "/images/" で始まる場合のみ "image"、それ以外は "text"。
 */
export function extractFields(source: string): CopyField[] {
  const sourceFile = ts.createSourceFile("copy.ts", source, ts.ScriptTarget.Latest, true);
  const fields: CopyField[] = [];

  walkSource(sourceFile, (node, fieldPath) => {
    const value = node.text;
    const kind: CopyField["kind"] = value.startsWith("/images/") ? "image" : "text";
    fields.push({ path: fieldPath, value, kind });
  });

  return fields;
}

/**
 * fieldPath に一致する StringLiteral を JSON.stringify(newValue) で置換した
 * 新しいソース文字列を返す。
 * - 一致するノードが無ければ throw
 * - 置換後の内容を再パースし、構文エラーがあれば throw
 *   （破損した内容をディスクに書かせない最終防波堤）
 */
export function replaceField(source: string, fieldPath: string, newValue: string): string {
  const sourceFile = ts.createSourceFile("copy.ts", source, ts.ScriptTarget.Latest, true);

  let target: ts.StringLiteral | undefined;
  walkSource(sourceFile, (node, currentPath) => {
    if (currentPath === fieldPath) {
      target = node;
    }
  });

  if (!target) {
    throw new Error("field not found: " + fieldPath);
  }

  const start = target.getStart(sourceFile);
  const end = target.getEnd();
  const replacement = JSON.stringify(newValue);
  const newSource = source.slice(0, start) + replacement + source.slice(end);

  // 置換結果を再パースして構文が壊れていないことを確認する
  const reparsed = ts.createSourceFile("copy.ts", newSource, ts.ScriptTarget.Latest, true);
  const diagnostics = (reparsed as unknown as { parseDiagnostics?: unknown[] }).parseDiagnostics;
  if (diagnostics && diagnostics.length > 0) {
    throw new Error("replacement produced invalid syntax for field: " + fieldPath);
  }

  return newSource;
}
