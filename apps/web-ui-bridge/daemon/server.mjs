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

import http from "node:http";
import { appendFile, readFile, writeFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

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
const QUEUE_FILE = path.join(args.target, ".claude-ui-queue.jsonl");
const OVERLAY_FILE = args.overlay ?? path.join(__dirname, "..", "overlay", "overlay.js");

if (!existsSync(args.target)) {
  console.error(`[web-ui-bridge] target dir does not exist: ${args.target}`);
  process.exit(1);
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function send(res, status, headers, body) {
  res.writeHead(status, { ...CORS, ...headers });
  res.end(body);
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

function routeToFile(route) {
  const clean = (route || "/").split("?")[0].replace(/\/+$/, "");
  const rel = clean === "" ? "app/page.tsx" : `app${clean}/page.tsx`;
  const full = path.join(args.target, rel);
  return existsSync(full) ? full : null;
}

// oldClassName(= className 属性の literal)を一意に特定して newClassName へ置換。
// className は静的文字列のときソースと完全一致する。一致しない（テンプレ/条件式）時は not-found→Claude にフォールバック。
async function applyStyle({ route, oldClassName, newClassName }) {
  if (!oldClassName || !newClassName) return { ok: false, reason: "missing-classname" };
  if (oldClassName === newClassName) return { ok: true, file: null, noop: true };

  // 探索順: route のページファイル → app/ 配下全 tsx
  const candidates = [];
  const routeFile = routeToFile(route);
  if (routeFile) candidates.push(routeFile);
  const all = await walkTsx(path.join(args.target, "app"));
  for (const f of all) if (!candidates.includes(f)) candidates.push(f);

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

  // 最初の 1 箇所だけ literal 置換して書き戻し
  const at = target.src.indexOf(oldClassName);
  const next = target.src.slice(0, at) + newClassName + target.src.slice(at + oldClassName.length);
  await writeFile(target.file, next, "utf8");
  return { ok: true, file: path.relative(args.target, target.file) };
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") return send(res, 204, {}, "");

  if (req.method === "GET" && req.url === "/health") {
    return send(res, 200, { "Content-Type": "application/json" },
      JSON.stringify({ ok: true, target: args.target, queueFile: QUEUE_FILE }));
  }

  if (req.method === "GET" && (req.url === "/overlay.js" || req.url?.startsWith("/overlay.js?"))) {
    try {
      const js = await readFile(OVERLAY_FILE, "utf8");
      // overlay にデーモンの origin を埋め込む（自分自身の port を知らせる）
      const injected = js.replace("__BRIDGE_ORIGIN__", `http://localhost:${args.port}`);
      return send(res, 200, { "Content-Type": "text/javascript; charset=utf-8", "Cache-Control": "no-store" }, injected);
    } catch (err) {
      return send(res, 500, { "Content-Type": "text/plain" }, `overlay not found: ${err.message}`);
    }
  }

  if (req.method === "POST" && req.url === "/enqueue") {
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

  send(res, 404, { "Content-Type": "text/plain" }, "not found");
});

server.listen(args.port, () => {
  console.log(`[web-ui-bridge] listening on http://localhost:${args.port}`);
  console.log(`[web-ui-bridge] target : ${args.target}`);
  console.log(`[web-ui-bridge] queue  : ${QUEUE_FILE}`);
  console.log(`[web-ui-bridge] overlay: ${OVERLAY_FILE}`);
  console.log(`[web-ui-bridge] inject in dev: <script src="http://localhost:${args.port}/overlay.js" async></script>`);
});
