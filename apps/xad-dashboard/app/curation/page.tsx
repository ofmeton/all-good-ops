import { listCurationMaterials, tabCounts, fetchTemplateOptions } from "@/lib/curation-queries";
import { CurationClient } from "./CurationClient";
import { TEMPLATE_OPTIONS_FALLBACK } from "@/lib/curation-formats";
import type { CurationMaterial, SelectionStatus } from "@/lib/curation-logic";

export const dynamic = "force-dynamic";
const LIMIT = 300;

export default async function CurationPage() {
  const [collected, selected, queued, rejected, counts, templateOptions] = await Promise.all([
    listCurationMaterials("collected", LIMIT).catch(() => []),
    listCurationMaterials("selected", LIMIT).catch(() => []),
    listCurationMaterials("queued", LIMIT).catch(() => []),
    listCurationMaterials("rejected", LIMIT).catch(() => []),
    tabCounts().catch(() => ({ collected: 0, selected: 0, queued: 0, rejected: 0 })),
    fetchTemplateOptions().catch(() => TEMPLATE_OPTIONS_FALLBACK),
  ]);
  const materials: Record<SelectionStatus, CurationMaterial[]> = { collected, selected, queued, rejected };
  return (
    <CurationClient
      materials={materials}
      counts={counts}
      limit={LIMIT}
      templateOptions={templateOptions}
    />
  );
}
