import { NextResponse, type NextRequest } from "next/server";
import { isCronAuthenticated } from "@/lib/cron-auth";
import { serverErrorResponse } from "@/lib/api-error";
import { finalizeDueOffers } from "@/lib/db/responses";

export async function GET(req: NextRequest) {
  if (!isCronAuthenticated(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await finalizeDueOffers();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return serverErrorResponse(e, "cron/finalize-offers");
  }
}
