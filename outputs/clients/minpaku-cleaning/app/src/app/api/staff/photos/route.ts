import { NextResponse, type NextRequest } from "next/server";
import { resolveActorByToken } from "@/lib/auth";
import { uploadReportPhoto } from "@/lib/storage";
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
  if (!(file instanceof File))
    return NextResponse.json({ error: "file は必須です" }, { status: 400 });
  const actor = await resolveActorByToken(token);
  if (!actor || actor.role !== "staff")
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
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
