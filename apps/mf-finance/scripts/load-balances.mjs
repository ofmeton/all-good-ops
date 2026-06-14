// scripts/load-balances.mjs — data/account-balances.json を account_balances へ冪等投入。
// 形式: [{ account, balance, kind?, as_of? }]。kind 未指定は口座名から推定。
// MF からの実取得は scripts/acquire.md「口座別残高」節 → JSON 化 → 本ローダ。
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { applyRecurringMigrations } from "../db/migrate.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = join(__dirname, "..");
const dbPath = join(appRoot, "data", "mf-finance.db");
const schemaPath = join(appRoot, "db", "schema.sql");
const jsonPath = join(appRoot, "data", "account-balances.json");

function guessKind(account) {
  if (/銀行|ゆうちょ|bank/i.test(account)) return "bank";
  if (/カード|card|JCB|VISA|Vpass|Amazon/i.test(account)) return "card";
  if (/PayPay|PASMO|Suica|楽天ペイ|電子マネー|emoney/i.test(account)) return "emoney";
  if (/現金|cash/i.test(account)) return "cash";
  if (/暗号|crypto|bit/i.test(account)) return "crypto";
  return "other";
}

if (!existsSync(jsonPath)) {
  console.log("未取込: data/account-balances.json を置いて再実行してください（MFの口座別残高）");
  process.exit(0);
}

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.exec(readFileSync(schemaPath, "utf8"));
applyRecurringMigrations(db);

const rows = JSON.parse(readFileSync(jsonPath, "utf8"));
if (!Array.isArray(rows)) {
  console.error("account-balances.json は配列である必要があります");
  process.exit(1);
}

const upsert = db.prepare(
  `INSERT INTO account_balances (account, kind, balance, as_of, source)
   VALUES (@account, @kind, @balance, @as_of, 'mf')
   ON CONFLICT(account) DO UPDATE SET
     balance = excluded.balance, kind = excluded.kind, as_of = excluded.as_of,
     source = 'mf', updated_at = (strftime('%Y-%m-%dT%H:%M:%SZ','now'))`,
);

const load = db.transaction((items) => {
  let n = 0;
  for (const r of items) {
    if (!r || typeof r.account !== "string" || !Number.isFinite(Number(r.balance))) continue;
    upsert.run({
      account: r.account.trim(),
      kind: r.kind ?? guessKind(r.account),
      balance: Math.round(Number(r.balance)),
      as_of: r.as_of ?? null,
    });
    n += 1;
  }
  return n;
});
const n = load(rows);

const total = db.prepare("SELECT COALESCE(SUM(balance),0) s, COUNT(*) c FROM account_balances").get();
console.log(`account_balances: ${n} 件投入 → 総 ${total.c} 口座 / 合計 ¥${total.s.toLocaleString()}`);
db.close();
