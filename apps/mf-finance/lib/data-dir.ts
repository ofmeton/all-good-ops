// lib/data-dir.ts — データ正準ディレクトリ解決。scripts/lib/paths.mjs と同一規約。
// 純粋なパス解決のみ（DB アクセスなし）で server/Node テスト双方から import 可能（server-only を付けない）。
// 実 DB を開く db.ts / grouping.ts 側が server 境界を持つ。
// 家計データは「main worktree(=メインリポ) の apps/mf-finance/data」に集約し、worktree 削除でも失わない。
// 解決順: MF_FINANCE_DATA_DIR(明示) > git 共通ディレクトリから辿る main repo > process.cwd()/data(フォールバック)。
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

let cached: string | undefined;

export function dataDir(): string {
  if (cached) return cached;
  const env = process.env.MF_FINANCE_DATA_DIR;
  if (env) return (cached = resolve(env));
  const fromGit = mainRepoDataDir();
  if (fromGit) return (cached = fromGit);
  return (cached = join(process.cwd(), "data"));
}

function mainRepoDataDir(): string | null {
  try {
    const common = execFileSync(
      "git",
      ["rev-parse", "--path-format=absolute", "--git-common-dir"],
      { encoding: "utf8" },
    ).trim();
    if (!common) return null;
    const mainRoot = dirname(common);
    const appDir = join(mainRoot, "apps", "mf-finance");
    return existsSync(appDir) ? join(appDir, "data") : null;
  } catch {
    return null;
  }
}

export function dbPath(): string {
  return join(dataDir(), "mf-finance.db");
}
