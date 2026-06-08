export type StageGroup =
  | "ingest" | "generate" | "review" | "approve" | "publish" | "learn";
export type LogicKind = "llm" | "deterministic" | "io";

export interface StageMeta {
  id: string;
  label: string;
  group: StageGroup;
  purpose: string;
  /**
   * フェーズ別の目的関数 (Kくん参考設計)。この工程が「何を最大化/最小化するか」を一言で。
   * purpose=何をするか に対し、objectiveFunction=何に最適化するか を分離して観測する。
   */
  objectiveFunction: string;
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
