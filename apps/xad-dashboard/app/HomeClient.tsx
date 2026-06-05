"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { NodePanel } from "./components/NodePanel";
import type { Trace } from "@/lib/colors";

const Flowchart = dynamic(
  () => import("./components/Flowchart").then((m) => m.Flowchart),
  { ssr: false, loading: () => <div className="p-4 text-gray-500">読み込み中…</div> },
);

export function HomeClient({ latest }: { latest: Record<string, Trace> }) {
  const [sel, setSel] = useState<string | null>(null);
  return (
    <main className="flex h-screen">
      <div className="flex-1"><Flowchart latest={latest} onSelect={setSel} /></div>
      {sel && <div className="w-[480px] border-l p-4 overflow-auto"><NodePanel stageId={sel} onClose={() => setSel(null)} /></div>}
    </main>
  );
}
