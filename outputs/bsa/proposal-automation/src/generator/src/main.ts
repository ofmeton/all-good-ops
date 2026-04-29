import { openDb, getTopJobs, upsertProposal, getPendingGenerationRequests, markGenerationRequest } from './db.js';
import type { JobRow } from './db.js';
import { researchJob, ExaQuotaExceededError } from './researcher.js';
import { buildProposalPrompt } from './prompt-builder.js';
import { estimateProductLine } from './product-line-mapper.js';
import { customizePricing } from './pricing.js';
import { callClaudeHeadless, ClaudeHeadlessError } from './claude-headless.js';

// claude --output-format json --json-schema 用のスキーマ
const PROPOSAL_SCHEMA = {
  type: 'object',
  properties: {
    body_md: { type: 'string' },
    product_line: { type: 'string', enum: ['L1', 'L2', 'L3', 'L4'] },
    price: { type: 'integer' },
    delivery_days: { type: 'integer' },
    research_notes: { type: 'string' },
  },
  required: ['body_md', 'product_line', 'price', 'delivery_days'],
} as const;

interface GenerationOutput {
  body_md: string;
  product_line: 'L1' | 'L2' | 'L3' | 'L4';
  price: number;
  delivery_days: number;
  research_notes?: string;
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
    researchNotes
  );

  const prompt = `${basePrompt}\n\n推奨初期値: 商品ライン=${estimated} / 金額=${suggestedPrice}円 / 納期=${suggestedDays}日`;

  // 5. Claude 呼び出し
  const result = await callClaudeHeadless<GenerationOutput>({
    prompt,
    schema: PROPOSAL_SCHEMA,
    bare: true,
    mcpConfig: 'config/exa-mcp.json',
    allowedTools: ['WebFetch'],
    effort: 'medium',
    fallbackModel: 'sonnet',
    timeoutMs: 180_000,
  });

  // 6. SQLite に保存
  upsertProposal(db, {
    job_id: job.job_id,
    product_line: result.product_line,
    price: result.price,
    delivery_days: result.delivery_days,
    body_md: result.body_md,
    research_notes: result.research_notes ?? researchNotes,
    generated_by: 'claude-code-cli',
  });

  console.log(
    `  ✅ ${result.product_line} / ${result.price.toLocaleString()}円 / ${result.delivery_days}日`
  );
}

async function main(): Promise<number> {
  const db = openDb();
  let generatedCount = 0;
  let errorMessage: string | null = null;

  try {
    // 上位10件
    const topJobs = getTopJobs(db, 10);
    console.log(`📊 上位 ${topJobs.length} 件の提案文を生成します`);

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
