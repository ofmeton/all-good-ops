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
    price_exclude_tax?: number | null;
    delivery_days: number;
    description_md?: string | null;
    estimate_md?: string | null;
    milestones_json?: string | null;
    options_json?: string | null;
  };
  updateProposal(jobId, {
    body_md: body.body_md,
    product_line: body.product_line,
    price: body.price,
    price_exclude_tax: body.price_exclude_tax ?? Math.ceil(body.price / 1.1),
    delivery_days: body.delivery_days,
    description_md: body.description_md ?? null,
    estimate_md: body.estimate_md ?? null,
    milestones_json: body.milestones_json ?? null,
    options_json: body.options_json ?? null,
  });
  return NextResponse.json({ ok: true });
}
