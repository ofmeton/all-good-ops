// lib/optimizer/grouping.ts — category_groups（大項目→表示グループ）ロールアップ。
// spec: docs/superpowers/specs/2026-06-13-mf-finance-optimizer-design.md §7
//
// 純関数（groupName / rollupByGroup）は server/db に依存せず単体テスト可能
// （test/optimizer-grouping.test.mjs が node:test で import）。
// getCategoryGroups だけ DB を読む。db.ts は `import "server-only"` を持ち、
// プレーン Node（テスト）では server-only が throw するため、ここでは db.ts を静的 import せず
// better-sqlite3 を lazy に開く（db.ts と同じ globalThis シングルトンを共有）。
import { join } from "node:path";
import Database from "better-sqlite3";

// マッピング: category_major → group_name。未設定の大項目は自身名にフォールバック。
export type GroupMapping = Record<string, string>;

// 純: mapping にあればグループ名、無ければ大項目名そのもの。
export function groupName(categoryMajor: string, mapping: GroupMapping): string {
  return mapping[categoryMajor] ?? categoryMajor;
}

// 純: 大項目単位の行をグループ単位へ畳み込む。
// - labelKey: 各行の大項目名フィールド（categories は "major"、budget は "category_major"）。
//   畳んだ後はグループ名で上書きする（既存レンダリングが同じキーを再利用できる）。
// - sumKeys: 合算対象の数値フィールド（null/undefined は 0 とみなす）。
// - sumKey 以外のフィールドはグループ先頭行の値を温存（派生値は呼び出し側で再計算する想定）。
// 未設定の大項目は groupName が自身名を返すため素通し（1大項目=1グループ）。挿入順を保持。
export function rollupByGroup<T extends object>(
  rows: readonly T[],
  mapping: GroupMapping,
  labelKey: keyof T,
  sumKeys: readonly (keyof T)[],
): T[] {
  const order: string[] = [];
  const acc = new Map<string, T>();
  for (const row of rows) {
    const g = groupName(String(row[labelKey] ?? ""), mapping);
    let cur = acc.get(g);
    if (!cur) {
      cur = { ...row, [labelKey]: g } as T;
      for (const k of sumKeys) cur[k] = 0 as T[keyof T];
      acc.set(g, cur);
      order.push(g);
    }
    for (const k of sumKeys) {
      const next = ((cur[k] as number) ?? 0) + (Number(row[k]) || 0);
      cur[k] = next as T[keyof T];
    }
  }
  return order.map((g) => acc.get(g)!);
}

// --- server: category_groups 読取（lazy DB。db.ts の globalThis シングルトンを共有） ---

function groupingDb(): Database.Database {
  const g = globalThis as unknown as { __mfDb?: Database.Database };
  if (g.__mfDb) return g.__mfDb;
  const d = new Database(join(process.cwd(), "data", "mf-finance.db"), {
    readonly: false,
    fileMustExist: false,
  });
  d.pragma("journal_mode = WAL");
  d.pragma("foreign_keys = ON");
  return (g.__mfDb = d);
}

// category_groups を category_major→group_name の連想に展開。
// 0 件なら空オブジェクト＝全大項目が素通し（group 表示でも実質 major と同じ）。
export function getCategoryGroups(): GroupMapping {
  const rows = groupingDb()
    .prepare("SELECT category_major, group_name FROM category_groups")
    .all() as { category_major: string; group_name: string }[];
  const map: GroupMapping = {};
  for (const r of rows) map[r.category_major] = r.group_name;
  return map;
}
