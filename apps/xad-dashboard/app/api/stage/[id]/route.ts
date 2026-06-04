import { NextResponse } from "next/server";
import { recentTracesForStage } from "@/lib/queries";
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json(await recentTracesForStage(id, 20).catch(() => []));
}
