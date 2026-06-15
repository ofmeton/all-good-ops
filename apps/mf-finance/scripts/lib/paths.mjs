// scripts/lib/paths.mjs — データ(DB / 中間 JSON)の正準ディレクトリを解決する単一の SSOT。
// 家計データは worktree を消しても失われないよう「main worktree(=メインリポ) の apps/mf-finance/data」に集約する。
// 解決順: MF_FINANCE_DATA_DIR(明示) > git 共通ディレクトリから辿る main repo > このファイル基準の app/data(フォールバック)。
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

let cached;

export function dataDir() {
  if (cached) return cached;
  const env = process.env.MF_FINANCE_DATA_DIR;
  if (env) return (cached = resolve(env));
  const fromGit = mainRepoDataDir();
  if (fromGit) return (cached = fromGit);
  // フォールバック: scripts/lib/paths.mjs → apps/mf-finance/data
  const appRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
  return (cached = join(appRoot, "data"));
}

// git の共通ディレクトリ(全 worktree 共有 = main repo の .git)から main worktree ルートを辿り、
// その apps/mf-finance/data を返す。どの worktree から実行しても同一の data を指す。
function mainRepoDataDir() {
  try {
    const common = execFileSync(
      "git",
      ["rev-parse", "--path-format=absolute", "--git-common-dir"],
      { encoding: "utf8" },
    ).trim();
    if (!common) return null;
    const mainRoot = dirname(common); // .../all-good-ops/.git → .../all-good-ops
    const appDir = join(mainRoot, "apps", "mf-finance");
    return existsSync(appDir) ? join(appDir, "data") : null;
  } catch {
    return null;
  }
}

export function dbPath() {
  return join(dataDir(), "mf-finance.db");
}

export function dataPath(...segments) {
  return join(dataDir(), ...segments);
}
