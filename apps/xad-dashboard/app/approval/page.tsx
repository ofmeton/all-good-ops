import { listPendingDrafts } from "@/lib/drafts-queries";
import { ApprovalClient } from "./ApprovalClient";
import type { ApprovalDraft } from "@/lib/drafts-logic";

export const dynamic = "force-dynamic";
const LIMIT = 100;

export default async function ApprovalPage() {
  const drafts: ApprovalDraft[] = await listPendingDrafts(LIMIT).catch(() => []);
  return <ApprovalClient initialDrafts={drafts} />;
}
