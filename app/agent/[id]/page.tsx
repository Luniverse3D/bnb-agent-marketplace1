"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type Agent = {
  id: string;
  agent_id: string;
  token_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  owner_address: string;
  total_score: number;
  star_count: number;
  x402_supported: boolean;
  supported_protocols: string[];
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  chain_id: number;
  contract_address: string;
};

export default function AgentDetail() {
  const params = useParams();
  const tokenId = params?.id as string;

  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tokenId) return;

    async function fetchAgent() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/8004scan/agents/56/${tokenId}`
        );
        if (!res.ok) throw new Error(`API returned ${res.status}`);
        const json = await res.json();
        if (!json.success) throw new Error(json.message || "Agent not found");
        setAgent(json.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchAgent();
  }, [tokenId]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-5">
          <Link
            href="/"
            className="text-sm text-zinc-400 hover:text-zinc-200 inline-flex items-center gap-1"
          >
            ← Back to marketplace
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {loading && (
          <div className="text-center py-20 text-zinc-400">
            Loading agent...
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
            <h2 className="text-red-400 font-semibold mb-2">
              Could not load agent
            </h2>
            <p className="text-sm text-red-300/80">{error}</p>
            <p className="text-xs text-zinc-500 mt-3">
              Token ID: {tokenId}
            </p>
            <Link
              href="/"
              className="inline-block mt-4 px-4 py-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 text-sm"
            >
              Return to marketplace
            </Link>
          </div>
        )}

        {agent && !loading && (
          <>
            <div className="mb-8">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <h1 className="text-3xl font-bold tracking-tight mb-2">
                    {agent.name || `Agent #${agent.token_id}`}
                  </h1>
                  <a
                    href={`https://bscscan.com/address/${agent.owner_address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-zinc-400 font-mono hover:text-zinc-200"
                  >
                    Owned by {agent.owner_address}
                  </a>
                </div>
                <div className="flex gap-2">
                  {agent.is_verified && (
                    <span className="text-xs bg-blue-500/20 text-blue-400 px-3 py-1 rounded">
                      Verified
                    </span>
                  )}
                  {agent.x402_supported && (
                    <span className="text-xs bg-green-500/20 text-green-400 px-3 py-1 rounded">
                      x402 Payments
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
                <div className="text-xs text-zinc-500 uppercase tracking-wide mb-1">
                  Reputation Score
                </div>
                <div className="text-2xl font-bold text-amber-400">
                  {agent.total_score}
                </div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
                <div className="text-xs text-zinc-500 uppercase tracking-wide mb-1">
                  Stars
                </div>
                <div className="text-2xl font-bold">{agent.star_count}</div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
                <div className="text-xs text-zinc-500 uppercase tracking-wide mb-1">
                  Chain ID
                </div>
                <div className="text-2xl font-bold font-mono">
                  {agent.chain_id}
                </div>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-3">
                Description
              </h2>
              <p className="text-zinc-200 leading-relaxed whitespace-pre-wrap">
                {agent.description || "No description provided."}
              </p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-3">
                On-chain Details
              </h2>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">Token ID</dt>
                  <dd className="font-mono text-zinc-300">{agent.token_id}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">Agent ID</dt>
                  <dd className="font-mono text-zinc-300 text-xs break-all text-right">
                    {agent.agent_id}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">Contract</dt>
                  <dd className="font-mono text-zinc-300 text-xs break-all text-right">
                    {agent.contract_address}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">Created</dt>
                  <dd className="text-zinc-300">
                    {new Date(agent.created_at).toLocaleString()}
                  </dd>
                </div>
                {agent.supported_protocols.length > 0 && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-zinc-500">Protocols</dt>
                    <dd className="text-zinc-300">
                      {agent.supported_protocols.join(", ")}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-4">
                Hire this agent
              </h2>
              <p className="text-sm text-zinc-400 mb-4">
                The hiring flow is coming next. When ready, you&apos;ll be able
                to send a job request and pay in USDC via x402.
              </p>
              <button
                disabled
                className="w-full py-3 bg-zinc-800 text-zinc-500 rounded-lg font-medium cursor-not-allowed"
              >
                Hire (coming soon)
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}