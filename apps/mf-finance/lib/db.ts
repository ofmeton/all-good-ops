import "server-only";
import { join } from "node:path";
import Database from "better-sqlite3";

// better-sqlite3 は同期 API。server component / server action から直接呼べる（Promise不要）。
// HMR で多重オープンしないよう globalThis にシングルトンをキャッシュ。
const g = globalThis as unknown as { __mfDb?: Database.Database };

function openDb(): Database.Database {
  const dbPath = join(process.cwd(), "data", "mf-finance.db");
  const d = new Database(dbPath, { readonly: false, fileMustExist: false });
  d.pragma("journal_mode = WAL");
  d.pragma("foreign_keys = ON");
  return d;
}

export const db: Database.Database = g.__mfDb ?? (g.__mfDb = openDb());
