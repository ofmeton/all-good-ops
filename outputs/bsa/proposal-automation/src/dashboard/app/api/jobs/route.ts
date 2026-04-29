import { NextResponse } from 'next/server';
import { getTodaysSummary } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const jobs = getTodaysSummary();
  return NextResponse.json({ jobs });
}
