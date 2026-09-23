// app/api/code-lookup/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  // 0.01 U = 10000000000000000 wei (18 decimals)
  const rawAmountWei = "10000000000000000";

  return NextResponse.json({
    success: true,
    amountRequired: rawAmountWei,
  });
}