"use client";
import ReactFlow, { Background, Controls, type Node, type Edge } from "reactflow";
import "reactflow/dist/style.css";
import { STAGES } from "@/lib/registry";
import { nodeColor, type Trace } from "@/lib/colors";

const COLOR: Record<string, string> = {
  green: "#16a34a", yellow: "#ca8a04", red: "#dc2626", slate: "#475569", gray: "#9ca3af",
};
const GROUP_X: Record<string, number> = {
  ingest: 0, ideation: 220, generate: 440, review: 660, approve: 880, publish: 1100, learn: 1320,
};

export function Flowchart({ latest, onSelect }:
  { latest: Record<string, Trace>; onSelect: (id: string) => void }) {
  const seen: Record<string, number> = {};
  const nodes: Node[] = STAGES.map((s) => {
    const y = (seen[s.group] = (seen[s.group] ?? -1) + 1) * 110;
    return {
      id: s.id, position: { x: GROUP_X[s.group] ?? 0, y },
      data: { label: s.label },
      style: { border: `3px solid ${COLOR[nodeColor(latest[s.id] ?? null)]}`,
        borderRadius: 10, padding: 8, background: "#fff", width: 180 },
    };
  });
  const edges: Edge[] = STAGES.flatMap((s) =>
    s.downstream.map((d) => ({ id: `${s.id}-${d}`, source: s.id, target: d })));
  return (
    <div className="h-full w-full">
      <ReactFlow nodes={nodes} edges={edges} onNodeClick={(_, n) => onSelect(n.id)} fitView>
        <Background color="#e2e8f0" gap={20} /><Controls />
      </ReactFlow>
    </div>
  );
}
