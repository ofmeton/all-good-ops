import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { resolveAdminActor } from "@/lib/supabase-auth";
import { AuthorizationError } from "@/lib/db/scope";
import {
  addIcalFeed,
  listIcalFeeds,
  removeIcalFeed,
} from "@/lib/db/reservations";

const paramsSchema = z.object({ id: z.string().uuid() });
const createSchema = z.object({
  url: z.string().url(),
  ota_label: z.string().trim().max(80).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await resolveAdminActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsedParams = paramsSchema.safeParse(await params);
  if (!parsedParams.success)
    return NextResponse.json({ error: "id が不正です" }, { status: 400 });
  try {
    return NextResponse.json(await listIcalFeeds(actor, parsedParams.data.id));
  } catch (e) {
    if (e instanceof AuthorizationError)
      return NextResponse.json({ error: e.message }, { status: 403 });
    throw e;
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await resolveAdminActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsedParams = paramsSchema.safeParse(await params);
  if (!parsedParams.success)
    return NextResponse.json({ error: "id が不正です" }, { status: 400 });
  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  try {
    return NextResponse.json(
      await addIcalFeed(
        actor,
        parsedParams.data.id,
        parsed.data.url,
        parsed.data.ota_label,
      ),
    );
  } catch (e) {
    if (e instanceof AuthorizationError)
      return NextResponse.json({ error: e.message }, { status: 403 });
    if (e instanceof Error)
      return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}

export async function DELETE(req: NextRequest) {
  const actor = await resolveAdminActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const feedId = new URL(req.url).searchParams.get("feedId");
  if (!feedId || !z.string().uuid().safeParse(feedId).success)
    return NextResponse.json({ error: "feedId が不正です" }, { status: 400 });
  try {
    await removeIcalFeed(actor, feedId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthorizationError)
      return NextResponse.json({ error: e.message }, { status: 403 });
    throw e;
  }
}
