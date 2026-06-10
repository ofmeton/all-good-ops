import { listPendingProposals } from "@/lib/proposals-queries";
import { ProposalsClient } from "./ProposalsClient";

export const dynamic = "force-dynamic";

export default async function ProposalsPage() {
  const proposals = await listPendingProposals().catch(() => []);
  return <ProposalsClient initial={proposals} />;
}
