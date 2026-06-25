export type Platform = "x" | "instagram" | "note";
export type Category = "tips" | "news" | "compare" | "case" | "other";
export type BuzzStatus =
  | "pending_review"
  | "adopted"
  | "rejected"
  | "saved_for_later"
  | "archived";

export interface QueryPool {
  query_id: string;
  query_string: string;
  active: boolean;
  total_hits: number;
  total_adoptions: number;
  last_30d_adoption_rate: number | null;
  parent_query_id: string | null;
  created_at: string;
  retired_at: string | null;
}

export interface XBuzzTweet {
  id: string;
  tweet_id: string;
  author_screen_name: string;
  author_id: string | null;
  body: string;
  lang: string | null;
  posted_at: string;
  likes: number;
  retweets: number;
  replies: number;
  source_query_id: string | null;
  category: Category | null;
  claude_relevance: number | null;
  buzz_pattern: string | null;
  hook_structure: string | null;
  visual_hint: string | null;
  status: BuzzStatus;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface PromptVariant {
  variant_id: string;
  platform: Platform;
  type: "thread" | "single" | "carousel" | "outline" | "title";
  hook_template: string;
  tone: string;
  format: string;
  prompt_template: string;
  active: boolean;
  parent_variant_id: string | null;
  created_at: string;
  retired_at: string | null;
}

export interface RelevanceJudgment {
  score: number;
  reason: string;
  category: Category;
}

export interface PatternJudgment {
  buzz_pattern: string;
  hook_structure: string;
  visual_hint: "screenshot" | "diagram" | "video" | "none";
}

export interface DraftOutput {
  translation_jp: string;
  japan_application: string;
  x_thread?: string[];
  note_outline?: {
    title: string;
    hook: string;
    sections: string[];
    cta: string;
  };
  instagram_carousel?: Record<string, string>;
  visual_brief: {
    type: "image" | "video";
    prompt: string;
    format: string;
  };
}
