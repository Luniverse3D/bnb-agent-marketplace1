'use client';

import React, { useState } from 'react';

// Declaration for MetaMask / Web3 provider on window
declare global {
  interface Window {
    ethereum?: any;
  }
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function AgentDetailPage({ params }: PageProps) {
  // Unwrap Next.js async params via React.use
  const { id: tokenId } = React.use(params);

  const [loading, setLoading] = useState(false);
  const [signing, setSigning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [paymentReqs, setPaymentReqs] = useState<any | null>(null);

  // Step 1: Initial Fetch to trigger 402 Challenge or direct download
  async function handleExportCSV() {
    setLoading(true);
    setErrorMsg(null);
    setPaymentReqs(null);

    try {
      const res = await fetch(`/api/agent/56/${tokenId}`);

      // Handle HTTP 402 Payment Challenge
      if (res.status === 402) {
        const rawHeader =
          res.headers.get('x-payment-requirements') ||
          res.headers.get('payment-required') ||
          res.headers.get('PAYMENT-REQUIRED');

        if (!rawHeader) {
          throw new Error(
            '402 Payment Required, but browser could not read payment headers. Ensure Access-Control-Expose-Headers is active on server.'
          );
        }

        let parsedData: any;
        try {
          if (rawHeader.startsWith('eyJ') || !rawHeader.trim().startsWith('{')) {
            parsedData = JSON.parse(atob(rawHeader));
          } else {
            parsedData = typeof rawHeader === 'string' ? JSON.parse(rawHeader) : rawHeader;
          }
        } catch (parseError) {
          console.error('Header parsing error:', parseError, rawHeader);
          throw new Error('Invalid payment required response format.');
        }

        console.log('x402 Requirements Received:', parsedData);
        setPaymentReqs(parsedData);
        return;
      }

      // If already authorized (HTTP 200)
      if (res.ok) {
        await triggerFileDownload(res);
        return;
      }

      throw new Error(`Unexpected server response: ${res.status}`);
    } catch (err: any) {
      console.error('Export Fetch Error:', err);
      setErrorMsg(err.message || 'Failed to initialize CSV export.');
    } finally {
      setLoading(false);
    }
  }

  // Helper function to trigger browser file save
  async function triggerFileDownload(response: Response) {
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agent-${tokenId}-analytics.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }

  // Step 2: Connect MetaMask and Sign EIP-3009 0.01 U Authorization
  async function handleSignAndPay() {
    if (!window.ethereum) {
      alert('MetaMask or a Web3 compatible wallet was not detected in your browser.');
      return;
    }

    setSigning(true);
    setErrorMsg(null);

    try {
      // 1. Request Wallet Connection
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const userAddress = accounts[0];

      // 2. Switch/Verify BNB Smart Chain (Chain ID 56 / 0x38)
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x38' }],
        });
      } catch (switchErr: any) {
        console.warn('Network switch warning:', switchErr);
      }

      // 3. Construct EIP-712 Typed Data for EIP-3009 (transferWithAuthorization)
      const validAfter = 0;
      const validBefore = Math.floor(Date.now() / 1000) + 3600; // 1 Hour Expiration
      const nonce =
        '0x' +
        Array.from(crypto.getRandomValues(new Uint8Array(32)))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');

      const domain = {
        name: paymentReqs?.extra?.name || 'United Stables',
        version: paymentReqs?.extra?.version || '1',
        chainId: 56,
        verifyingContract: paymentReqs?.asset || '0xcE24439F2D9C6a2289F741120FE202248B666666',
      };

      const types = {
        TransferWithAuthorization: [
          { name: 'from', type: 'address' },
          { name: 'to', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'validAfter', type: 'uint256' },
          { name: 'validBefore', type: 'uint256' },
          { name: 'nonce', type: 'bytes32' },
        ],
      };

      const message = {
        from: userAddress,
        to: paymentReqs?.payTo || '0xb9e9bf2ed7319ae625765cc3705bd0a5649c360d',
        value: paymentReqs?.maxAmountRequired || '10000000000000000', // 0.01 U
        validAfter,
        validBefore,
        nonce,
      };

      // 4. Trigger MetaMask Sign Typed Data Popup
      const signature = await window.ethereum.request({
        method: 'eth_signTypedData_v4',
        params: [
          userAddress,
          JSON.stringify({
            domain,
            types,
            primaryType: 'TransferWithAuthorization',
            message,
          }),
        ],
      });

      console.log('EIP-3009 Voucher Signature Generated:', signature);

      // 5. Package x402 V2 Header Payload
      const xPaymentPayload = btoa(
        JSON.stringify({
          x402Version: 2,
          scheme: 'exact',
          network: 'eip155:56',
          payload: {
            signature,
            authorization: message,
          },
        })
      );

      // 6. Resubmit API Request with Payment Signature
      const paidRes = await fetch(`/api/agent/56/${tokenId}`, {
        headers: {
          'x-payment': xPaymentPayload,
        },
      });

      if (paidRes.ok) {
        await triggerFileDownload(paidRes);
        setPaymentReqs(null); // Clear active challenge
      } else {
        const errJson = await paidRes.json().catch(() => ({}));
        throw new Error(errJson.error || 'Payment verification failed on backend server.');
      }
    } catch (err: any) {
      console.error('Signing Error:', err);
      setErrorMsg(err.message || 'MetaMask signature failed or was rejected.');
    } finally {
      setSigning(false);
    }
  }

  return (
    <main style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>Agent #{tokenId} Details</h1>
      <p style={{ color: '#666', marginBottom: '24px' }}>BNB Smart Chain (Chain ID: 56)</p>

      {/* CSV Export Card */}
      <div style={{ margin: '20px 0', padding: '24px', border: '1px solid #333', borderRadius: '8px', backgroundColor: '#121212', color: '#fff' }}>
        <h3 style={{ marginTop: 0 }}>Export CSV Analytics</h3>
        <p style={{ color: '#aaa', fontSize: '14px' }}>
          Download structured data for Agent #{tokenId}. Access requires a 0.01 U programmatic micro-payment authorization.
        </p>

        <button
          onClick={handleExportCSV}
          disabled={loading || signing}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            backgroundColor: '#0070f3',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 'bold',
            cursor: loading || signing ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Requesting 402 Challenge...' : 'Export CSV'}
        </button>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div style={{ padding: '14px', color: '#ff4d4f', backgroundColor: '#2a1215', border: '1px solid #5c1d24', borderRadius: '6px', marginBottom: '20px' }}>
          <strong>Error:</strong> {errorMsg}
        </div>
      )}

      {/* Active x402 Payment Challenge & MetaMask Trigger Box */}
      {paymentReqs && (
        <div style={{ padding: '20px', backgroundColor: '#1a271d', border: '1px solid #27492c', color: '#fff', borderRadius: '8px' }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#52c41a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>✓</span> 402 Payment Challenge Active
          </h4>
          <p style={{ fontSize: '14px', margin: '6px 0', color: '#ccc' }}>
            <strong>Network:</strong> {paymentReqs.network || 'eip155:56'} (BNB Chain)
          </p>
          <p style={{ fontSize: '14px', margin: '6px 0', color: '#ccc' }}>
            <strong>Price:</strong> 0.01 U ({paymentReqs.maxAmountRequired || '10000000000000000'} wei)
          </p>
          <p style={{ fontSize: '14px', margin: '6px 0', color: '#ccc', wordBreak: 'break-all' }}>
            <strong>Recipient Address:</strong> {paymentReqs.payTo}
          </p>

          <button
            onClick={handleSignAndPay}
            disabled={signing}
            style={{
              marginTop: '16px',
              padding: '12px 20px',
              backgroundColor: '#52c41a',
              color: '#000',
              border: 'none',
              borderRadius: '6px',
              cursor: signing ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              fontSize: '15px',
            }}
          >
            {signing ? 'Awaiting MetaMask Signature...' : 'Sign 0.01 U Voucher in MetaMask'}
          </button>
        </div>
      )}
    </main>
  );
}