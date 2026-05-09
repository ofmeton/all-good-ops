import { describe, it, expect } from 'vitest';
import { estimateProductLine } from '../src/product-line-mapper.js';

describe('estimateProductLine', () => {
  it('LP単発で予算 1-5万 → L1', () => {
    expect(estimateProductLine({
      service_category: 'lp', title: '整体院LP', description: 'LP1ページ作成',
      budget_min: 30000, budget_max: 50000,
    })).toBe('L1');
  });

  it('コーポ 5P 以上 + 5-15万 → L2', () => {
    expect(estimateProductLine({
      service_category: 'website', title: 'コーポレートサイト', description: '5ページのHP',
      budget_min: 80000, budget_max: 120000,
    })).toBe('L2');
  });

  it('LP + 広告運用 → L3', () => {
    expect(estimateProductLine({
      service_category: 'ad', title: 'LP制作 + Google広告運用', description: '...',
      budget_min: 80000, budget_max: 150000,
    })).toBe('L3');
  });

  it('修正・改修（低予算）→ L4', () => {
    expect(estimateProductLine({
      service_category: 'lp', title: 'LPの一部修正', description: 'CTAを修正したい',
      budget_min: 10000, budget_max: 20000,
    })).toBe('L4');
  });

  it('修正キーワードあるが予算高い → L1 (低予算修正のみ L4)', () => {
    expect(estimateProductLine({
      service_category: 'lp', title: 'LPの修正と新規追加', description: '',
      budget_min: 100000, budget_max: 150000,
    })).toBe('L1');  // 予算が L4 の閾値（5万円）超なので L4 でない → デフォルト L1
  });

  it('カテゴリ不明 + LPキーワード → L1', () => {
    expect(estimateProductLine({
      service_category: null, title: 'ランディングページ制作', description: '',
      budget_min: 50000, budget_max: 80000,
    })).toBe('L1');
  });

  // 新カテゴリ（B 標準セット）
  it('modification カテゴリ + 低予算 → L4', () => {
    expect(estimateProductLine({
      service_category: 'modification', title: 'LP の CTA 修正', description: 'ボタン色変更',
      budget_min: 10000, budget_max: 30000,
    })).toBe('L4');
  });

  it('modification カテゴリ + 5万以上 → L2 改修扱い', () => {
    expect(estimateProductLine({
      service_category: 'modification', title: 'コーポレートサイト全面改修', description: '5P',
      budget_min: 80000, budget_max: 150000,
    })).toBe('L2');
  });

  it('responsive カテゴリ → L2', () => {
    expect(estimateProductLine({
      service_category: 'responsive', title: 'レスポンシブ HP 制作', description: '5P',
      budget_min: 80000, budget_max: 120000,
    })).toBe('L2');
  });

  it('smartphonesite カテゴリ → L2', () => {
    expect(estimateProductLine({
      service_category: 'smartphonesite', title: 'スマホサイト制作', description: '',
      budget_min: 80000, budget_max: 100000,
    })).toBe('L2');
  });
});
