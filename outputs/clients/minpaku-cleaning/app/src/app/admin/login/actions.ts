"use server";
import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase-auth";

export async function login(_prev: string | null, formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const auth = await createAuthClient();
  const { error } = await auth.auth.signInWithPassword({ email, password });
  if (error) return "メールアドレスまたはパスワードが正しくありません";
  redirect("/admin");
}
