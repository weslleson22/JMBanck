import { NextResponse } from 'next/server';
import { checkDatabaseHealth } from '@/lib/db-health';

export const dynamic = 'force-dynamic';

export async function GET() {
  const report = await checkDatabaseHealth();
  return NextResponse.json(report, { status: report.ok ? 200 : 503 });
}
