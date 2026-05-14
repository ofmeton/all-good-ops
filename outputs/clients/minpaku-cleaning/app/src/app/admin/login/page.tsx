"use client";
import { useActionState } from "react";
import { login } from "./actions";

export default function LoginPage() {
  const [error, formAction, pending] = useActionState(login, null);
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <form action={formAction} className="w-full max-w-sm space-y-4">
        <h1 className="text-xl font-bold">管理者ログイン</h1>
        <input name="email" type="email" required placeholder="メールアドレス"
          className="w-full border rounded px-3 py-2" />
        <input name="password" type="password" required placeholder="パスワード"
          className="w-full border rounded px-3 py-2" />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button type="submit" disabled={pending}
          className="w-full bg-black text-white rounded py-2 disabled:opacity-50">
          {pending ? "ログイン中..." : "ログイン"}
        </button>
      </form>
    </main>
  );
}
