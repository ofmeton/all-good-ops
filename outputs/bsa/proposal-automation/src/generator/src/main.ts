import { openDb, getJobsAboveFitScore, upsertProposal, getPendingGenerationRequests, markGenerationRequest } from './db.js';
import type { JobRow } from './db.js';
import { researchJob, ExaQuotaExceededError } from './researcher.js';
import { buildProposalPrompt } from './prompt-builder.js';
import { estimateProductLine } from './product-line-mapper.js';
import { customizePricing } from './pricing.js';
import { callClaudeHeadless, ClaudeHeadlessError } from './claude-headless.js';

interface MilestoneOut {
  title: string;
  schedule_date: string;
  amount_exclude_tax: number;
  description: string;
}

interface ProposalOptionOut {
  title: string;
  description: string;
  contract_amount_exclude_tax: number;
}

interface GenerationOutput {
  description_md: string;
  estimate_md: string;
  milestones: MilestoneOut[];
  options: ProposalOptionOut[];
  product_line: 'L1' | 'L2' | 'L3' | 'L4';
  price_include_tax: number;
  price_exclude_tax: number;
  delivery_days: number;
  research_notes?: string;
  decline_recommended?: boolean;
  decline_reason?: string;
}

async function generateForJob(
  db: ReturnType<typeof openDb>,
  job: JobRow
): Promise<void> {
  console.log(`📝 [${job.job_id}] ${job.title.slice(0, 60)}`);

  // 1. リサーチ
  const researchNotes = await researchJob(db, {
    title: job.title,
    description: job.description,
    client_name: job.client_name,
  });

  // 2. 商品ライン推定
  const estimated = estimateProductLine({
    service_category: job.service_category,
    title: job.title,
    description: job.description,
    budget_min: job.budget_min,
    budget_max: job.budget_max,
  });

  // 3. 金額・納期カスタマイズ（推奨初期値）
  const { price: suggestedPrice, delivery_days: suggestedDays } = customizePricing(estimated, {
    budget_min: job.budget_min,
    budget_max: job.budget_max,
  });

  // 4. プロンプト組み立て
  const basePrompt = buildProposalPrompt(
    {
      job_id: job.job_id,
      title: job.title,
      description: job.description,
      budget_min: job.budget_min,
      budget_max: job.budget_max,
      deadline: job.deadline,
      client_name: job.client_name,
      service_category: job.service_category,
    },
    estimated,
    researchNotes,
    job.platform_prefix
  );

  const prompt = `${basePrompt}\n\n推奨初期値: 商品ライン=${estimated} / 金額=${suggestedPrice}円 / 納期=${suggestedDays}日`;

  // 5. Claude 呼び出し
  // 注: --json-schema は Claude を厳しい thinking モードに入れて最終応答を空にする
  // 事象が確認されたため、schema 強制を外してプロンプトだけで JSON を求める。
  // claude-headless が応答中の {...} 部分を抽出してくれる。
  const result = await callClaudeHeadless<Partial<GenerationOutput>>({
    prompt,
    allowedTools: ['WebFetch'],
    // テンプレが詳細なため拡張思考（medium）は不要。low にすることで生成時間を 60s 以内に抑える
    effort: 'low',
    fallbackModel: 'sonnet',
    timeoutMs: 360_000,
  });

  // 6. レスポンスの形を確認 + fallback 適用
  // Claude が JSON Schema を完全には強制しないことがあるので、
  // 不足項目は推奨初期値（estimated / suggestedPrice / suggestedDays）で埋める。
  if (!result || typeof result !== 'object') {
    // result の中身を full で出して原因特定できるようにする
    const r = result as unknown;
    const preview = typeof r === 'string'
      ? `string(len=${(r as string).length}): ${(r as string).slice(0, 300)}`
      : JSON.stringify(r).slice(0, 300);
    console.error(`  ⚠️ [${job.job_id}] Claude が想定外の形式を返した: ${preview}`);
    return;
  }

  // 辞退推奨ハンドリング (スタック適合外/価格レンジ違反/捏造実績なしで提案不可な場合)
  if (result.decline_recommended === true) {
    const reason = (result.decline_reason ?? '理由未記載').toString().trim();
    console.warn(`  ⚠️ [${job.job_id}] 辞退推奨: ${reason}`);
    db.prepare(
      `UPDATE jobs SET status = 'declined', updated_at = datetime('now') WHERE job_id = ?`
    ).run(job.job_id);
    db.prepare(
      `INSERT INTO status_history (job_id, from_status, to_status, changed_by, note)
       VALUES (?, ?, 'declined', 'auto', ?)`
    ).run(job.job_id, job.status, `decline_recommended: ${reason}`);
    return;
  }

  const description_md = (result.description_md ?? '').toString().trim();
  if (!description_md) {
    console.error(
      `  ⚠️ [${job.job_id}] Claude が description_md を返さなかった。skip。response keys:`,
      Object.keys(result)
    );
    return;
  }
  const estimate_md = (result.estimate_md ?? '').toString().trim();
  const milestones = Array.isArray(result.milestones) ? result.milestones : [];
  const options = Array.isArray(result.options) ? result.options : [];

  const finalLine = (result.product_line ?? estimated) as 'L1' | 'L2' | 'L3' | 'L4';
  const finalPriceIncTax =
    typeof result.price_include_tax === 'number' ? result.price_include_tax : suggestedPrice;
  // 税抜き換算は ceil（端数切り上げ）。floor だと税込再計算で 1円欠ける（"149,999円" 問題回避）
  const finalPriceExTax =
    typeof result.price_exclude_tax === 'number'
      ? result.price_exclude_tax
      : Math.ceil(finalPriceIncTax / 1.1);
  const finalDays =
    typeof result.delivery_days === 'number' ? result.delivery_days : suggestedDays;

  // 互換用 body_md は description_md と同期
  const body_md = description_md;

  // 7. SQLite に保存
  upsertProposal(db, {
    job_id: job.job_id,
    product_line: finalLine,
    price: finalPriceIncTax,
    price_exclude_tax: finalPriceExTax,
    delivery_days: finalDays,
    body_md,
    description_md,
    estimate_md: estimate_md || null,
    milestones_json: milestones.length ? JSON.stringify(milestones) : null,
    options_json: options.length ? JSON.stringify(options) : null,
    research_notes: result.research_notes ?? researchNotes,
    generated_by: 'claude-code-cli',
  });

  console.log(
    `  ✅ ${finalLine} / 税抜${finalPriceExTax.toLocaleString()}円 (税込${finalPriceIncTax.toLocaleString()}円) / ${finalDays}日 / ms=${milestones.length} opt=${options.length}`
  );
}

