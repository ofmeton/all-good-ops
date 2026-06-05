/**
 * Mock for lib/editor/embedding.ts
 *
 * default は zero vector + cosineSim=0 (R5 always pass)。
 * __setMockSim(0.9) と __setMockMatchedId('d-001') で R5 fail を再現可能。
 */
let _mockMaxSim = 0;
let _mockMatchedId: string | null = null;

export function __resetMockEmbedding() {
  _mockMaxSim = 0;
  _mockMatchedId = null;
}

export function __setMockSim(sim: number, matchedId: string | null = null) {
  _mockMaxSim = sim;
  _mockMatchedId = matchedId;
}

export async function embedText(_text: string): Promise<number[]> {
  return new Array(384).fill(0);
}

export function cosineSim(_a: number[], _b: number[]): number {
  return 0;
}

export function maxCosineSim(
  _target: number[],
  _others: Array<{ id: string; embedding?: number[] }>,
): { maxSim: number; matchedId: string | null } {
  return { maxSim: _mockMaxSim, matchedId: _mockMatchedId };
}
