import { NextRequest, NextResponse } from "next/server";
import { callB402 } from "./lib/b402-client";

export async function middleware(req: NextRequest) {
  if (!req.nextUrl.pathname.startsWith("/api/export")) {
    return NextResponse.next();
  }

  const paymentHeader = req.headers.get("X-PAYMENT") || req.headers.get("PAYMENT-SIGNATURE");

  // No payment provided — return 402 with requirements
  if (!paymentHeader) {
    const supported = await callB402("supported", {});
    
    // Find USDC exact on BSC
    const usdcExact = supported.data?.kinds?.find(
      (k: any) => k.network === "eip155:56" && 
                  k.extra?.name === "USD Coin" && 
                  k.scheme === "exact"
    );

    return NextResponse.json(
      {
        x402Version: 2,
        accepts: [
          {
            scheme: "exact",
            network: "eip155:56",
            maxAmountRequired: "100000000000000000", // $0.10 USDC (6 decimals)
            resource: req.nextUrl.toString(),
            description: "CSV export of BNB agent data",
            mimeType: "text/csv",
            payTo: process.env.PAY_TO_ADDRESS,
            maxTimeoutSeconds: 60,
            asset: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", // USDC on BSC
            extra: usdcExact?.extra || {},
          },
        ],
      },
      { status: 402 }
    );
  }

  // Payment provided — verify and settle
  try {
    const paymentPayload = JSON.parse(
      Buffer.from(paymentHeader, "base64").toString("utf-8")
    );

    const verifyResult = await callB402("verify", paymentPayload);
    if (verifyResult.code !== "000000000") {
      return NextResponse.json(
        { error: "Payment verification failed", detail: verifyResult },
        { status: 402 }
      );
    }

    const settleResult = await callB402("settle", paymentPayload);
    if (settleResult.code !== "000000000") {
      return NextResponse.json(
        { error: "Payment settlement failed", detail: settleResult },
        { status: 402 }
      );
    }

	// Express / x402 Route Middleware
	app.use('/api/code-lookup', x402Protection({
  	payTo: '0xYourReceivingWalletAddress...',
  	maxAmountRequired: '0.01', // Lowered quote amount to 0.01 U
  	asset: '0xYourTokenAddress...',    // e.g. USDC, USDT, USD1, or U contract
  	network: 'base-mainnet'            // or 'bsc-mainnet' / 'polygon-mainnet'
    }));

    // Payment settled — allow request through
    const response = NextResponse.next();
    response.headers.set("X-PAYMENT-RESPONSE", settleResult.data?.txHash || "settled");
    return response;
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid payment payload", detail: String(err) },
      { status: 402 }
    );
  }
}

export const config = {
  matcher: ["/api/export/:path*"],
};