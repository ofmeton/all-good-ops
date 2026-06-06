"use server";
import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase-auth";
import { validateLoginInput } from "@/lib/login-validation";

export async function login(_prev: string | null, formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  // 認証処理に渡す前に形式・長さを検証（不正メール・過大入力を弾く）。
  const invalid = validateLoginInput(email, password);
  if (invalid) return invalid;
  const auth = await createAuthClient();
  const { error } = await auth.auth.signInWithPassword({ email, password });
  if (error) return "メールアドレスまたはパスワードが正しくありません";
  redirect("/admin");
}
