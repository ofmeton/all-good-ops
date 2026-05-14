"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  target: { type: "owner"; propertyId: string } | { type: "staff"; staffId: string };
  activeToken: { id: string; token: string } | null;
  basePath: "property" | "staff";
};

export function TokenControls({ target, activeToken, basePath }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const url = activeToken ? `${appUrl}/${basePath}/${activeToken.token}` : null;

  async function post(action: "issue" | "reissue") {
    setBusy(true);
    await fetch("/api/admin/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, target }),
    });
    setBusy(false);
    router.refresh();
  }

  async function revoke() {
    if (!activeToken) return;
    setBusy(true);
    await fetch(`/api/admin/tokens?id=${activeToken.id}`, { method: "DELETE" });
    setBusy(false);
    router.refresh();
  }

  if (!url) {
    return (
      <button onClick={() => post("issue")} disabled={busy}
        className="text-xs underline disabled:opacity-50">
        URLを発行
      </button>
    );
  }
  return (
    <span className="flex items-center gap-2 text-xs">
      <a href={url} className="underline break-all">{url}</a>
      <button onClick={() => post("reissue")} disabled={busy} className="underline">再発行</button>
      <button onClick={revoke} disabled={busy} className="underline text-red-600">無効化</button>
    </span>
  );
}
