import data from "./registry.generated.json";

export interface StageMeta {
  id: string;
  label: string;
  group: string;
  purpose: string;
  /** フェーズ別の目的関数 (Kくん参考設計): この工程が何に最適化するか */
  objectiveFunction: string;
  inputs: string[];
  outputs: string[];
  keyVariables: { name: string; desc: string }[];
  logicKind: "llm" | "deterministic" | "io";
  promptRef?: string;
  sourcePaths: string[];
  designDocAnchor?: string;
  upstream: string[];
  downstream: string[];
}

export const STAGES = (data as { stages: StageMeta[] }).stages;
export const stageById = (id: string) => STAGES.find((s) => s.id === id);
