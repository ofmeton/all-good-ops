// server component / route handler 専用（service role を client に晒さない）
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _testClient: SupabaseClient | null = null;

/** テスト用に reader client を差し替える。 */
export function __setSupabaseForTest(c: SupabaseClient | null): void {
  _testClient = c;
}

export function serverSupabase(): SupabaseClient<any, any, "xad"> {
  if (_testClient) return _testClient as unknown as SupabaseClient<any, any, "xad">;
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    db: { schema: "xad" },
    auth: { persistSession: false },
  });
}
