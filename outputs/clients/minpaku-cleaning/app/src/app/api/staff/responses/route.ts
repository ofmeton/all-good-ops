import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { resolveActorByToken } from "@/lib/auth";
import { submitResponse } from "@/lib/db/responses";
import { StaffOnlyError } from "@/lib/db/scope";

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 形式で指定してください");

const schema = z.object({
  token: z.string().min(1),
  request_id: z.string().uuid(),
  answer: z.enum(["available", "unavailable"]),
  offered_date: dateStr.optional().nullable(),
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const actor = await resolveActorByToken(parsed.data.token);
  if (!actor || actor.role !== "staff")
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const response = await submitResponse(
      actor,
      parsed.data.request_id,
      parsed.data.answer,
      parsed.data.offered_date,
    );
    return NextResponse.json(response);
  } catch (e) {
    if (e instanceof StaffOnlyError)
      return NextResponse.json({ error: e.message }, { status: 403 });
    if (e instanceof Error)
      return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
