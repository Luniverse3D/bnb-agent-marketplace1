import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';

const OC_API_KEY = process.env.OC_API_KEY!;
const OC_SECRET_KEY = process.env.OC_SECRET_KEY!;
const PAY_TO = process.env.PAY_TO_ADDRESS!;
const B402_BASE = 'https://web3.binance.com';
const U_TOKEN = '0xcE24439F2D9C6a2289F741120FE202248B666666';

async function b402Post(operation: string, body: any) {
  const requestPath = `/build/api/v2/b402/${operation}`;
  const rawBody = JSON.stringify({ body });
  const timestamp = new Date().toISOString();
  const preHash = timestamp + 'POST' + requestPath + rawBody;
  const signature = crypto
    .createHmac('sha256', OC_SECRET_KEY)
    .update(preHash, 'utf8')
    .digest('base64');

  const res = await fetch(`${B402_BASE}${requestPath}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-OC-APIKEY': OC_API_KEY,
      'X-OC-TIMESTAMP': timestamp,
      'X-OC-SIGN': signature,
    },
    body: rawBody,
  });
  return res.json();
}

export async function GET(request: NextRequest) {
  // 1. Build payment requirements
  const requirements = {
    x402Version: 2,
    scheme: 'exact',
    network: 'eip155:56',
    payTo: PAY_TO,
    asset: U_TOKEN,
    maxAmountRequired: '100000000000000000', // 0.1 U (18 decimals)
    extra: {
      name: 'United Stables',
      version: '1',
      assetTransferMethod: 'eip3009',
    },
  };

  // 2. Check for payment signature
  const paymentHeader = request.headers.get('X-PAYMENT');

  if (!paymentHeader) {
    return NextResponse.json(
      { error: 'Payment required' },
      {
        status: 402,
        headers: {
          'X-PAYMENT-REQUIREMENTS': JSON.stringify(requirements),
        },
      }
    );
  }

  // 3. Verify + Settle via B402
  try {
    const paymentPayload = JSON.parse(paymentHeader);

    // Verify
    const verification = await b402Post('verify', {
      paymentPayload,
      paymentRequirements: requirements,
    });

    if (verification.code !== '000000000' || !verification.data?.isValid) {
      return NextResponse.json(
        { error: 'Invalid payment', details: verification },
        { status: 402 }
      );
    }

    // Settle
    const settlement = await b402Post('settle', {
      paymentPayload,
      paymentRequirements: requirements,
    });

    if (settlement.code !== '000000000' || !settlement.data?.success) {
      return NextResponse.json(
        { error: 'Settlement failed', details: settlement },
        { status: 402 }
      );
    }

    // 4. Payment confirmed — read optional query parameters
    const { searchParams } = new URL(request.url);
    const tokenId = searchParams.get('tokenId');
    const limit = searchParams.get('limit') || '1000';
    const page = searchParams.get('page') || '1';

    let fetchUrl = `https://8004scan.io/api/v1/public/agents?limit=${limit}&page=${page}`;

    // If a specific tokenId search is requested
    if (tokenId) {
      fetchUrl = `https://8004scan.io/api/v1/public/agents?search=${tokenId}`;
    }

    const agentsRes = await fetch(fetchUrl);
    const agentsJson = await agentsRes.json();

    if (!agentsJson.success) {
      return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
    }

    const headers = ['Name', 'Token ID', 'Owner', 'Score', 'x402', 'Description'];
    const rows = (agentsJson.data || []).map((agent: any) => [
      `"${(agent.name || '').replace(/"/g, '""')}"`,
      agent.token_id,
      agent.owner_address,
      agent.total_score,
      agent.x402_supported ? 'Yes' : 'No',
      `"${(agent.description || '').replace(/"/g, '""')}"`,
    ]);

    const csv = [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="agents.csv"',
        'X-PAYMENT-RESPONSE': JSON.stringify(settlement.data),
      },
    });
  } catch (error) {
    console.error('Payment processing error:', error);
    return NextResponse.json(
      { error: 'Payment processing failed' },
      { status: 500 }
    );
  }
}