'use client';

import React, { useState } from 'react';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function AgentDetailPage({ params }: PageProps) {
  // Unwrap Next.js 15+ async params via React.use
  const { id: tokenId } = React.use(params);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [paymentReqs, setPaymentReqs] = useState<any | null>(null);

  // Trigger CSV Export & x402 0.01 U Payment Challenge
  async function handleExportCSV() {
    setLoading(true);
    setErrorMsg(null);
    setPaymentReqs(null);

    try {
      // 1. Fetch agent export API endpoint
      const res = await fetch(`/api/agent/56/${tokenId}`);

      // 2. Handle HTTP 402 Payment Challenge
      if (res.status === 402) {
        const rawHeader =
          res.headers.get('x-payment-requirements') ||
          res.headers.get('payment-required') ||
          res.headers.get('PAYMENT-REQUIRED');

        if (!rawHeader) {
          throw new Error(
            'Received 402 Payment Required, but browser could not read the payment header. Ensure Access-Control-Expose-Headers is set on server.'
          );
        }

        // Safe JSON & Base64 decoding strategy
        let parsedData: any;
        try {
          // If header is Base64 stringified
          if (rawHeader.startsWith('eyJ') || !rawHeader.trim().startsWith('{')) {
            const decoded = atob(rawHeader);
            parsedData = JSON.parse(decoded);
          } else {
            parsedData = typeof rawHeader === 'string' ? JSON.parse(rawHeader) : rawHeader;
          }
        } catch (parseError) {
          console.error('Raw header parse error:', parseError, rawHeader);
          throw new Error('Invalid payment required response format.');
        }

        console.log('Successfully parsed x402 Requirements:', parsedData);
        setPaymentReqs(parsedData);
        return;
      }

      // 3. Handle HTTP 200 OK CSV Download
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `agent-${tokenId}-export.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        return;
      }

      throw new Error(`Unexpected response code: ${res.status}`);
    } catch (err: any) {
      console.error('Export Error:', err);
      setErrorMsg(err.message || 'Failed to trigger CSV export.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px', fontFamily: 'sans-serif' }}>
      <h1>Agent #{tokenId} Details</h1>

      <div style={{ margin: '20px 0', padding: '20px', border: '1px solid #333', borderRadius: '8px' }}>
        <h3>Export Agent Data</h3>
        <p>Download programmatic analytics for Agent #{tokenId} (Requires 0.01 U payment signature).</p>

        <button
          onClick={handleExportCSV}
          disabled={loading}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#0070f3',
            color: '#fff',
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Processing...' : 'Export CSV'}
        </button>
      </div>

      {/* Error Message Display */}
      {errorMsg && (
        <div style={{ padding: '12px', color: '#ff4d4f', backgroundColor: '#fff2f0', borderRadius: '6px', marginBottom: '16px' }}>
          <strong>Error:</strong> {errorMsg}
        </div>
      )}

      {/* Payment Requirements Modal / Challenge Box */}
      {paymentReqs && (
        <div style={{ padding: '16px', backgroundColor: '#1e1e1e', color: '#fff', borderRadius: '6px' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#52c41a' }}>✓ 402 Payment Challenge Active</h4>
          <p style={{ fontSize: '14px', margin: '4px 0' }}>
            <strong>Network:</strong> {paymentReqs.network || 'eip155:56'}
          </p>
          <p style={{ fontSize: '14px', margin: '4px 0' }}>
            <strong>Amount Required:</strong> {paymentReqs.maxAmountRequired || paymentReqs.amount} wei (0.01 U)
          </p>
          <p style={{ fontSize: '14px', margin: '4px 0' }}>
            <strong>Recipient:</strong> {paymentReqs.payTo}
          </p>
          <button
            onClick={() => alert('Connect your Web3 Wallet to sign the 0.01 U authorization voucher.')}
            style={{
              marginTop: '12px',
              padding: '8px 16px',
              backgroundColor: '#52c41a',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Sign & Pay 0.01 U
          </button>
        </div>
      )}
    </main>
  );
}