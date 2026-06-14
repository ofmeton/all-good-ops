#!/usr/bin/env node
// web-ui-bridge daemon — クリック→Claude Code プロンプト橋渡しのローカル中継。
//
// 役割:
//   - overlay からの POST /enqueue を受け、対象サイト直下の .claude-ui-queue.jsonl に1行追記
//   - POST /apply-style で className を一意性ガード付きでソース直書き換え（Phase B・Claude 不介在）
//   - GET /overlay.js で overlay スクリプトを配信（対象サイトは <script src> 1行で読むだけ）
//   - GET /health で疎通確認
//
// 起動: web-ui-bridge --target <site-dir> [--port 7331]
// 本番ビルドには一切関与しない（dev 専用のローカルツール）。
//
// セキュリティ（dev daemon だがソースを書き換える & ブラウザから到達可能なので CSRF/traversal 防御）:
//   - 127.0.0.1 のみ listen（リモートから到達不可）
//   - 状態変更(POST)は Origin が localhost/127.0.0.1 か検証 + 起動時生成のトークン必須
//     （トークンは overlay.js に埋めて同一 daemon から配信。/overlay.js は CORS 不可にし
//      クロスオリジン fetch で読めなくする＝script タグ実行のみ）
//   - 書き換え対象は --target 配下に限定（path 解決後に prefix 検証）
//   - newClassName は className literal を壊す文字（" { } < > ` ; 等）を拒否

import http from "node:http";
import { appendFile, readFile, writeFile, readdir } from "node:fs/promises";
import { existsSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { applyStyleBatch, structureBatch } from "./apply.mjs";
import { moveInSource, deleteInSource, duplicateInSource, moveGroupInSource } from "./reorder.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const args = { target: process.cwd(), port: 7331 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--target") args.target = path.resolve(argv[++i]);
    else if (a === "--port") args.port = Number(argv[++i]);
    else if (a === "--overlay") args.overlay = path.resolve(argv[++i]);
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const TARGET_ROOT = path.resolve(args.target);
const QUEUE_FILE = path.join(TARGET_ROOT, ".claude-ui-queue.jsonl");
const OVERLAY_FILE = args.overlay ?? path.join(__dirname, "..", "overlay", "overlay.js");
// トークンは target ごとに永続化（daemon 再起動でも同一→開いたままのページが無効化されない）。
// 目的は CSRF 防御（リモートサイトから読めない）＝ローカルファイル化しても変わらない。
const TOKEN_FILE = path.join(TARGET_ROOT, ".web-ui-bridge-token");
let TOKEN;
try {
  if (existsSync(TOKEN_FILE)) {
    TOKEN = readFileSync(TOKEN_FILE, "utf8").trim();
    try { chmodSync(TOKEN_FILE, 0o600); } catch {} // 既存ファイルを owner-only に締め直す
  } else TOKEN = "";
} catch { TOKEN = ""; }
if (!/^[0-9a-f-]{36}$/.test(TOKEN)) {
  TOKEN = randomUUID();
  // owner 読み書きのみ（world-readable 回避）。トークンは CSRF 防御の秘密値。
  try { writeFileSync(TOKEN_FILE, TOKEN, { mode: 0o600 }); } catch {}
}

if (!existsSync(TARGET_ROOT)) {
  console.error(`[web-ui-bridge] target dir does not exist: ${TARGET_ROOT}`);
  process.exit(1);
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Bridge-Token",
};

function send(res, status, headers, body) {
  res.writeHead(status, { ...CORS, ...headers });
  res.end(body);
}

// 状態変更(POST)のガード: Origin が localhost 系 かつ トークン一致 のときだけ許可。
// リモート悪意サイトからの CSRF（localhost への自動 POST でソース改竄）を遮断する。
function authorizeMutation(req) {
  const origin = req.headers.origin;
  if (!origin || !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    return { ok: false, status: 403, error: "forbidden-origin" };
  }
  if (req.headers["x-bridge-token"] !== TOKEN) {
    return { ok: false, status: 403, error: "bad-token" };
  }
  return { ok: true };
}

function readBody(req, limit = 1_000_000) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => {
      data += c;
      if (data.length > limit) reject(new Error("payload too large"));
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

// ---- Phase B: className → ソース直書き換え ------------------------------
// route から候補ファイルを推定（App Router）。見つからなければ app/ 配下を広く探索。
async function walkTsx(dir, acc = [], depth = 0) {
  if (depth > 6) return acc;
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return acc; }
  for (const e of entries) {
    if (e.name === "node_modules" || e.name === ".next" || e.name.startsWith(".")) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await walkTsx(full, acc, depth + 1);
    else if (/\.(tsx|jsx)$/.test(e.name)) acc.push(full);
  }
  return acc;
}

