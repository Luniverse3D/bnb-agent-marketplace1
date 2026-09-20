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
          next: { revalidate: 60 },
        }
      );

      // If rate limited, stop immediately
      if (res.status === 429) {
        return NextResponse.json(
          { success: false, error: 'Rate limited by 8004scan. Wait a minute and try again.' },
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

    // Small delay between requests to avoid hitting the rate limit
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  return NextResponse.json(
    { success: false, error: `Agent #${tokenId} not found.` },
    { status: 404 }
  );
}