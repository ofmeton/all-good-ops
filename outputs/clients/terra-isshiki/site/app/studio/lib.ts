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

export type CopyField = { path: string; value: string; kind: "text" | "image" | "focal" };

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
 * kind の判定順序:
 *   1. path 末尾のキーが "focal" → "focal"（image 判定より優先。
 *      focal の値は "50% 50%" のような CSS object-position で "/images/" 始まりではないため
 *      放っておけば text 扱いになるところを、専用エディタに回すために先に拾う）
 *   2. value が "/images/" で始まる → "image"
 *   3. それ以外 → "text"
 */
export function extractFields(source: string): CopyField[] {
  const sourceFile = ts.createSourceFile("copy.ts", source, ts.ScriptTarget.Latest, true);
  const fields: CopyField[] = [];

  walkSource(sourceFile, (node, fieldPath) => {
    const value = node.text;
    const lastKey = fieldPath.slice(fieldPath.lastIndexOf(".") + 1);
    let kind: CopyField["kind"];
    if (lastKey === "focal") {
      kind = "focal";
    } else if (value.startsWith("/images/")) {
      kind = "image";
    } else {
      kind = "text";
    }
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

/**
 * ------------------------------------------------------------------
 * 画像ギャラリー（画像だけで構成された配列）の列挙・追加・削除
 * ------------------------------------------------------------------
 * copy.ts の中には「スライドショー用の写真配列」がいくつか存在する
 * （例: TOP.heroSlides / TOP.bands.2.slides / TOP.roomsDetail.marquee /
 * ROOMS_PAGE.gallery.0.items）。これらは要素間にコメントが無い前提で、
 * 「各要素の元テキストを保ったまま配列を丸ごと作り直す」方式で
 * 安全に追加・削除する。walkSource / visitExpression とは別の
 * ArrayLiteralExpression 単位の走査をここで行う。
 */

/** ArrayLiteralExpression とその走査パスのペア */
type ArrayLiteralVisitor = (node: ts.ArrayLiteralExpression, arrayPath: string) => void;

/**
 * ソース全体を走査し、あらゆる ArrayLiteralExpression（オブジェクトの
 * プロパティ値・配列の要素として現れるもの）にパスを付けて visitor を呼ぶ。
 * extractFields 系の walkSource と同じ再帰ロジックを踏襲しつつ、
 * StringLiteral ではなく ArrayLiteralExpression 自体を対象にする。
 */
function walkArrayLiterals(sourceFile: ts.SourceFile, visitor: ArrayLiteralVisitor): void {
  function visit(expr: ts.Expression, currentPath: string): void {
    const node = unwrapExpression(expr);

    if (ts.isArrayLiteralExpression(node)) {
      visitor(node, currentPath);
      node.elements.forEach((el, index) => {
        if (ts.isExpression(el)) {
          visit(el, `${currentPath}.${index}`);
        }
      });
      return;
    }

    if (ts.isObjectLiteralExpression(node)) {
      for (const prop of node.properties) {
        if (!ts.isPropertyAssignment(prop)) continue;
        const key = getPropertyName(prop.name);
        if (key === undefined) continue;
        visit(prop.initializer, `${currentPath}.${key}`);
      }
      return;
    }

    // StringLiteral・Identifier・NullLiteral 等はここでは無視
  }

  for (const stmt of sourceFile.statements) {
    if (!ts.isVariableStatement(stmt)) continue;

    const isExported = stmt.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    if (!isExported) continue;

    for (const decl of stmt.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name)) continue;
      if (!decl.initializer) continue;

      const rootName = decl.name.text;
      const init = unwrapExpression(decl.initializer);
      visit(init, rootName);
    }
  }
}

/**
 * ArrayLiteralExpression の要素が「画像だけの配列」の要素として
 * 認められる形かどうかを判定する。
 * - object: ObjectLiteralExpression で、src プロパティが "/images/" 始まりの StringLiteral
 * - string: StringLiteral で "/images/" 始まり
 */
function getElementImagePath(el: ts.Expression): { kind: "object" | "string"; image: string } | undefined {
  const node = unwrapExpression(el);

  if (ts.isStringLiteral(node)) {
    if (node.text.startsWith("/images/")) {
      return { kind: "string", image: node.text };
    }
    return undefined;
  }

  if (ts.isObjectLiteralExpression(node)) {
    for (const prop of node.properties) {
      if (!ts.isPropertyAssignment(prop)) continue;
      const key = getPropertyName(prop.name);
      if (key !== "src") continue;
      const value = unwrapExpression(prop.initializer);
      if (ts.isStringLiteral(value) && value.text.startsWith("/images/")) {
        return { kind: "object", image: value.text };
      }
    }
    return undefined;
  }

  return undefined;
}

/**
 * ArrayLiteralExpression が「画像だけで構成された配列（ギャラリー）」かどうかを判定する。
 * 要素が1つ以上あり、全要素が同じ kind（object または string）で
 * getElementImagePath が成功する場合のみギャラリーとみなす。
 * 戻り値: 統一された elementKind と各要素の image パス（順序どおり）。該当しなければ undefined。
 */
function classifyGallery(
  node: ts.ArrayLiteralExpression,
): { elementKind: "object" | "string"; images: string[] } | undefined {
  if (node.elements.length === 0) return undefined;

  let elementKind: "object" | "string" | undefined;
  const images: string[] = [];

  for (const el of node.elements) {
    if (!ts.isExpression(el)) return undefined;
    const parsed = getElementImagePath(el);
    if (!parsed) return undefined;
    if (elementKind === undefined) {
      elementKind = parsed.kind;
    } else if (elementKind !== parsed.kind) {
      return undefined;
    }
    images.push(parsed.image);
  }

  if (!elementKind) return undefined;
  return { elementKind, images };
}

/**
 * copy.ts 内の「画像だけで構成された配列」を列挙する。
 */
export function extractGalleries(
  source: string,
): { path: string; elementKind: "object" | "string"; images: string[] }[] {
  const sourceFile = ts.createSourceFile("copy.ts", source, ts.ScriptTarget.Latest, true);
  const galleries: { path: string; elementKind: "object" | "string"; images: string[] }[] = [];

  walkArrayLiterals(sourceFile, (node, arrayPath) => {
    const classified = classifyGallery(node);
    if (classified) {
      galleries.push({ path: arrayPath, elementKind: classified.elementKind, images: classified.images });
    }
  });

  return galleries;
}

/**
 * arrayPath に一致する ArrayLiteralExpression ノードを探す。
 * 見つからなければ throw。
 */
function findArrayNode(sourceFile: ts.SourceFile, arrayPath: string): ts.ArrayLiteralExpression {
  let target: ts.ArrayLiteralExpression | undefined;
  walkArrayLiterals(sourceFile, (node, currentPath) => {
    if (currentPath === arrayPath) {
      target = node;
    }
  });

  if (!target) {
    throw new Error("array not found: " + arrayPath);
  }

  return target;
}

/**
 * 配列ノードの開始位置から、その行の行頭インデント（直前の "\n" 以降の空白）を求める。
 */
function getBaseIndent(source: string, arrayNode: ts.ArrayLiteralExpression, sourceFile: ts.SourceFile): string {
  const start = arrayNode.getStart(sourceFile);
  const lineStart = source.lastIndexOf("\n", start - 1) + 1;
  const linePrefix = source.slice(lineStart, start);
  const match = linePrefix.match(/^[ \t]*/);
  return match ? match[0] : "";
}

/**
 * 配列要素の元テキスト一覧から、copy.ts の既存スタイル（各要素末尾にカンマ、
 * 最後もカンマ）で配列リテラルの文字列を再構築する。
 */
function rebuildArrayText(elementTexts: string[], baseIndent: string): string {
  if (elementTexts.length === 0) {
    return "[]";
  }

  const elemIndent = baseIndent + "  ";
  const lines = elementTexts.map((t) => elemIndent + t + ",");
  return "[\n" + lines.join("\n") + "\n" + baseIndent + "]";
}

/**
 * 再構築後のソースを再パースし、構文が壊れていないことを確認する。
 * 壊れていれば throw（replaceField と同じ最終防波堤）。
 */
function assertReparsable(newSource: string, context: string): void {
  const reparsed = ts.createSourceFile("copy.ts", newSource, ts.ScriptTarget.Latest, true);
  const diagnostics = (reparsed as unknown as { parseDiagnostics?: unknown[] }).parseDiagnostics;
  if (diagnostics && diagnostics.length > 0) {
    throw new Error("operation produced invalid syntax for array: " + context);
  }
}

/**
 * 画像配列の末尾に画像を1枚追加する。
 * 既存要素の形（object の場合は { src, alt }、string の場合はその値）を踏襲する。
 * 空配列の場合は object 形をデフォルトにする。
 */
export function appendImageToArray(source: string, arrayPath: string, imagePath: string): string {
  const sourceFile = ts.createSourceFile("copy.ts", source, ts.ScriptTarget.Latest, true);
  const arrayNode = findArrayNode(sourceFile, arrayPath);

  const elements = arrayNode.elements;
  const existingTexts = elements.map((el) => source.slice(el.getStart(sourceFile), el.getEnd()));

  // 要素の形を判定（先頭要素から）。空なら object をデフォルトにする。
  let elementKind: "object" | "string" = "object";
  if (elements.length > 0) {
    const first = unwrapExpression(elements[0] as ts.Expression);
    if (ts.isStringLiteral(first)) {
      elementKind = "string";
    } else if (ts.isObjectLiteralExpression(first)) {
      elementKind = "object";
    }
  }

  const newElementText =
    elementKind === "object"
      ? `{ src: ${JSON.stringify(imagePath)}, alt: "" }`
      : JSON.stringify(imagePath);

  const newTexts = [...existingTexts, newElementText];
  const baseIndent = getBaseIndent(source, arrayNode, sourceFile);
  const rebuilt = rebuildArrayText(newTexts, baseIndent);

  const newSource =
    source.slice(0, arrayNode.getStart(sourceFile)) + rebuilt + source.slice(arrayNode.getEnd());

  assertReparsable(newSource, arrayPath);
  return newSource;
}

/**
 * 画像配列の index 番目の要素を削除する。範囲外 index は throw。
 */
export function removeArrayElement(source: string, arrayPath: string, index: number): string {
  const sourceFile = ts.createSourceFile("copy.ts", source, ts.ScriptTarget.Latest, true);
  const arrayNode = findArrayNode(sourceFile, arrayPath);

  const elements = arrayNode.elements;
  if (index < 0 || index >= elements.length) {
    throw new Error("index out of range for array: " + arrayPath);
  }

  const existingTexts = elements.map((el) => source.slice(el.getStart(sourceFile), el.getEnd()));
  const newTexts = existingTexts.filter((_, i) => i !== index);

  const baseIndent = getBaseIndent(source, arrayNode, sourceFile);
  const rebuilt = rebuildArrayText(newTexts, baseIndent);

  const newSource =
    source.slice(0, arrayNode.getStart(sourceFile)) + rebuilt + source.slice(arrayNode.getEnd());

  assertReparsable(newSource, arrayPath);
  return newSource;
}
