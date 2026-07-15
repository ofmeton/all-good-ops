import "server-only";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

const STEPS = [
  "normalize.mjs",
  "load.mjs",
  "apply-rules.mjs",
  "apply-overrides.mjs",
  "load-assets.mjs",
  "load-balances.mjs",
] as const;

export async function refreshData(cwd = process.cwd()): Promise<string> {
  const logs: string[] = [];
  for (const script of STEPS) {
    const { stdout, stderr } = await run("node", [`scripts/${script}`], {
      cwd,
      maxBuffer: 4 * 1024 * 1024,
    });
    if (stdout.trim()) logs.push(stdout.trim());
    if (stderr.trim()) logs.push(stderr.trim());
  }
  return logs.join("\n");
}
