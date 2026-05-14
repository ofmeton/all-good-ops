import { NextResponse } from 'next/server';
import { getDb, updateJobStatus } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const row = getDb()
    .prepare('SELECT status, updated_at FROM jobs WHERE job_id = ?')
    .get(jobId) as { status: string; updated_at: string } | undefined;
  if (!row) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  return NextResponse.json({ status: row.status, updated_at: row.updated_at });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const body = (await req.json()) as { status: string; note?: string };
  updateJobStatus(jobId, body.status, body.note);
  return NextResponse.json({ ok: true });
}
