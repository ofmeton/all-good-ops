// src/shared/types/proposal.ts
import type { ProductLine } from './job';

export interface Milestone {
  title: string;
  schedule_date: string; // YYYY-MM-DD
  amount_exclude_tax: number;
  description: string;
}

export interface ProposalOption {
  title: string;
  description: string;
  contract_amount_exclude_tax: number;
}

export interface Proposal {
  proposal_id: string;
  job_id: string;
  product_line: ProductLine;
  price: number; // 税込み総額（互換用）
  price_exclude_tax: number | null; // 税抜き総額（ランサーズ入力用）
  delivery_days: number;
  body_md: string; // 従来の一体型 markdown（description_md と同期）
  description_md: string | null; // 自己PR・実績欄
  estimate_md: string | null; // 見積もりの詳細欄
  milestones_json: string | null; // Milestone[] の JSON
  options_json: string | null; // ProposalOption[] の JSON
  research_notes: string | null;
  generated_at: string;
  generated_by: 'claude-code-cli' | 'human';
  edited_at: string | null;
  submitted_at: string | null;
}

export interface ProposalRevision {
  revision_id: number;
  proposal_id: string;
  body_md: string;
  product_line: ProductLine;
  price: number;
  delivery_days: number;
  changed_at: string;
  changed_by: 'claude' | 'human';
  note: string | null;
}

export interface ResearchResult {
  client_site_summary?: string;
  industry_trends?: string[];
  competitor_lps?: Array<{ url: string; summary: string }>;
}
