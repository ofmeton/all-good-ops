export type StageGroup =
  | "ingest" | "ideation" | "generate" | "review" | "approve" | "publish" | "learn";
export type LogicKind = "llm" | "deterministic" | "io";

export interface StageMeta {
  id: string;
  label: string;
  group: StageGroup;
  purpose: string;
  inputs: string[];
  outputs: string[];
  keyVariables: { name: string; desc: string }[];
  logicKind: LogicKind;
  promptRef?: string;
  sourcePaths: string[];
  designDocAnchor?: string;
  upstream: string[];
  downstream: string[];
}
