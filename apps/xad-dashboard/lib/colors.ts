export type Trace = { status: "ok" | "error" | "skipped"; outcome?: string } | null;

export function nodeColor(t: Trace): "green" | "yellow" | "red" | "slate" | "gray" {
  if (!t) return "gray";
  if (t.outcome === "rejected") return "red";
  if (t.outcome === "warned") return "yellow";
  if (t.status === "skipped") return "slate";
  if (t.status === "error") return "red";
  return "green";
}
