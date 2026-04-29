import { NextResponse } from 'next/server';
import { updateJobStatus } from '@/lib/db';

export const runtime = 'nodejs';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const body = (await req.json()) as { status: string; note?: string };
  updateJobStatus(jobId, body.status, body.note);
  return NextResponse.json({ ok: true });
}
