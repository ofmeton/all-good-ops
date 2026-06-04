import { redact } from "../dlp/redact.js"; // RedactionResult を返す（.redactedText を使う）

/** trace 保存前に文字列を再帰的に DLP redact する。raw PII を DB に残さない。 */
export function redactForTrace(value: unknown): unknown {
  if (typeof value === "string") return redact(value).redactedText; // findings は捨てる（生PII保護）
  if (Array.isArray(value)) return value.map(redactForTrace);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = redactForTrace(v);
    return out;
  }
  return value;
}
