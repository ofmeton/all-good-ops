import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が未設定。.env.example を参照",
    );
  }

  cachedClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "X-Client-Info": "money-bot/0.1.0" } },
  });
  return cachedClient;
}

export function hasSupabase(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export interface PublishQueueRow {
  id: string;
  workflow_run_id: string;
  draft: unknown;
  visuals: unknown;
  sns_content: unknown;
  status: "pending" | "approved" | "rejected" | "published" | "failed";
  note_url: string | null;
  x_url: string | null;
  instagram_url: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApprovalRow {
  id: string;
  run_id: string;
  approved: boolean;
  edits: unknown | null;
  decided_by: string | null;
  decided_at: string;
}
