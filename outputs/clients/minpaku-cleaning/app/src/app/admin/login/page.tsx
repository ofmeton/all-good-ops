"use client";
import { useActionState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { login } from "./actions";

const inputCls =
  "w-full h-11 px-3 rounded-lg ring-1 ring-ink-200 bg-white text-[14px] text-ink-800 outline-none placeholder:text-ink-400 focus:ring-brand-500 focus:ring-2";
const labelCls = "block text-[12px] text-ink-600 font-medium mb-1.5";

export default function LoginPage() {
  const [error, formAction, pending] = useActionState(login, null);
  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-ink-50">
      <Card className="w-full max-w-sm p-8">
        <div className="flex flex-col items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-2xl bg-brand-600 flex items-center justify-center text-white">
            <Icon name="Sparkles" size={22} />
          </div>
          <div className="text-center">
            <div className="font-display font-extrabold text-[20px] text-ink-900">StayClean</div>
            <p className="text-[11px] text-ink-500 mt-0.5">清掃管理 SaaS for 民泊</p>
          </div>
        </div>

        <form action={formAction} className="space-y-4">
          <label className="block">
            <span className={labelCls}>メールアドレス</span>
            <input
              name="email"
              type="email"
              required
              placeholder="admin@example.com"
              className={inputCls}
              autoComplete="email"
            />
          </label>
          <label className="block">
            <span className={labelCls}>パスワード</span>
            <input
              name="password"
              type="password"
              required
              placeholder="••••••••"
              className={inputCls}
              autoComplete="current-password"
            />
          </label>
          {error && (
            <p className="text-[12.5px] text-st-cancelled-text bg-st-cancelled-bg px-3 py-2 rounded-lg">
              {error}
            </p>
          )}
          <Button type="submit" variant="primary" size="lg" disabled={pending} className="w-full">
            {pending ? "ログイン中..." : "ログイン"}
          </Button>
        </form>

        <p className="text-[10.5px] text-ink-500 text-center mt-6">
          管理者専用画面です。パスワードを忘れた場合は工藤陸へご連絡ください。
        </p>
      </Card>
    </main>
  );
}
