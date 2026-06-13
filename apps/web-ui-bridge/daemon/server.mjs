#!/usr/bin/env node
// web-ui-bridge daemon — クリック→Claude Code プロンプト橋渡しのローカル中継。
//
// 役割:
//   - overlay からの POST /enqueue を受け、対象サイト直下の .claude-ui-queue.jsonl に1行追記
//   - GET /overlay.js で overlay スクリプトを配信（対象サイトは <script src> 1行で読むだけ）
//   - GET /health で疎通確認
//
// 起動: web-ui-bridge --target <site-dir> [--port 7331]
// 本番ビルドには一切関与しない（dev 専用のローカルツール）。

import http from "node:http";
import { appendFile, readFile } from "node:fs/promises";
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

  send(res, 404, { "Content-Type": "text/plain" }, "not found");
});

server.listen(args.port, () => {
  console.log(`[web-ui-bridge] listening on http://localhost:${args.port}`);
  console.log(`[web-ui-bridge] target : ${args.target}`);
  console.log(`[web-ui-bridge] queue  : ${QUEUE_FILE}`);
  console.log(`[web-ui-bridge] overlay: ${OVERLAY_FILE}`);
  console.log(`[web-ui-bridge] inject in dev: <script src="http://localhost:${args.port}/overlay.js" async></script>`);
});
