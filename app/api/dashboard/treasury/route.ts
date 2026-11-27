import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    totalRewards: 12,
    totalStock: 145,
    pendingRedemptions: 4,
    approvedDeliveries: 38,
  });
}

