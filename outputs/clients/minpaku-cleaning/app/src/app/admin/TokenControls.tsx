"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";

type Props = {
  target: { type: "owner"; propertyId: string } | { type: "staff"; staffId: string };
  activeToken: { id: string; token: string } | null;
  basePath: "property" | "staff";
};

export function TokenControls({ target, activeToken, basePath }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const url = activeToken ? `${appUrl}/${basePath}/${activeToken.token}` : null;

  async function post(action: "issue" | "reissue") {
    setBusy(true);
    const res = await fetch("/api/admin/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, target }),
    });
    setBusy(false);
    if (!res.ok) {
      toast.error("URL の発行に失敗しました");
      return;
    }
    toast.success(action === "issue" ? "URL を発行しました" : "URL を再発行しました");
    startTransition(() => router.refresh());
  }

  async function revoke() {
    if (!activeToken) return;
    if (!confirm("この URL を無効化します。よろしいですか？")) return;
    setBusy(true);
    const res = await fetch(`/api/admin/tokens?id=${activeToken.id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      toast.error("無効化に失敗しました");
      return;
    }
    toast.success("URL を無効化しました");
    startTransition(() => router.refresh());
  }

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("URL をコピーしました");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("コピーに失敗しました");
    }
  }

  const loading = busy || pending;

  if (!url) {
    return (
      <Button variant="secondary" size="sm" icon="Link2" loading={loading} onClick={() => post("issue")}>
        {loading ? "発行中..." : "URLを発行"}
      </Button>
    );
  }
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 bg-ink-50 rounded-lg px-3 py-2">
        <Icon name="Link2" size={13} className="text-ink-500 shrink-0" />
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="num text-[11px] text-ink-700 truncate flex-1 hover:underline"
        >
          {url}
        </a>
        <button
          type="button"
          onClick={copy}
          aria-label="URLをコピー"
          className="h-7 w-7 rounded-md hover:bg-white text-ink-600 flex items-center justify-center shrink-0"
        >
          <Icon name={copied ? "Check" : "Copy"} size={13} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" size="sm" icon="RefreshCw" loading={loading} onClick={() => post("reissue")}>
          再発行
        </Button>
        <Button variant="ghost" size="sm" icon="Ban" loading={loading} onClick={revoke}>
          無効化
        </Button>
      </div>
    </div>
  );
}
