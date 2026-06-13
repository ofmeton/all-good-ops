import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { resolveActorByToken } from "@/lib/auth";
import { uploadReportPhoto } from "@/lib/storage";
import { assertStaffAssignedToRequest } from "@/lib/db/requests";
import { StaffOnlyError } from "@/lib/db/scope";

// multipart/form-data: token / requestId / file（画像）。
// アップロード成功で { storagePath } を返す。完了報告の photoPaths にこの値を載せる。
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const token = form.get("token");
  const requestId = form.get("requestId");
  const file = form.get("file");
  if (typeof token !== "string" || typeof requestId !== "string")
    return NextResponse.json({ error: "token と requestId は必須です" }, { status: 400 });
  // requestId は UUID 形式のみ許可（不正値・パストラバーサルを境界で弾く）。
  if (!z.string().uuid().safeParse(requestId).success)
    return NextResponse.json({ error: "requestId が不正です" }, { status: 400 });
  if (!(file instanceof File))
    return NextResponse.json({ error: "file は必須です" }, { status: 400 });
  const actor = await resolveActorByToken(token);
  if (!actor || actor.role !== "staff")
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  // IDOR 防止: アップロード前に、その依頼の物件をこのスタッフが担当しているか検証する。
  try {
    await assertStaffAssignedToRequest(actor, requestId);
  } catch (e) {
    if (e instanceof StaffOnlyError)
      return NextResponse.json({ error: e.message }, { status: 403 });
    // 担当外・依頼不存在は権限エラーとして 403（存在判別を与えない）。
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "forbidden" },
      { status: 403 },
    );
  }
  const contentType =
    file.type === "image/png" ? "image/png" : "image/jpeg";
  try {
    const storagePath = await uploadReportPhoto(
      requestId,
      await file.arrayBuffer(),
      contentType,
    );
    return NextResponse.json({ storagePath });
  } catch (e) {
    if (e instanceof StaffOnlyError)
      return NextResponse.json({ error: e.message }, { status: 403 });
    if (e instanceof Error)
      return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
