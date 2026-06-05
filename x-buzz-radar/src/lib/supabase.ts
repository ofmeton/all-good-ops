import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let _admin: SupabaseClient | null = null;
let _public: SupabaseClient | null = null;

if (url && serviceKey) {
  _admin = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

if (url && publishableKey) {
  _public = createClient(url, publishableKey);
}

export const supabaseAdmin = _admin;
export const supabasePublic = _public;

export function requireAdmin(): SupabaseClient {
  if (!_admin)
    throw new Error(
      "Supabase admin client unavailable: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required",
    );
  return _admin;
}
