// server component / route handler 専用（service role を client に晒さない）
import { createClient } from "@supabase/supabase-js";

export function serverSupabase() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    db: { schema: "xad" }, auth: { persistSession: false },
  });
}
