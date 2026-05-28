/**
 * デモ用 seed。営業資料に出しても問題ない架空の物件・スタッフ・オーナーを投入。
 * - 既存の test/demo データを FK 順で全削除してから insert
 * - admin user は Supabase Auth に作成
 * - 結果として scenes が想定する初期状態（依頼 0 件 / 管理者ログイン可 / スタッフURL 1 件）を作る
 *
 * 環境変数:
 *   NEXT_PUBLIC_SUPABASE_URL        (default: http://127.0.0.1:54321)
 *   SUPABASE_SERVICE_ROLE_KEY       (required)
 *   DEMO_ADMIN_EMAIL                (default: demo-admin@stayclean.local)
 *   DEMO_ADMIN_PASSWORD             (default: demo-password-2026)
 *
 * 出力: output/seed-result.json に staff token / admin credentials を保存し record.ts が読む。
 */

import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config as dotenv } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoAppDir = join(__dirname, "../../app");
dotenv({ path: join(repoAppDir, ".env.local") });

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_KEY) {
  console.error(
    "[seed] SUPABASE_SERVICE_ROLE_KEY が未設定。app/.env.local を確認してください。",
  );
  process.exit(1);
}

const ADMIN_EMAIL = process.env.DEMO_ADMIN_EMAIL || "demo-admin@stayclean.local";
const ADMIN_PASSWORD =
  process.env.DEMO_ADMIN_PASSWORD || "demo-password-2026";

const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

async function wipeDemoData() {
  // FK 順に削除（既存 e2e と同じ）
  const tables = [
    "report_photos",
    "cleaning_reports",
    "supply_requests",
    "cleaning_requests",
    "access_tokens",
    "staff_assignments",
    "staff",
    "properties",
    "owners",
  ];
  for (const t of tables) {
    await db.from(t).delete().not(t === "staff_assignments" ? "staff_id" : "id", "is", null);
  }
}

async function ensureAdmin(): Promise<string> {
  const { data: existing } = await db
    .from("admins")
    .select("id")
    .eq("email", ADMIN_EMAIL)
    .maybeSingle();
  if (existing) return existing.id;
  const { data: created, error } = await db.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;
  await db
    .from("admins")
    .insert({ id: created.user!.id, email: ADMIN_EMAIL, name: "デモ管理者" });
  return created.user!.id;
}

async function main() {
  console.log("[seed] wipe existing demo data");
  await wipeDemoData();

  console.log("[seed] ensure admin");
  const adminId = await ensureAdmin();

  console.log("[seed] insert owner / properties / staff");
  const { data: owner, error: ownerErr } = await db
    .from("owners")
    .insert({
      name: "民泊オーナー A 様",
      email: "demo-owner@stayclean.local",
    })
    .select()
    .single();
  if (ownerErr) throw ownerErr;

  const checklistLabels = [
    "玄関・廊下の掃き掃除",
    "リビング 床清掃 / 家具拭き上げ",
    "ベッドメイク（シーツ / 枕カバー交換）",
    "浴室・洗面台のクリーニング",
    "キッチン 排水口・コンロ清掃",
    "トイレ清掃 / 備品補充",
    "ゴミ集約 / 室温セット",
  ];
  const { data: property, error: propErr } = await db
    .from("properties")
    .insert({
      owner_id: owner!.id,
      name: "渋谷ベイサイドハウス 301",
      address: "東京都渋谷区神南 1-2-3",
      access_info_note: "鍵は玄関ポスト内のキーボックス（暗証番号別途共有）",
      checklist_template: checklistLabels.map((label) => ({ label })),
    })
    .select()
    .single();
  if (propErr) throw propErr;

  const { data: staff, error: staffErr } = await db
    .from("staff")
    .insert({
      name: "佐藤 美咲",
      email: "demo-staff@stayclean.local",
    })
    .select()
    .single();
  if (staffErr) throw staffErr;

  await db
    .from("staff_assignments")
    .insert({ staff_id: staff!.id, property_id: property!.id });

  const staffToken = randomBytes(32).toString("base64url");
  await db
    .from("access_tokens")
    .insert({ token: staffToken, type: "staff", staff_id: staff!.id });

  const ownerToken = randomBytes(32).toString("base64url");
  await db
    .from("access_tokens")
    .insert({
      token: ownerToken,
      type: "owner",
      property_id: property!.id,
    });

  const seedResult = {
    seededAt: new Date().toISOString(),
    admin: { id: adminId, email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    owner: { id: owner!.id, name: owner!.name },
    property: {
      id: property!.id,
      name: property!.name,
      checklistLabels,
    },
    staff: { id: staff!.id, name: staff!.name, token: staffToken },
    ownerToken,
  };

  const outDir = join(__dirname, "..", "output");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    join(outDir, "seed-result.json"),
    JSON.stringify(seedResult, null, 2),
  );

  console.log("[seed] done");
  console.log("  property:", property!.name);
  console.log("  staff:   ", staff!.name);
  console.log("  saved -> output/seed-result.json");
}

main().catch((e) => {
  console.error("[seed] failed:", e);
  process.exit(1);
});