async function main(): Promise<number> {
  const db = openDb();
  let generatedCount = 0;
  let errorMessage: string | null = null;

  const FIT_SCORE_THRESHOLD = 80;

  try {
    const topJobs = getJobsAboveFitScore(db, FIT_SCORE_THRESHOLD);
    console.log(`📊 fit_score >= ${FIT_SCORE_THRESHOLD} の ${topJobs.length} 件の提案文を生成します`);

    for (const job of topJobs) {
      try {
        await generateForJob(db, job);
        generatedCount++;
      } catch (e) {
        if (e instanceof ExaQuotaExceededError) {
          console.error(`❌ ${e.message}`);
          throw e;
        }
        console.error(
          `❌ [${job.job_id}] 失敗:`,
          e instanceof ClaudeHeadlessError ? e.message : e
        );
        // 個別失敗は無視して次へ
      }
    }

    // 追加生成依頼キューを処理
    const pending = getPendingGenerationRequests(db);
    if (pending.length > 0) {
      console.log(`📥 追加依頼 ${pending.length} 件を処理`);
      for (const req of pending) {
        markGenerationRequest(db, req.request_id, 'processing');
        const job = db
          .prepare('SELECT * FROM jobs WHERE job_id = ?')
          .get(req.job_id) as JobRow | undefined;
        if (!job) {
          markGenerationRequest(db, req.request_id, 'failed', 'job not found');
          continue;
        }
        try {
          await generateForJob(db, job);
          markGenerationRequest(db, req.request_id, 'done');
          generatedCount++;
        } catch (e: unknown) {
          markGenerationRequest(
            db,
            req.request_id,
            'failed',
            e instanceof Error ? e.message : String(e)
          );
        }
      }
    }

    db.prepare(
      `INSERT INTO runs (started_at, ended_at, stage, generated_count, status)
       VALUES (datetime('now'), datetime('now'), 'generate', ?, 'success')`
    ).run(generatedCount);

    console.log(`\n✅ 生成完了: ${generatedCount} 件`);
    return 0;
  } catch (e: unknown) {
    errorMessage = e instanceof Error ? e.message : String(e);
    console.error('❌ 致命的エラー:', errorMessage);
    db.prepare(
      `INSERT INTO runs (started_at, ended_at, stage, generated_count, status, error_message, error_stage)
       VALUES (datetime('now'), datetime('now'), 'generate', ?, 'error', ?, 'generate')`
    ).run(generatedCount, errorMessage);
    return 1;
  } finally {
    db.close();
  }
}

main().then((code) => process.exit(code));
