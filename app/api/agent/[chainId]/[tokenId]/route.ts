import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ chainId: string; tokenId: string }> }
) {
  const { chainId, tokenId } = await params;

  const paymentHeader = request.headers.get('x-payment');

  if (!paymentHeader) {
    return NextResponse.json(
      { error: 'Payment required' },
      {
        status: 402,
        headers: {
          'x-payment-requirements': JSON.stringify({
            x402Version: 2,
            scheme: 'exact',
            network: 'eip155:56',
            payTo: '0xb9e9bf2ed7319ae625765cc3705bd0a5649c360d',
            asset: '0xcE24439F2D9C6a2289F741120FE202248B666666',
            maxAmountRequired: '10000000000000000', // 0.01 U (18 decimals)
            extra: {
              name: 'United Stables',
              version: '1',
              assetTransferMethod: 'eip3009',
            },
          }),
        },
      }
    );
  }

  return NextResponse.json({ success: true, chainId, tokenId });
}