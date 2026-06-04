import { STAGES } from "./stages/index-stages.js";
export { STAGES };
export type { StageMeta } from "./types.js";

/** upstream/downstream 対称性を検証。エラー文字列の配列を返す（空＝正常）。 */
export function validateRegistry(): string[] {
  const byId = new Map(STAGES.map((s) => [s.id, s]));
  const errors: string[] = [];
  for (const s of STAGES) {
    for (const d of s.downstream) {
      const t = byId.get(d);
      if (!t) { errors.push(`${s.id}.downstream 未知: ${d}`); continue; }
      if (!t.upstream.includes(s.id)) errors.push(`${d}.upstream に ${s.id} が無い`);
    }
    for (const u of s.upstream) {
      const t = byId.get(u);
      if (!t) { errors.push(`${s.id}.upstream 未知: ${u}`); continue; }
      if (!t.downstream.includes(s.id)) errors.push(`${u}.downstream に ${s.id} が無い`);
    }
  }
  return errors;
}
