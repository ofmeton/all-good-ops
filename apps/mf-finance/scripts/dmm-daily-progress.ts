// 毎晩 22:00 の DMM 稼働の進捗（mini のルーティン dmm-daily-progress から起動）。
// カレンダーの dmm_log を数え、今月の目標（金曜の週次チェックが計算した data/dmm-target.json）との差を Slack #milla-oc へ送る。
//
// 実行: ./scripts/dmm-daily-progress.sh [options]
//   --no-notify   Slack に送らず、本文を標準出力に出す
//   --now=ISO     現在時刻を差し替える（試験用）
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { daysInMonth, dmmProgress, monthKey } from "../lib/weekly/estimate.mjs";
import { listEvents } from "./weekly-cash-check/calendar";

const appDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const cfg = JSON.parse(readFileSync(join(appDir, "scripts/weekly-cash-check.config.json"), "utf8"));
const args = new Map(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? "true"] as const;
  }),
);
const NOTIFY = !args.has("no-notify");
const now = args.get("now") ?? new Date().toISOString();
const nowJst = `${new Date(Date.parse(now) + 9 * 3600_000).toISOString().slice(0, 19)}+09:00`;
const today = nowJst.slice(0, 10);
const month = monthKey(today);
const r1 = (x: number) => Math.round(x * 10) / 10;
const md = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;

const [y, m] = month.split("-").map(Number);
const nextMonth = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
const from = `${month}-01T00:00:00+09:00`;
const to = `${nextMonth}-01T00:00:00+09:00`;
const primary = listEvents(cfg.calendars.primary, from, to, appDir);
const kcgrp = listEvents(cfg.calendars.dmm, from, to, appDir);
const p = dmmProgress({ primaryEvents: primary, kcgrpEvents: kcgrp, now: nowJst, month, rules: cfg.dmmRules });
// 目標は金曜の週次チェックが計算して data/dmm-target.json に書いたもの。月が違えば使わない。
const targetPath = join(appDir, "data/dmm-target.json");
const saved = existsSync(targetPath) ? JSON.parse(readFileSync(targetPath, "utf8")) : null;
const target: number | undefined = saved?.month === month ? saved.hours : undefined;

const lines: string[] = [];
lines.push(`*DMM 稼働の進捗（${md(today)} ${nowJst.slice(11, 16)}）*`);
if (target == null) {
  lines.push(`・今月の実績（dmm_log）: ${r1(p.logHours)}h`);
  lines.push("・今月の目標はまだ計算されていない（金曜朝の週次の資金チェックで計算される）");
} else {
  lines.push(`・実績（dmm_log）: ${r1(p.logHours)}h / 目標 ${target}h（${Math.round((p.logHours / target) * 100)}%・目標金額 ${saved.yen.toLocaleString("ja-JP")}円、${md(saved.computedAt)}の週次で計算）`);
  const gap = p.projectedHours - target;
  lines.push(
    `・予定どおり進めば ${r1(p.projectedHours)}h → 目標に ${gap >= 0 ? `${r1(gap)}h 届く余裕あり` : `${r1(-gap)}h 足りない`}` +
      `（確定のゼミなど ${r1(p.confirmedHours)}h・これからの dmm_plan ${r1(p.planHours)}h を含む）`,
  );
  const daysLeft = daysInMonth(month) - Number(today.slice(8, 10));
  const need = target - p.logHours - p.confirmedHours;
  if (need > 0 && daysLeft > 0) lines.push(`・残り ${daysLeft}日。確定分を除いて、あと ${r1(need)}h（1日あたり ${r1(need / daysLeft)}h）`);
  else if (need > 0) lines.push(`・今月はもう日が無い。目標まで ${r1(need)}h`);
  else lines.push("・確定分だけで目標に届く見込み");
}
if (p.missed.length) {
  const total = p.missed.reduce((s, x) => s + x.hours, 0);
  const list = p.missed.map((x) => `${md(x.start)} ${r1(x.hours)}h`).join("、");
  lines.push(`・予定（dmm_plan）していたのに dmm_log が無い: ${list}（計 ${r1(total)}h。やったなら dmm_log を付ける）`);
}
const text = lines.join("\n");

if (!NOTIFY) {
  console.log(text);
} else {
  const r = spawnSync(join(homedir(), ".local/bin/milla-oc-notify"), ["INFO", text, "dmm-daily-progress"], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`Slack への送信に失敗: ${(r.stderr || r.stdout).trim()}`);
  console.log(text);
}
