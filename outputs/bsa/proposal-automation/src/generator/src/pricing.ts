import type { ProductLine } from '../../shared/types/index.js';

export interface ProductLineDef {
  line: ProductLine;
  base_price: number;
  base_delivery_days: number;
  min_price: number;
  max_price: number;
  description: string;
}

/**
 * pricing-catalog.md の SSOT に基づく商品ライン基準値。
 * 案件規模に応じて min/max 範囲内でカスタマイズする。
 */
export const BASE_LINES: Record<ProductLine, ProductLineDef> = {
  L1: { line: 'L1', base_price: 30_000,  base_delivery_days: 3, min_price: 25_000,  max_price: 80_000,  description: 'Rapid Single LP' },
  L2: { line: 'L2', base_price: 80_000,  base_delivery_days: 7, min_price: 70_000,  max_price: 150_000, description: 'Rapid Corporate 5P' },
  L3: { line: 'L3', base_price: 100_000, base_delivery_days: 4, min_price: 90_000,  max_price: 200_000, description: 'Rapid LP + 広告運用初月' },
  L4: { line: 'L4', base_price: 20_000,  base_delivery_days: 1, min_price: 10_000,  max_price: 40_000,  description: 'Express 修正・改修' },
};

export function customizePricing(
  line: ProductLine,
  job: { budget_min: number | null; budget_max: number | null }
): { price: number; delivery_days: number } {
  const def = BASE_LINES[line];
  let price = def.base_price;

  if (job.budget_max != null && job.budget_min != null) {
    // 予算範囲のミドル付近を狙うが、line の範囲内に収める
    const target = Math.floor((job.budget_min + job.budget_max) / 2);
    price = Math.min(def.max_price, Math.max(def.min_price, target));
  } else if (job.budget_max != null) {
    price = Math.min(def.max_price, Math.max(def.min_price, Math.floor(job.budget_max * 0.85)));
  } else if (job.budget_min != null) {
    price = Math.min(def.max_price, Math.max(def.min_price, job.budget_min));
  }

  return { price, delivery_days: def.base_delivery_days };
}
