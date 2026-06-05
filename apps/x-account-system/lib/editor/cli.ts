/**
 * Editor CLI: stdin (JSON EditorInput) → stdout (JSON EditorOutput)
 *
 * 使い方:
 *   IN_MEMORY_FALLBACK=true npx tsx lib/editor/cli.ts < input.json
 *
 * exit code:
 *   0 — approved
 *   1 — rejected
 *   2 — internal error (JSON parse / pipeline 例外)
 */
import { runEditor } from "./pipeline.ts";
import type { EditorInput } from "./types.ts";

async function readStdin(): Promise<string> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Uint8Array);
  return Buffer.concat(chunks).toString("utf-8");
}

async function main() {
  let input: EditorInput;
  try {
    const raw = await readStdin();
    input = JSON.parse(raw) as EditorInput;
  } catch (e) {
    console.error(JSON.stringify({ error: `stdin JSON parse failed: ${String(e)}` }));
    process.exit(2);
    return;
  }

  try {
    const output = await runEditor(input);
    console.log(JSON.stringify(output, null, 2));
    process.exit(output.decision === "approved" ? 0 : 1);
  } catch (e) {
    console.error(JSON.stringify({ error: `runEditor failed: ${String(e)}` }));
    process.exit(2);
  }
}

main().catch((err) => {
  console.error(JSON.stringify({ error: String(err) }));
  process.exit(2);
});
