/**
 * scripts/ingest-bookmarks.ts — URL 貼付ブックマーク取込 endpoint のローカル helper。
 *
 * 使い方:
 *   WORKER_BASE_URL=https://... OAUTH_ADMIN_SECRET=... tsx scripts/ingest-bookmarks.ts urls.txt
 *   cat urls.txt | WORKER_BASE_URL=https://... OAUTH_ADMIN_SECRET=... tsx scripts/ingest-bookmarks.ts
 *
 * tweet URL は改行区切りを想定。secret は出力しない。
 */
import "dotenv/config";
import { readFile } from "node:fs/promises";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`[ingest-bookmarks] env ${name} is required`);
  return v;
}

async function readStdin(): Promise<string> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Uint8Array);
  return Buffer.concat(chunks).toString("utf8");
}

async function main(): Promise<void> {
  const baseUrl = requireEnv("WORKER_BASE_URL");
  const adminSecret = requireEnv("OAUTH_ADMIN_SECRET");
  const filePath = process.argv[2];
  const raw = filePath ? await readFile(filePath, "utf8") : await readStdin();
  const urls = raw.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);

  const endpoint = new URL("/admin/ingest-bookmarks", baseUrl);
  endpoint.searchParams.set("key", adminSecret);
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({ urls }),
  });

  const text = await res.text();
  console.log(`[ingest-bookmarks] status=${res.status}`);
  console.log(text);
}

if (process.argv[1] && process.argv[1].endsWith("ingest-bookmarks.ts")) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  });
}
