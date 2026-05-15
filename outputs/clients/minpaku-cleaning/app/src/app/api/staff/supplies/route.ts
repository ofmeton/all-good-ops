import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { resolveActorByToken } from "@/lib/auth";
import { createSupplyRequest } from "@/lib/db/supplies";

const schema = z.object({
  token: z.string().min(1),
  property_id: z.string().uuid(),
  request_id: z.string().uuid().optional(),
  items: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { token, ...input } = parsed.data;
  const actor = await resolveActorByToken(token);
  if (!actor || actor.role !== "staff")
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await createSupplyRequest(actor, input));
  } catch (e) {
    if (e instanceof Error)
      return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
