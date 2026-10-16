// Money Forward ME をログイン済みの自動操作用 Chrome（CDP）で読む・更新する。
// 書き込みは「一括更新」ボタンだけ。ログイン切れは検知して止めるだけで、再ログインはしない。
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const CDP = process.env.MF_CDP_URL ?? "http://127.0.0.1:9223";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// eval は CDP の Runtime.evaluate。このファイルに書いた固定の式だけを渡す（外部入力は渡さない）。
type Tab = { eval<T = unknown>(expr: string): Promise<T>; go(url: string, waitMs?: number): Promise<void> };

export async function withTab<T>(fn: (tab: Tab) => Promise<T>): Promise<T> {
  const res = await fetch(`${CDP}/json/new?about:blank`, { method: "PUT" });
  if (!res.ok) throw new Error(`CDP に接続できない (${res.status})。mini の自動操作用 Chrome が起動しているか確認`);
  const target = (await res.json()) as { id: string; webSocketDebuggerUrl: string };
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  const pending = new Map<number, (m: any) => void>();
  let id = 0;
  ws.onmessage = (e) => {
    const m = JSON.parse(String(e.data));
    if (m.id && pending.has(m.id)) {
      pending.get(m.id)!(m);
      pending.delete(m.id);
    }
  };
  await new Promise((r, j) => {
    ws.onopen = r;
    ws.onerror = j;
  });
  const send = (method: string, params = {}) =>
    new Promise<any>((r) => {
      const i = ++id;
      pending.set(i, r);
      ws.send(JSON.stringify({ id: i, method, params }));
    });
  const tab: Tab = {
    async go(url, waitMs = 5000) {
      await send("Page.navigate", { url });
      await sleep(waitMs);
    },
    async eval(expr) {
      const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
      if (r.result?.exceptionDetails) throw new Error(`ページ内の処理に失敗: ${r.result.exceptionDetails.text}`);
      return r.result?.result?.value;
    },
  };
  try {
    return await fn(tab);
  } finally {
    ws.close();
    await fetch(`${CDP}/json/close/${target.id}`).catch(() => {});
  }
}

const yenOf = (s: string) => Number(String(s).replace(/[^\d-]/g, "")) || 0;

export async function assertLoggedIn(tab: Tab) {
  await tab.go("https://moneyforward.com/cf");
  const href = await tab.eval<string>("location.href");
  if (!href.startsWith("https://moneyforward.com/cf")) {
    throw new Error("Money Forward のログインが切れている（mini の自動操作用 Chrome で再ログインが必要）");
  }
}

// 「金融機関からのデータ一括更新」を押し、取得が終わるのを待つ（終わりの合図が無いので一定時間待つ）。
export async function bulkUpdate(tab: Tab, waitMs = 180_000) {
  await tab.go("https://moneyforward.com/accounts");
  const clicked = await tab.eval<boolean>(
    `(()=>{const a=document.querySelector('a[href="/faggregation_queue2"]');if(!a)return false;a.click();return true})()`,
  );
  if (!clicked) throw new Error("一括更新ボタンが見つからない（MF の画面が変わった可能性）");
  await sleep(waitMs);
}

export type PortfolioRow = { name: string; balance: number; institution: string };

export async function readPortfolio(tab: Tab): Promise<{ depositTotal: number; rows: PortfolioRow[] }> {
  await tab.go("https://moneyforward.com/bs/portfolio");
  return tab.eval(`(()=>{
    const tables=[...document.querySelectorAll("table")];
    const cells=(tr)=>[...tr.querySelectorAll("th,td")].map(c=>c.innerText.trim());
    const sum=tables.flatMap(t=>[...t.rows].map(cells)).find(r=>r[0]==="預金・現金");
    const t=tables.find(t=>cells(t.rows[0]||document.createElement("tr"))[0]==="種類・名称");
    const rows=t?[...t.rows].slice(1).map(cells).map(r=>({name:r[0],balance:r[1],institution:r[2]})):[];
    return {depositTotal:sum?sum[1]:null,rows};
  })()`).then((r: any) => ({
    depositTotal: r.depositTotal == null ? NaN : yenOf(r.depositTotal),
    rows: r.rows.map((x: any) => ({ name: x.name, balance: yenOf(x.balance), institution: x.institution })),
  }));
}

export async function readLiabilities(tab: Tab): Promise<{ kind: string; name: string; balance: number; institution: string }[]> {
  await tab.go("https://moneyforward.com/bs/liability");
  const rows = await tab.eval<string[][]>(`(()=>{
    const t=[...document.querySelectorAll("table")].find(t=>t.rows[0]&&t.rows[0].innerText.includes("名称・説明"));
    return t?[...t.rows].slice(1).map(tr=>[...tr.querySelectorAll("th,td")].map(c=>c.innerText.trim())):[];
  })()`);
  return rows.map((r) => ({ kind: r[0], name: r[1], balance: yenOf(r[2]), institution: r[3] }));
}

// 連携口座ごとの最終取得日時と更新状態。
export async function readAccountStatus(tab: Tab): Promise<{ name: string; lastFetched: string | null; status: string }[]> {
  await tab.go("https://moneyforward.com/accounts");
  return tab.eval(`(()=>{
    const t=[...document.querySelectorAll("table")].find(t=>t.rows[0]&&t.rows[0].innerText.includes("更新状態"));
    if(!t)return [];
    return [...t.rows].slice(1).map(tr=>{
      const c=[...tr.querySelectorAll("td")].map(x=>x.innerText.trim());
      const all=tr.innerText;
      const m=all.match(/\\((\\d{2}\\/\\d{2} \\d{2}:\\d{2})\\)/);
      const status=["正常","エラー","更新中","取得中","要確認"].find(s=>all.includes(s))||"不明";
      return {name:(c[0]||"").split("\\n")[0].trim(),lastFetched:m?m[1]:null,status};
    });
  })()`);
}

export async function selectAllAssetRange(tab: Tab) {
  await tab.go("https://moneyforward.com/bs/history");
  await tab.eval(
    `(async()=>{const a=[...document.querySelectorAll('a.range-radio')].find(e=>e.getAttribute('href')==='/update_chart/all');if(a)a.click();await new Promise(r=>setTimeout(r,3000));return !!a})()`,
  );
}

// 既存の helper（scripts/download-mf-csv.mjs）で CSV を落とし、Downloads 上の実パスを返す。
export function downloadCsv(appDir: string, url: string): string {
  const r = spawnSync(process.execPath, [join(appDir, "scripts/download-mf-csv.mjs"), url], { encoding: "utf8", timeout: 180_000 });
  if (r.status !== 0) throw new Error(`CSV の取得に失敗 (${url}): ${(r.stderr || r.stdout).trim().slice(-300)}`);
  const line = r.stdout.trim().split("\n").filter(Boolean).pop() ?? "";
  const path = JSON.parse(line).path;
  if (!path) throw new Error(`CSV のパスが返らない (${url})`);
  return path;
}
