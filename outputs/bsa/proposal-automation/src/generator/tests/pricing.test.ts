import { describe, it, expect } from 'vitest';
import { customizePricing, BASE_LINES } from '../src/pricing.js';

describe('customizePricing', () => {
  it('L1 base when budget matches: 30,000円 / 3日', () => {
    const result = customizePricing('L1', { budget_min: 30000, budget_max: 50000 });
    expect(result.price).toBeGreaterThanOrEqual(28000);
    expect(result.price).toBeLessThanOrEqual(50000);
    expect(result.delivery_days).toBe(3);
  });

  it('L1 with high budget: 値段を予算内に寄せる（max 80,000）', () => {
    const result = customizePricing('L1', { budget_min: 80000, budget_max: 150000 });
    expect(result.price).toBeGreaterThanOrEqual(50000);
    expect(result.price).toBeLessThanOrEqual(80000);
  });

  it('L1 with budget below min_price: clamped to min', () => {
    const result = customizePricing('L1', { budget_min: 5000, budget_max: 8000 });
    expect(result.price).toBeGreaterThanOrEqual(25000);
  });

  it('L2 base: 80,000円 / 7日', () => {
    const result = customizePricing('L2', { budget_min: 80000, budget_max: 150000 });
    expect(result.price).toBeGreaterThanOrEqual(75000);
    expect(result.delivery_days).toBe(7);
  });

  it('L3 base: 100,000円 / 4日', () => {
    const result = customizePricing('L3', { budget_min: 100000, budget_max: 200000 });
    expect(result.delivery_days).toBe(4);
  });

  it('L4 base: 20,000円 / 1日', () => {
    const result = customizePricing('L4', { budget_min: 10000, budget_max: 30000 });
    expect(result.delivery_days).toBe(1);
  });

  it('only budget_max given: uses 85% as target', () => {
    const result = customizePricing('L1', { budget_min: null, budget_max: 100000 });
    expect(result.price).toBeGreaterThanOrEqual(25000);
    expect(result.price).toBeLessThanOrEqual(85000);
  });

  it('budget unknown: defaults to base_price', () => {
    const result = customizePricing('L1', { budget_min: null, budget_max: null });
    expect(result.price).toBe(BASE_LINES.L1.base_price);
  });
});
