export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

const CHAIN_IDS = [56, 8453, 1, 137, 143, 97, 11155111];

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const tokenId = searchParams.get('tokenId');

  if (!tokenId) {
    return NextResponse.json({ error: 'Missing tokenId' }, { status: 400 });
  }

  for (const chainId of CHAIN_IDS) {
    try {
      const res = await fetch(
        `https://api.8004scan.io/api/v1/agents/${chainId}/${tokenId}`,
        {
          headers: {
            Accept: 'application/json',
            ...(process.env.EIGHTSCAN_API_KEY
              ? { 'X-API-Key': process.env.EIGHTSCAN_API_KEY }
              : {}),
          },
          cache: 'no-store',
        }
      );

      // Stop immediately if rate limited
      if (res.status === 429) {
        return NextResponse.json(
          {
            success: false,
            error: 'Rate limited by 8004scan. Wait a minute and try again.',
          },
          { status: 429 }
        );
      }

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          return NextResponse.json({ success: true, data: json.data });
        }
      }
    } catch (err) {
      console.error(`Chain ${chainId} lookup failed:`, err);
    }

    // Small delay to avoid bursting the rate limit
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  return NextResponse.json(
    {
      success: false,
      error: `Agent #${tokenId} not found on any supported network.`,
    },
    { status: 404 }
  );
}