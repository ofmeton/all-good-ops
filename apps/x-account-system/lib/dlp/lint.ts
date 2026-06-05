/**
 * DLP lint CLI: stdin / ファイルパスから text を受け取り、redaction findings を JSON で stdout に出す。
 *
 * 使い方:
 *   echo "田中様の請求書 ¥120,000 を送信、03-1234-5678 まで" | tsx lib/dlp/lint.ts
 *   tsx lib/dlp/lint.ts < some_memo.txt
 *
 * exit code:
 *   0 — high risk hit なし
 *   1 — high risk hit あり (CI で fail させる用)
 */
import { redactStrict } from "./redact.ts";

async function readStdin(): Promise<string> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Uint8Array);
  return Buffer.concat(chunks).toString("utf-8");
}

async function main() {
  const input = await readStdin();
  const result = redactStrict(input);
  const output = {
    needsConsent: result.needsConsent,
    highRiskHits: result.highRiskHits,
    findings: result.findings.map((f) => ({
      category: f.category,
      matched: f.matched,
      start: f.start,
      end: f.end,
      replacement: f.replacement,
      confidence: f.confidence,
    })),
    redactedPreview: result.redactedText.slice(0, 500),
  };
  console.log(JSON.stringify(output, null, 2));
  process.exit(result.needsConsent ? 1 : 0);
}

main().catch((err) => {
  console.error(JSON.stringify({ error: String(err) }));
  process.exit(2);
});
