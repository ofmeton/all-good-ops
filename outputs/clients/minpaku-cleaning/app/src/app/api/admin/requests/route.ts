import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { resolveAdminActor } from "@/lib/supabase-auth";
import {
  listRequests,
  createRequest,
  updateRequest,
} from "@/lib/db/requests";
import { AuthorizationError } from "@/lib/db/scope";

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 形式で指定してください");

const createSchema = z.object({
  property_id: z.string().uuid(),
  checkin_date: dateStr,
  checkout_date: dateStr,
  guest_count: z.number().int().positive(),
  option_memo: z.string().optional(),
});
// 編集スキーマ: property_id は変更不可
const updateSchema = z
  .object({ id: z.string().uuid() })
  .and(createSchema.omit({ property_id: true }).partial());

export async function GET() {
  const actor = await resolveAdminActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await listRequests(actor));
  } catch (e) {
    if (e instanceof AuthorizationError)
      return NextResponse.json({ error: e.message }, { status: 403 });
    throw e;
  }
}

export async function POST(req: NextRequest) {
  const actor = await resolveAdminActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  try {
    return NextResponse.json(await createRequest(actor, parsed.data));
  } catch (e) {
    if (e instanceof AuthorizationError)
      return NextResponse.json({ error: e.message }, { status: 403 });
    // 日付・人数バリデーションエラーは 400 として返す
    if (e instanceof Error)
      return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}

export async function PATCH(req: NextRequest) {
  const actor = await resolveAdminActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { id, ...patch } = parsed.data;
  try {
    await updateRequest(actor, id, patch);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthorizationError)
      return NextResponse.json({ error: e.message }, { status: 403 });
    if (e instanceof Error)
      return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
