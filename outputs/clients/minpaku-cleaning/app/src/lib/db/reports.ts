import "server-only";
import { createServiceClient } from "@/lib/supabase-server";
import { assertAdmin, StaffOnlyError } from "@/lib/db/scope";
import type { Actor } from "@/lib/auth";
import { assertTransition, type CleaningStatus } from "@/lib/status-machine";

// チェックリスト1項目の提出結果。label は properties.checklist_template から、
// checked/note はスタッフが記入する。
export type ChecklistResultItem = {
  label: string;
  checked: boolean;
  note?: string;
};

export type CleaningReport = {
  id: string;
  request_id: string;
  staff_id: string;
  checklist_result: ChecklistResultItem[];
  submitted_at: string;
};

export type ReportPhoto = {
  id: string;
  report_id: string;
  storage_path: string;
  uploaded_at: string;
  expires_at: string;
};

// スタッフが完了報告を提出する。cleaning_reports を作成し、写真パスがあれば
// report_photos 行を作り、依頼を in_progress → reported に遷移させる。
// photoPaths は Task 6 の storage.ts で事前にアップロード済みの保存パス。
export async function submitReport(
  actor: Actor,
  requestId: string,
  checklistResult: ChecklistResultItem[],
  photoPaths: string[],
): Promise<CleaningReport> {
  if (actor.role !== "staff") throw new StaffOnlyError("スタッフ専用の操作です");
  const db = createServiceClient();
  const { data: req, error: readError } = await db
    .from("cleaning_requests")
    .select("status, assigned_staff_id")
    .eq("id", requestId)
    .maybeSingle();
  if (readError) throw readError;
  if (!req) throw new Error("依頼が見つかりません");
  if (req.assigned_staff_id !== actor.staffId) {
    throw new Error("自分が担当する依頼ではありません");
  }
  assertTransition(req.status as CleaningStatus, "reported");

  // TODO(Plan 3): 3段書き込み（report → photos → status更新）をRPC/トランザクション化。
  // 現状はスタッフアプリの低並行前提で逐次実行。失敗時の部分状態リスクは許容。
  const { data: report, error } = await db
    .from("cleaning_reports")
    .insert({
      request_id: requestId,
      staff_id: actor.staffId,
      checklist_result: checklistResult,
    })
    .select()
    .single();
  if (error) throw error;

  if (photoPaths.length > 0) {
    // 設計書 8章: expires_at = uploaded_at + 3ヶ月
    const expiresAt = new Date(
      Date.now() + 90 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const { error: photoError } = await db.from("report_photos").insert(
      photoPaths.map((p) => ({
        report_id: report.id,
        storage_path: p,
        expires_at: expiresAt,
      })),
    );
    if (photoError) throw photoError;
  }

  const { error: statusError } = await db
    .from("cleaning_requests")
    .update({ status: "reported", updated_at: new Date().toISOString() })
    .eq("id", requestId);
  if (statusError) throw statusError;
  // TODO(Plan 3): 完了報告時に管理者へ通知

  return report as CleaningReport;
}

// 管理者向け: 依頼に紐づく完了報告と写真行を取得する。
export async function getReportForRequest(
  actor: Actor,
  requestId: string,
): Promise<{ report: CleaningReport; photos: ReportPhoto[] } | null> {
  assertAdmin(actor);
  const db = createServiceClient();
  const { data: report, error } = await db
    .from("cleaning_reports")
    .select("*")
    .eq("request_id", requestId)
    .maybeSingle();
  if (error) throw error;
  if (!report) return null;
  const { data: photos, error: photoError } = await db
    .from("report_photos")
    .select("*")
    .eq("report_id", report.id)
    .order("uploaded_at", { ascending: true });
  if (photoError) throw photoError;
  return {
    report: report as CleaningReport,
    photos: (photos ?? []) as ReportPhoto[],
  };
}
