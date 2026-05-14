import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase-server";
import type { Actor } from "@/lib/auth";

// 管理者の Supabase Auth セッション用クライアント（cookie 連動）。
export async function createAuthClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) =>
          toSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          ),
      },
    },
  );
}

// 現在ログイン中の管理者を Actor として返す。未ログインなら null。
export async function resolveAdminActor(): Promise<Actor | null> {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return null;

  const db = createServiceClient();
  const { data: admin } = await db
    .from("admins")
    .select("id, role_level")
    .eq("id", user.id)
    .maybeSingle();
  if (!admin) return null;

  return { role: "admin", adminId: admin.id, roleLevel: admin.role_level };
}
