import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

let cachedTemplate: string | null = null;
let cachedTrackRecord: string | null = null;

function loadTemplate(): string {
  if (cachedTemplate) return cachedTemplate;
  const path = join(__dirname, '..', 'prompts', 'proposal.txt');
  cachedTemplate = readFileSync(path, 'utf8');
  return cachedTemplate;
}

function loadTrackRecord(): string {
  if (cachedTrackRecord) return cachedTrackRecord;
  const path = join(
    __dirname,
    '..', '..', '..', '..', '..', '..',
    'wiki', 'business', 'bsa', 'proven-track-record.md'
  );
  try {
    cachedTrackRecord = readFileSync(path, 'utf8');
  } catch {
    cachedTrackRecord = '(proven-track-record.md が読み込めませんでした。実績欄は空欄で出力すること)';
  }
  return cachedTrackRecord;
}

export interface JobInfo {
  job_id: string;
  title: string;
  description: string | null;
  budget_text?: string | null;
  budget_min: number | null;
  budget_max: number | null;
  deadline: string | null;
  client_name: string | null;
  service_category: string | null;
}

export function buildProposalPrompt(
  job: JobInfo,
  estimatedLine: string,
  researchNotes: string,
  platform: string = 'LAN'
): string {
  const template = loadTemplate();
  const jobInfo = [
    `案件ID: ${job.job_id}`,
    `タイトル: ${job.title}`,
    `カテゴリ: ${job.service_category ?? '不明'}`,
    `予算: ${job.budget_text ?? `${job.budget_min ?? '?'} 〜 ${job.budget_max ?? '?'}円`}`,
    `締切: ${job.deadline ?? '不明'}`,
    `発注者: ${job.client_name ?? '不明'}`,
    `推奨ライン: ${estimatedLine}`,
    ``,
    `案件本文:`,
    job.description ?? '(本文なし)',
  ].join('\n');

  return template
    .replace('{JOB_INFO}', jobInfo)
    .replace('{RESEARCH_NOTES}', researchNotes || '(リサーチなし)')
    .replace('{TRACK_RECORD}', loadTrackRecord())
    .replace(/\{PLATFORM\}/g, platform);
}
