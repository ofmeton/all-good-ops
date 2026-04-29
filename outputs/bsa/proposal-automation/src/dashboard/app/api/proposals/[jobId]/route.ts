import { NextResponse } from 'next/server';
import { getJobWithProposal, updateProposal } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const data = getJobWithProposal(jobId);
  if (!data) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const body = (await req.json()) as {
    body_md: string;
    product_line: string;
    price: number;
    delivery_days: number;
  };
  updateProposal(
    jobId,
    body.body_md,
    body.product_line,
    body.price,
    body.delivery_days
  );
  return NextResponse.json({ ok: true });
}
