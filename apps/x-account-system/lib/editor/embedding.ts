/**
 * Embedding helper (Phase 0.5 stub)
 *
 * PR-A の段階では実 embedding API を呼ばず、384 次元の zero vector を返す stub。
 * cosineSim は zero vector との比較で常に 0 を返すので、
 * R5 (重複検査 ≥ 0.85 → fail) は事実上 always pass になる。
 *
 * PR-B+ で OpenAI text-embedding-3-small / Voyage 等への切り替えを行う際は、
 * このファイルを差し替える (feature flag: EDITOR_EMBEDDING_PROVIDER)。
 */

const EMBED_DIM = 384;

/**
 * Phase 0.5 stub: text → 384-zero vector。
 * 将来的に provider 切り替えできるよう env 経由で expose。
 */
export async function embedText(_text: string): Promise<number[]> {
  // intentionally no-op for Phase 0.5
  return new Array(EMBED_DIM).fill(0);
}

/**
 * Cosine similarity。
 * いずれかが zero vector の場合は 0 を返す (R5 always pass の挙動)。
 */
export function cosineSim(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const len = Math.min(a.length, b.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * 直近投稿群のうち、与えた embedding と最大の cosine sim を計算。
 */
export function maxCosineSim(
  target: number[],
  others: Array<{ id: string; embedding?: number[] }>,
): { maxSim: number; matchedId: string | null } {
  let max = 0;
  let matchedId: string | null = null;
  for (const o of others) {
    if (!o.embedding || o.embedding.length === 0) continue;
    const sim = cosineSim(target, o.embedding);
    if (sim > max) {
      max = sim;
      matchedId = o.id;
    }
  }
  return { maxSim: max, matchedId };
}
