import { NextResponse } from 'next/server';
import { getDeal, recordDeal } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const deal = getDeal(jobId);
  if (!deal) return NextResponse.json({ deal: null });
  return NextResponse.json({ deal });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const body = (await req.json()) as {
    contract_amount?: number;
    delivery_due?: string | null;
    client_contact?: string | null;
    product_line_actual?: string | null;
    notes?: string | null;
  };
  const amount = Number(body.contract_amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json(
      { error: 'contract_amount is required and must be positive' },
      { status: 400 }
    );
  }
  try {
    recordDeal(jobId, {
      contract_amount: amount,
      delivery_due: body.delivery_due ?? null,
      client_contact: body.client_contact ?? null,
      product_line_actual: body.product_line_actual ?? null,
      notes: body.notes ?? null,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true });
}
