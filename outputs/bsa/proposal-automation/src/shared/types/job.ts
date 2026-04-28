// src/shared/types/job.ts
export type JobStatus =
  | 'collected'
  | 'proposing'
  | 'submitted'
  | 'replied'
  | 'won'
  | 'lost';

export type ServiceCategory = 'lp' | 'website' | 'ad';
export type ProductLine = 'L1' | 'L2' | 'L3' | 'L4';

export interface Job {
  job_id: string;
  platform_prefix: string;
  source_url: string;
  detail_url: string;
  title: string;
  description: string | null;
  budget_text: string | null;
  budget_min: number | null;
  budget_max: number | null;
  deadline: string | null;
  proposal_count: number | null;
  client_name: string | null;
  client_verified: boolean | null;
  client_history_count: number | null;
  service_category: ServiceCategory | null;
  posted_at: string | null;
  collected_at: string;
  fit_score: number | null;
  fit_score_breakdown: FitScoreBreakdown | null;
  estimated_product_line: ProductLine | null;
  status: JobStatus;
}

export interface FitScoreBreakdown {
  price: number;
  service: number;
  constraint: number;
  speed: number;
  client: number;
  total: number;
  excluded?: string;
}
