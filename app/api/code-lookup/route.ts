// app/api/code-lookup/route.ts
import { NextResponse } from 'next/server';
import { parseUnits } from 'ethers';

export async function POST(request: Request) {
  // Step 2 Logic: Calculate expected amount for 0.01 U
  const tokenDecimals = 6; 
  const rawAmount = parseUnits("0.01", tokenDecimals); 

  // ... rest of payment verification and lookup code
  return NextResponse.json({ success: true, amount: rawAmount.toString() });
}