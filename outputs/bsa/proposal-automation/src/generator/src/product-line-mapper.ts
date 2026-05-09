import type { ProductLine } from '../../shared/types/index.js';

interface JobInput {
  service_category: string | null;
  title: string;
  description: string | null;
  budget_min: number | null;
  budget_max: number | null;
}

/**
 * 案件のカテゴリ + キーワード + 予算から推奨商品ラインを推定。
 * 推定結果は UI で人間が変更可能（あくまで初期推奨値）。
 *
 * service_category の値:
 * - lp / website / ad: 既存3カテゴリ
 * - modification: 修正・カスタム（L4 Express 直撃）
 * - responsive: レスポンシブ制作（L1/L2 系の取りこぼし防止）
 * - smartphonesite: スマホサイト（L2 隣接）
 */
export function estimateProductLine(job: JobInput): ProductLine {
  const text = `${job.title}\n${job.description ?? ''}`.toLowerCase();
  const upperBudget = job.budget_max ?? job.budget_min ?? 0;

  // L4: 修正・カスタム カテゴリは L4 を強く推奨。
  // 予算が L2 級（5万以上）なら L2 改修扱い。
  if (job.service_category === 'modification') {
    if (upperBudget === 0 || upperBudget < 50000) return 'L4';
    return 'L2';
  }

  // L4: 修正・改修キーワード（カテゴリ非依存）+ 低予算
  if (
    text.includes('修正') ||
    text.includes('改修') ||
    text.includes('リニューアル') ||
    text.includes('既存')
  ) {
    if (upperBudget > 0 && upperBudget < 50000) return 'L4';
  }

  // L3: LP + 広告運用 / Google広告
  if (
    job.service_category === 'ad' ||
    (text.includes('lp') && (text.includes('広告') || text.includes('運用'))) ||
    text.includes('広告運用')
  ) {
    return 'L3';
  }

  // L2: コーポレート / ホームページ / 5ページ以上 / レスポンシブ / スマホサイト
  if (
    job.service_category === 'website' ||
    job.service_category === 'responsive' ||
    job.service_category === 'smartphonesite' ||
    text.includes('コーポレート') ||
    text.includes('ホームページ') ||
    text.includes('5ページ') ||
    text.includes('複数ページ')
  ) {
    return 'L2';
  }

  // L1: LP単発（デフォルト）
  return 'L1';
}
