import type { ReactNode } from "react";

type KVProps = {
  k: string;
  className?: string;
  children: ReactNode;
};

export function KV({ k, className = "", children }: KVProps) {
  return (
    <div className={`flex items-start gap-4 text-[13px] min-w-0 ${className}`}>
      <div className="w-24 shrink-0 text-ink-500">{k}</div>
      <div className="flex-1 min-w-0 text-ink-800">{children}</div>
    </div>
  );
}
