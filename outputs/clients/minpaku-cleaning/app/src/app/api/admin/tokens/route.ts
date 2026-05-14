import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { resolveAdminActor } from "@/lib/supabase-auth";
import { issueToken, revokeToken, reissueToken, type TokenTarget } from "@/lib/db/tokens";
import { AuthorizationError } from "@/lib/db/scope";

const targetSchema = z.union([
  z.object({ type: z.literal("owner"), propertyId: z.string().uuid() }),
  z.object({ type: z.literal("staff"), staffId: z.string().uuid() }),
]);
const postSchema = z.object({
  action: z.enum(["issue", "reissue"]),
  target: targetSchema,
});

export async function POST(req: NextRequest) {
  const actor = await resolveAdminActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = postSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const target = parsed.data.target as TokenTarget;
  try {
    const token =
      parsed.data.action === "issue"
        ? await issueToken(actor, target)
        : await reissueToken(actor, target);
    return NextResponse.json(token);
  } catch (e) {
    if (e instanceof AuthorizationError) return NextResponse.json({ error: e.message }, { status: 403 });
    throw e;
  }
}

export async function DELETE(req: NextRequest) {
  const actor = await resolveAdminActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  try {
    await revokeToken(actor, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthorizationError) return NextResponse.json({ error: e.message }, { status: 403 });
    throw e;
  }
}
