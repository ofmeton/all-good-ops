"use client";
import { useMemo } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  type Node,
  type Edge,
} from "reactflow";
import "reactflow/dist/style.css";
import { STAGES } from "@/lib/registry";
import { nodeColor, type Trace } from "@/lib/colors";
import { StageNode, type StageNodeData } from "./StageNode";
import { useReducedMotion } from "./motion/useReducedMotion";

/** ダーク輝度版（globals.css の --st-* と一致。MiniMap 等 hex 必須箇所用） */
const COLOR: Record<string, string> = {
  green: "#34d399", yellow: "#fbbf24", red: "#fb7185", slate: "#64748b", gray: "#475569",
};
const GROUP_X: Record<string, number> = {
  ingest: 0, ideation: 220, generate: 440, review: 660, approve: 880, publish: 1100, learn: 1320,
};

const NODE_TYPES = { stage: StageNode };

export function Flowchart({ latest, onSelect }:
  { latest: Record<string, Trace>; onSelect: (id: string) => void }) {
  const reduced = useReducedMotion();
  // latestTraceByStage は新しい順に挿入する＝先頭キーが直近実行工程
  const latestStageId = Object.keys(latest)[0] ?? null;

  const { nodes, edges } = useMemo(() => {
    const seen: Record<string, number> = {};
    const colorOf: Record<string, string> = {};
    const nodes: Node<StageNodeData>[] = STAGES.map((s) => {
      const y = (seen[s.group] = (seen[s.group] ?? -1) + 1) * 110;
      const color = nodeColor(latest[s.id] ?? null);
      colorOf[s.id] = color;
      return {
        id: s.id,
        type: "stage",
        position: { x: GROUP_X[s.group] ?? 0, y },
        data: { label: s.label, group: s.group, color, isLatest: s.id === latestStageId },
      };
    });
    // ok 経路（source が green）のエッジは発光しつつ流動。それ以外は鈍色の静脈。
    const edges: Edge[] = STAGES.flatMap((s) =>
      s.downstream.map((d) => {
        const flowing = colorOf[s.id] === "green";
        return {
          id: `${s.id}-${d}`,
          source: s.id,
          target: d,
          type: "smoothstep",
          animated: flowing && !reduced,
          style: flowing
            ? { stroke: "rgb(52 211 153 / 0.5)", strokeWidth: 1.5 }
            : { stroke: "#334155", strokeWidth: 1 },
        };
      }));
    return { nodes, edges };
  }, [latest, latestStageId, reduced]);

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        onNodeClick={(_, n) => onSelect(n.id)}
        fitView
      >
        <Background variant={BackgroundVariant.Dots} color="#1e293b" gap={24} />
        <Controls />
        <MiniMap
          pannable
          zoomable
          nodeColor={(n) => COLOR[(n.data as StageNodeData)?.color] ?? "#475569"}
          nodeStrokeColor="transparent"
          maskColor="rgb(10 15 30 / 0.72)"
          style={{ background: "#0f1629" }}
        />
      </ReactFlow>
    </div>
  );
}
