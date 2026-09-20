import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const tokenId = searchParams.get('tokenId');

  if (!tokenId) {
    return NextResponse.json({ error: 'Missing tokenId' }, { status: 400 });
  }

  const chainIds = [56, 8453, 1, 137, 143, 97, 11155111];

  for (const chainId of chainIds) {
    try {
      const res = await fetch(
        `https://api.8004scan.io/api/v1/public/agents/${chainId}/${tokenId}`,
        {
          headers: { 'Accept': 'application/json' },
          // Cache for 60 seconds to avoid rate limiting
          next: { revalidate: 60 },
        }
      );

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          return NextResponse.json({ success: true, data: json.data });
        }
      }
    } catch (err) {
      console.error(`Chain ${chainId} lookup failed:`, err);
    }
  }

  return NextResponse.json(
    { success: false, error: `Agent #${tokenId} not found on any supported chain.` },
    { status: 404 }
  );
}