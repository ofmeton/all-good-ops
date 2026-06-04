import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { STAGES, validateRegistry } from "../lib/registry/index.js";

export function buildRegistryJson() {
  const errors = validateRegistry();
  if (errors.length) throw new Error("registry 不整合: " + errors.join("; "));
  return { version: 1 as const, stages: STAGES };
}

// CLI 実行時のみ書き出し（import 時は副作用なし）
if (process.argv[1] && process.argv[1].endsWith("build-registry.ts")) {
  const out = join(process.cwd(), "lib/registry/registry.generated.json");
  writeFileSync(out, JSON.stringify(buildRegistryJson(), null, 2));
  console.log("wrote", out);
}
