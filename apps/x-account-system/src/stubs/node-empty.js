// Empty stub for Node built-ins that must never reach the Workers bundle.
//
// 理由: @anthropic-ai/sdk(0.101) の self-hosted agent-toolset
// (`tools/agent-toolset/{node,skills,fs-util}` → `node:fs`/`node:fs/promises`/
// `node:child_process`) が import graph に静的に含まれるが、本 worker は
// **cloud Managed Agents + SSE のみ**を使い、当該コードは実行されない
// (task1 実証: wrangler dev で MA session 全工程が node:* を呼ばず完走)。
// workerd は node:child_process を実装しないため、空 stub に alias して
// bundle から除外する。本番 worker 自前コードは node:fs/child_process を
// 一切使わない (使用は *.test.ts のみ = bundle 対象外) ため安全。
// wrangler.toml [alias] で node:child_process / node:fs / node:fs/promises を
// このファイルに向ける。
//
// 設計:
//  - `default` / `__esModule` は benign data prop にする (tslib __importStar が
//    load 時に走査するため。throw すると import だけで壊れる)。
//  - 一方、誤って *実行* されたら silent に degrade しない (例: `fs.existsSync`
//    が undefined で guard が falsy → 分岐 skip) よう、よく使う危険メンバは
//    自己説明的に throw する getter にする。
const empty = {};
Object.defineProperty(empty, "__esModule", { value: true, enumerable: false });
Object.defineProperty(empty, "default", { value: empty, enumerable: false });

const FORBIDDEN = [
  "readFileSync", "writeFileSync", "existsSync", "readFile", "writeFile",
  "promises", "createReadStream", "createWriteStream", "mkdirSync", "mkdtempSync",
  "rmSync", "rm", "readdir", "readdirSync", "stat", "statSync", "open",
  "spawn", "spawnSync", "exec", "execSync", "execFile", "execFileSync", "fork",
];
for (const name of FORBIDDEN) {
  Object.defineProperty(empty, name, {
    enumerable: false,
    get() {
      // 注: ここに forbidden な builtin 名を literal で書くと bundle-check に
      // 引っかかるため、プレフィックス無しで記述する。
      throw new Error(
        `node-empty stub: '${name}' (Node fs / child_process built-in) is not available in ` +
          `Cloudflare Workers. This code path must not execute under cloud Managed Agents.`,
      );
    },
  });
}

module.exports = empty;
