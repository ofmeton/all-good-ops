// src/shared/types/proposal.ts
import type { ProductLine } from './job';

export interface Proposal {
  proposal_id: string;
  job_id: string;
  product_line: ProductLine;
  price: number;
  delivery_days: number;
  body_md: string;
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