// TARGET_ROOT 配下に収まっているか（path traversal 防御）
function insideTarget(full) {
  const resolved = path.resolve(full);
  return resolved === TARGET_ROOT || resolved.startsWith(TARGET_ROOT + path.sep);
}

function routeToFile(route) {
  const clean = (route || "/").split("?")[0].replace(/\/+$/, "");
  // route は App Router のパス文字のみ許可（`..` やシェル文字を弾く）
  if (clean !== "" && !/^\/[A-Za-z0-9_\-\/\[\]]*$/.test(clean)) return null;
  const rel = clean === "" ? "app/page.tsx" : `app${clean}/page.tsx`;
  const full = path.join(TARGET_ROOT, rel);
  if (!insideTarget(full)) return null;
  return existsSync(full) ? full : null;
}

// oldClassName(= className 属性の literal)を一意に特定して newClassName へ置換。
// className は静的文字列のときソースと完全一致する。一致しない（テンプレ/条件式）時は not-found→Claude にフォールバック。
// className literal を壊さない文字だけ許可（Tailwind の arbitrary 値 text-[clamp(..)] や
// CSS 変数 text-(--x) は許容しつつ、" { } < > ` ; = などの JSX/JS ブレイクアウト文字を拒否）。
const CLASS_RE = /^[A-Za-z0-9 _:\-\/\[\]\.\(\)%,#!@]*$/;

async function applyStyle({ route, oldClassName, newClassName }) {
  if (!oldClassName || !newClassName) return { ok: false, reason: "missing-classname" };
  if (typeof newClassName !== "string" || newClassName.length > 2000 || !CLASS_RE.test(newClassName)) {
    return { ok: false, reason: "invalid-classname" };
  }
  if (oldClassName === newClassName) return { ok: true, file: null, noop: true };

  // 探索順: route のページファイル → app/ 配下全 tsx
  const candidates = [];
  const routeFile = routeToFile(route);
  if (routeFile) candidates.push(routeFile);
  const all = await walkTsx(path.join(TARGET_ROOT, "app"));
  for (const f of all) if (!candidates.includes(f) && insideTarget(f)) candidates.push(f);

  // 各ファイルでの出現回数を集計
  const hits = [];
  for (const file of candidates) {
    const src = await readFile(file, "utf8");
    let count = 0, idx = 0;
    while ((idx = src.indexOf(oldClassName, idx)) !== -1) { count++; idx += oldClassName.length; }
    if (count > 0) hits.push({ file, count, src });
  }

  const totalCount = hits.reduce((s, h) => s + h.count, 0);
  if (totalCount === 0) return { ok: false, reason: "not-found" };

  // 一意なら確定。route ファイルに 1 回だけ出るならそれを優先。
  let target = null;
  if (totalCount === 1) target = hits[0];
  else if (routeFile) {
    const inRoute = hits.find((h) => h.file === routeFile);
    if (inRoute && inRoute.count === 1) target = inRoute;
  }
  if (!target) return { ok: false, reason: "ambiguous", count: totalCount };

  // 最初の 1 箇所だけ literal 置換して書き戻し（書込先が target 配下である最終確認）
  if (!insideTarget(target.file)) return { ok: false, reason: "outside-target" };
  const at = target.src.indexOf(oldClassName);
  const next = target.src.slice(0, at) + newClassName + target.src.slice(at + oldClassName.length);
  await recordedWrite(target.file, target.src, next, "直接調整");
  return { ok: true, file: path.relative(TARGET_ROOT, target.file) };
}

// Phase C: 構造編集の共通実行。route→app/** の候補を順に試し、最初に確定した
// ファイルへ書込。apply(src) は reorder.mjs の純関数（{ok,changed,src} or {reason}）。
async function findAndApply(route, apply, label = "編集") {
  const candidates = [];
  const routeFile = routeToFile(route);
  if (routeFile) candidates.push(routeFile);
  const all = await walkTsx(path.join(TARGET_ROOT, "app"));
  for (const f of all) if (!candidates.includes(f) && insideTarget(f)) candidates.push(f);

  let lastReason = "not-found";
  for (const file of candidates) {
    const src = await readFile(file, "utf8");
    const r = apply(src);
    if (r.ok && r.changed) {
      await recordedWrite(file, src, r.src, label);
      return { ok: true, file: path.relative(TARGET_ROOT, file) };
    }
    if (r.ok && !r.changed) return { ok: true, file: path.relative(TARGET_ROOT, file), noop: true };
    if (r.reason && r.reason !== "not-found") lastReason = r.reason; // ambiguous/nested 等を優先表示
  }
  return { ok: false, reason: lastReason };
}

async function findAndApplyBatch(route, apply, label, mapResult) {
  const candidates = [];
  const routeFile = routeToFile(route);
  if (routeFile) candidates.push(routeFile);
  const all = await walkTsx(path.join(TARGET_ROOT, "app"));
  for (const f of all) if (!candidates.includes(f) && insideTarget(f)) candidates.push(f);

  let fallback = null;
  let lastReason = "not-found";
  for (const file of candidates) {
    const src = await readFile(file, "utf8");
    const r = apply(src);
    if (r.ok && r.changed) {
      await recordedWrite(file, src, r.src, label(r));
      return mapResult(r, file);
    }
    if (r.ok && !r.changed) {
      fallback ??= mapResult(r, file);
      continue;
    }
    if (r.reason && r.reason !== "not-found") lastReason = r.reason;
  }
  return fallback ?? { ok: false, reason: lastReason };
}

function validateStyleBatchEdits(edits) {
  if (!Array.isArray(edits)) return { ok: false, reason: "missing-edits" };
  for (const e of edits) {
    if (!e?.oldClassName || !e?.newClassName) return { ok: false, reason: "missing-classname" };
    if (typeof e.newClassName !== "string" || e.newClassName.length > 2000 || !CLASS_RE.test(e.newClassName)) {
      return { ok: false, reason: "invalid-classname" };
    }
  }
  return { ok: true };
}

// ---- 編集履歴（undo/redo） --------------------------------------------
// 各編集の前後スナップショットを積む。undo は「現在の内容が after のまま」の時だけ
// before に戻す（外部=Claude/手編集/formatter の変更があれば潰さず拒否）。
// 履歴はディスク永続化し、daemon 再起動後も戻る/進むが効くようにする。
let undoStack = [];
let redoStack = [];
const HISTORY_MAX = 100;
const HISTORY_FILE = path.join(TARGET_ROOT, ".web-ui-bridge-history.json");
const rel = (f) => path.relative(TARGET_ROOT, f);

try {
  if (existsSync(HISTORY_FILE)) {
    const h = JSON.parse(readFileSync(HISTORY_FILE, "utf8"));
    if (Array.isArray(h.undo)) undoStack = h.undo;
    if (Array.isArray(h.redo)) redoStack = h.redo;
    console.log(`[web-ui-bridge] history loaded: undo ${undoStack.length} / redo ${redoStack.length}`);
  }
} catch { /* 壊れていたら無視 */ }

async function saveHistory() {
  try { await writeFile(HISTORY_FILE, JSON.stringify({ undo: undoStack, redo: redoStack }), "utf8"); } catch {}
}

async function recordedWrite(file, before, after, label) {
  await writeFile(file, after, "utf8");
  undoStack.push({ file, before, after, label });
  if (undoStack.length > HISTORY_MAX) undoStack.shift();
  redoStack.length = 0; // 新しい編集で redo 系列は無効化
  await saveHistory();
}

async function undo() {
  const e = undoStack.pop();
  if (!e) return { ok: false, reason: "nothing" };
  const cur = await readFile(e.file, "utf8");
  if (cur !== e.after) { undoStack.push(e); return { ok: false, reason: "file-changed", file: rel(e.file) }; }
  await writeFile(e.file, e.before, "utf8");
  redoStack.push(e);
  await saveHistory();
  return { ok: true, file: rel(e.file), label: e.label, canUndo: undoStack.length > 0, canRedo: true };
}

async function redo() {
  const e = redoStack.pop();
  if (!e) return { ok: false, reason: "nothing" };
  const cur = await readFile(e.file, "utf8");
  if (cur !== e.before) { redoStack.push(e); return { ok: false, reason: "file-changed", file: rel(e.file) }; }
  await writeFile(e.file, e.after, "utf8");
  undoStack.push(e);
  await saveHistory();
  return { ok: true, file: rel(e.file), label: e.label, canUndo: true, canRedo: redoStack.length > 0 };
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") return send(res, 204, {}, "");

  if (req.method === "GET" && req.url === "/health") {
    return send(res, 200, { "Content-Type": "application/json" },
      JSON.stringify({ ok: true, target: TARGET_ROOT, queueFile: QUEUE_FILE }));
  }

  if (req.method === "GET" && (req.url === "/overlay.js" || req.url?.startsWith("/overlay.js?"))) {
    try {
      const js = await readFile(OVERLAY_FILE, "utf8");
      // overlay に origin とトークンを埋め込む。
      const injected = js
        .replace("__BRIDGE_ORIGIN__", `http://localhost:${args.port}`)
        .replace("__BRIDGE_TOKEN__", TOKEN);
      // CORS を付けない（= クロスオリジン fetch で本文＝トークンを読めない。script タグ実行は CORS 不要）
      res.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8", "Cache-Control": "no-store" });
      return res.end(injected);
    } catch (err) {
      return send(res, 500, { "Content-Type": "text/plain" }, `overlay not found: ${err.message}`);
    }
  }

  if (req.method === "POST" && req.url === "/enqueue") {
    const auth = authorizeMutation(req);
    if (!auth.ok) return send(res, auth.status, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: auth.error }));
    try {
      const raw = await readBody(req);
      const payload = JSON.parse(raw);
      const items = Array.isArray(payload.items) ? payload.items : [payload];
      const enqueued = [];
      for (const item of items) {
        const entry = {
          id: randomUUID().slice(0, 8),
          ts: new Date().toISOString(),
          status: "pending",
          route: item.route ?? null,
          tag: item.tag ?? null,
          component: item.component ?? null,
          classes: item.classes ?? null,
          text: item.text ?? null,
          textSnippets: item.textSnippets ?? null,
          domPath: item.domPath ?? null,
          selector: item.selector ?? null,
          payloads: Array.isArray(item.payloads) ? item.payloads : null,
          prompt: item.prompt ?? "",
        };
        await appendFile(QUEUE_FILE, JSON.stringify(entry) + "\n", "utf8");
        enqueued.push(entry.id);
      }
      console.log(`[web-ui-bridge] enqueued ${enqueued.length} → ${QUEUE_FILE}`);
      return send(res, 200, { "Content-Type": "application/json" },
        JSON.stringify({ ok: true, ids: enqueued }));
    } catch (err) {
      return send(res, 400, { "Content-Type": "application/json" },
        JSON.stringify({ ok: false, error: err.message }));
    }
  }

  if (req.method === "POST" && req.url === "/apply-style") {
    const auth = authorizeMutation(req);
    if (!auth.ok) return send(res, auth.status, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: auth.error }));
    try {
      const body = JSON.parse(await readBody(req));
      const result = await applyStyle(body);
      if (result.ok) console.log(`[web-ui-bridge] apply-style → ${result.file ?? "(noop)"}`);
      else console.log(`[web-ui-bridge] apply-style skipped: ${result.reason}`);
      return send(res, 200, { "Content-Type": "application/json" }, JSON.stringify(result));
    } catch (err) {
      return send(res, 400, { "Content-Type": "application/json" },
        JSON.stringify({ ok: false, error: err.message }));
    }
  }

  if (req.method === "POST" && req.url === "/apply-style-batch") {
    const auth = authorizeMutation(req);
    if (!auth.ok) return send(res, auth.status, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: auth.error }));
    try {
      const { route, edits } = JSON.parse(await readBody(req));
      const valid = validateStyleBatchEdits(edits);
      if (!valid.ok) return send(res, 200, { "Content-Type": "application/json" }, JSON.stringify(valid));

      const result = await findAndApplyBatch(
        route,
        (src) => applyStyleBatch(src, edits),
        (r) => `スタイル一括(${r.applied})`,
        (r, file) => r.changed
          ? { ok: true, file: rel(file), applied: r.applied, skipped: r.skipped }
          : { ok: true, changed: false, applied: 0, skipped: r.skipped },
      );
      console.log(`[web-ui-bridge] apply-style-batch → ${result.ok ? (result.file ?? "(noop)") : "skip:" + result.reason}`);
      return send(res, 200, { "Content-Type": "application/json" }, JSON.stringify(result));
    } catch (err) {
      return send(res, 400, { "Content-Type": "application/json" },
        JSON.stringify({ ok: false, error: err.message }));
    }
  }

  if (req.method === "POST" && req.url === "/reorder") {
    const auth = authorizeMutation(req);
    if (!auth.ok) return send(res, auth.status, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: auth.error }));
    try {
      const { route, dragClass, targetClass, position } = JSON.parse(await readBody(req));
      const result = await findAndApply(route, (src) => moveInSource(src, dragClass, targetClass, position), "並べ替え");
      console.log(`[web-ui-bridge] reorder/move → ${result.ok ? (result.file ?? "(noop)") : "skip:" + result.reason}`);
      return send(res, 200, { "Content-Type": "application/json" }, JSON.stringify(result));
    } catch (err) {
      return send(res, 400, { "Content-Type": "application/json" },
        JSON.stringify({ ok: false, error: err.message }));
    }
  }

  if (req.method === "POST" && req.url === "/reorder-group") {
    const auth = authorizeMutation(req);
    if (!auth.ok) return send(res, auth.status, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: auth.error }));
    try {
      const { route, dragClasses, targetClass, position } = JSON.parse(await readBody(req));
      const result = await findAndApply(route, (src) => moveGroupInSource(src, dragClasses, targetClass, position), `グループ移動(${Array.isArray(dragClasses) ? dragClasses.length : 0})`);
      console.log(`[web-ui-bridge] reorder-group → ${result.ok ? (result.file ?? "(noop)") : "skip:" + result.reason}`);
      return send(res, 200, { "Content-Type": "application/json" }, JSON.stringify(result));
    } catch (err) {
      return send(res, 400, { "Content-Type": "application/json" },
        JSON.stringify({ ok: false, error: err.message }));
    }
  }

  if (req.method === "POST" && (req.url === "/delete" || req.url === "/duplicate")) {
    const auth = authorizeMutation(req);
    if (!auth.ok) return send(res, auth.status, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: auth.error }));
    try {
      const { route, targetClass } = JSON.parse(await readBody(req));
      const op = req.url === "/delete" ? deleteInSource : duplicateInSource;
      const label = req.url === "/delete" ? "削除" : "複製";
      const result = await findAndApply(route, (src) => op(src, targetClass), label);
      console.log(`[web-ui-bridge] ${req.url.slice(1)} → ${result.ok ? result.file : "skip:" + result.reason}`);
      return send(res, 200, { "Content-Type": "application/json" }, JSON.stringify(result));
    } catch (err) {
      return send(res, 400, { "Content-Type": "application/json" },
        JSON.stringify({ ok: false, error: err.message }));
    }
  }

  if (req.method === "POST" && req.url === "/structure-batch") {
    const auth = authorizeMutation(req);
    if (!auth.ok) return send(res, auth.status, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: auth.error }));
    try {
      const { route, kind, targets } = JSON.parse(await readBody(req));
      if (!Array.isArray(targets)) return send(res, 200, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, reason: "missing-class" }));
      const result = await findAndApplyBatch(
        route,
        (src) => structureBatch(src, kind, targets),
        (r) => `${kind === "duplicate" ? "複製" : "削除"}一括(${targets.length - r.skipped.length})`,
        (r, file) => r.changed
          ? { ok: true, file: rel(file), skipped: r.skipped }
          : { ok: true, changed: false, skipped: r.skipped },
      );
      console.log(`[web-ui-bridge] structure-batch/${kind} → ${result.ok ? (result.file ?? "(noop)") : "skip:" + result.reason}`);
      return send(res, 200, { "Content-Type": "application/json" }, JSON.stringify(result));
    } catch (err) {
      return send(res, 400, { "Content-Type": "application/json" },
        JSON.stringify({ ok: false, error: err.message }));
    }
  }

  if (req.method === "POST" && (req.url === "/undo" || req.url === "/redo")) {
    const auth = authorizeMutation(req);
    if (!auth.ok) return send(res, auth.status, { "Content-Type": "application/json" }, JSON.stringify({ ok: false, error: auth.error }));
    try {
      const result = req.url === "/undo" ? await undo() : await redo();
      console.log(`[web-ui-bridge] ${req.url.slice(1)} → ${result.ok ? result.label + " (" + result.file + ")" : "skip:" + result.reason}`);
      return send(res, 200, { "Content-Type": "application/json" }, JSON.stringify(result));
    } catch (err) {
      return send(res, 400, { "Content-Type": "application/json" },
        JSON.stringify({ ok: false, error: err.message }));
    }
  }

  if (req.method === "GET" && req.url === "/history") {
    return send(res, 200, { "Content-Type": "application/json" },
      JSON.stringify({ ok: true, canUndo: undoStack.length > 0, canRedo: redoStack.length > 0 }));
  }

  send(res, 404, { "Content-Type": "text/plain" }, "not found");
});

server.listen(args.port, "127.0.0.1", () => {
  console.log(`[web-ui-bridge] listening on http://127.0.0.1:${args.port} (localhost only)`);
  console.log(`[web-ui-bridge] target : ${TARGET_ROOT}`);
  console.log(`[web-ui-bridge] queue  : ${QUEUE_FILE}`);
  console.log(`[web-ui-bridge] overlay: ${OVERLAY_FILE}`);
  console.log(`[web-ui-bridge] inject in dev: <script src="http://localhost:${args.port}/overlay.js" async></script>`);
});
