import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ chainId: string; tokenId: string }> }
) {
  const { chainId, tokenId } = await params;

  // 1. Extract payment header from request
  const paymentHeader =
    request.headers.get('x-payment') ||
    request.headers.get('payment') ||
    request.headers.get('authorization');

  // 2. If no payment header provided, return 402 Challenge
  if (!paymentHeader) {
    return NextResponse.json(
      { error: 'Payment required' },
      {
        status: 402,
        headers: {
          'Access-Control-Expose-Headers': 'x-payment-requirements, payment-required',
          'x-payment-requirements': JSON.stringify({
            x402Version: 2,
            scheme: 'exact',
            network: 'eip155:56',
            payTo: '0xb9e9bf2ed7319ae625765cc3705bd0a5649c360d',
            asset: '0xcE24439F2D9C6a2289F741120FE202248B666666',
            maxAmountRequired: '10000000000000000', // 0.01 U
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

  // 3. Process incoming signed x402 payment voucher
  try {
    const decodedPayload = JSON.parse(Buffer.from(paymentHeader, 'base64').toString('utf-8'));
    console.log('Received x402 payment voucher:', decodedPayload);

    const { signature, authorization } = decodedPayload.payload || {};

    if (!signature || !authorization) {
      return NextResponse.json(
        { error: 'Invalid payment authorization payload' },
        { status: 400 }
      );
    }

    // Verify voucher constraints (e.g. valid recipient and amount)
    if (
      authorization.to.toLowerCase() !== '0xb9e9bf2ed7319ae625765cc3705bd0a5649c360d'.toLowerCase() ||
      authorization.value !== '10000000000000000'
    ) {
      return NextResponse.json(
        { error: 'Payment authorization parameters do not match required pricing' },
        { status: 400 }
      );
    }

    // 4. Return unlocked CSV data stream/file
    const csvContent = `agent_id,chain_id,status,exported_at\n${tokenId},${chainId},active,${new Date().toISOString()}`;

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="agent-${tokenId}-analytics.csv"`,
      },
    });
  } catch (err: any) {
    console.error('Backend voucher processing error:', err);
    return NextResponse.json(
      { error: 'Failed to verify x402 voucher signature' },
      { status: 400 }
    );
  }
}