import { NextResponse } from 'next/server';
import { createGenerationRequest } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const body = (await req.json()) as { job_id: string; prompt_hint?: string };
  createGenerationRequest(body.job_id, body.prompt_hint ?? null);
  return NextResponse.json({ ok: true });
}
