"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * 控えめな上部 progress bar。
 * pathname が変わるたびに 1.5px の bar を伸ばし、変化完了で 200ms フェードアウト。
 * Linear / Vercel ダッシュボード風のシンプルスタイル。
 */
export function TopProgress() {
  const pathname = usePathname();
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");

  useEffect(() => {
    // mount or pathname 変化を検知
    setPhase("running");
    const t1 = setTimeout(() => setPhase("done"), 180);
    const t2 = setTimeout(() => setPhase("idle"), 380);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [pathname]);

  if (phase === "idle") return null;

  const width = phase === "running" ? "70%" : "100%";
  const opacity = phase === "done" ? 0 : 1;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed top-0 left-0 right-0 z-[60] h-[1.5px]"
    >
      <div
        className="h-full bg-brand-600 transition-[width,opacity] ease-out"
        style={{
          width,
          opacity,
          transitionDuration: phase === "running" ? "300ms" : "200ms",
        }}
      />
    </div>
  );
}
