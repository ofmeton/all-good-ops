import { listPendingDrafts } from "@/lib/drafts-queries";
import { fetchTemplateOptions } from "@/lib/curation-queries";
import { ApprovalClient } from "./ApprovalClient";
import type { ApprovalDraft } from "@/lib/drafts-logic";

export const dynamic = "force-dynamic";
const LIMIT = 100;

export default async function ApprovalPage() {
  // 修正依頼ダイアログ（要件5）で format/template を選び直すため templateOptions も取得。
  // fetchTemplateOptions は内部で全失敗を握って fallback を返す（throw しない）。
  const [drafts, templateOptions] = await Promise.all([
    listPendingDrafts(LIMIT).catch(() => [] as ApprovalDraft[]),
    fetchTemplateOptions(),
  ]);
  return <ApprovalClient initialDrafts={drafts} templateOptions={templateOptions} />;
}
