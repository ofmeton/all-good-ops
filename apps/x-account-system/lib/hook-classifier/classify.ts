/**
 * Hook classifier TS wrapper (Python subprocess)
 *
 * classify.py を `python3 classify.py --text=<value>` 形式で呼び出し、
 * stdout JSON を parse して返す。Editor pipeline Stage 0 で使用。
 *
 * 環境変数:
 *   IN_MEMORY_FALLBACK=true → Python を呼ばずに低 confidence の tips_enum を返す
 *   HOOK_CLASSIFIER_PYTHON   → 使用する Python binary (default: python3)
 *
 * cold start ~200ms 想定。E-46 (1 件処理 < 10 秒) の budget 内。
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type HookClassification = {
  primary_hook: "failure_story" | "business_repro" | "critique" | "tips_enum";
  devices: string[];
  confidence: number;
  raw_features?: Record<string, string>;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCRIPT_PATH = path.resolve(__dirname, "classify.py");

const FALLBACK: HookClassification = {
  primary_hook: "tips_enum",
  devices: [],
  confidence: 0.3,
};

export async function classifyHook(text: string): Promise<HookClassification> {
  if (process.env.IN_MEMORY_FALLBACK === "true") {
    // In fallback 時は失敗談キーワードがあれば failure_story を返し、
    // それ以外は tips_enum default を返す deterministic stub。
    if (/失敗|ハマった|詰まった|落とし穴|うまくいかな/.test(text)) {
      return {
        primary_hook: "failure_story",
        devices: ["first_hand_past"],
        confidence: 0.7,
      };
    }
    if (/Before|before|→|前 ?→ ?後/.test(text)) {
      return {
        primary_hook: "business_repro",
        devices: ["before_after", "number"],
        confidence: 0.6,
      };
    }
    if (/みんな.+実は|思われがちだが/.test(text)) {
      return {
        primary_hook: "critique",
        devices: ["contrarian"],
        confidence: 0.55,
      };
    }
    if (text.length < 30) {
      return { ...FALLBACK, confidence: 0.2 };
    }
    return { ...FALLBACK, confidence: 0.5 };
  }

  const py = process.env.HOOK_CLASSIFIER_PYTHON || "python3";

  return new Promise((resolve, reject) => {
    const child = spawn(py, [SCRIPT_PATH, "--text", text], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d.toString("utf-8")));
    child.stderr.on("data", (d) => (stderr += d.toString("utf-8")));
    child.on("error", (err) => reject(err));
    child.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `classify.py exited with ${code}: stderr=${stderr.slice(0, 500)}`,
          ),
        );
        return;
      }
      try {
        const parsed = JSON.parse(stdout) as HookClassification;
        resolve(parsed);
      } catch (e) {
        reject(
          new Error(
            `classify.py stdout JSON parse failed: ${(e as Error).message}\nstdout=${stdout.slice(0, 500)}`,
          ),
        );
      }
    });
  });
}
