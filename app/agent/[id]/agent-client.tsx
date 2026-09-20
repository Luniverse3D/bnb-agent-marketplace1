"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";

const CHAIN_NAMES: Record<number, string> = {
  56: "BSC",
  8453: "Base",
  1: "Ethereum",
  137: "Polygon",
  143: "Monad",
  97: "BSC Testnet",
  11155111: "Ethereum Sepolia",
};

type AgentDetail = {
  token_id: string;
  chain_id: number;
  name: string;
  description: string | null;
  owner_address: string;
  total_score: number;
  star_count: number;
  x402_supported: boolean;
  supported_protocols: string[];
  is_verified: boolean;
};

export function AgentClient({ agent }: { agent: AgentDetail }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            ← Back to marketplace
          </Link>
          <ConnectButton />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold tracking-tight truncate">
                {agent.name || `Agent #${agent.token_id}`}
              </h1>
              <a
                href={`https://bscscan.com/address/${agent.owner_address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-zinc-500 font-mono hover:text-zinc-300 inline-block mt-1"
              >
                {agent.owner_address}
              </a>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              {agent.is_verified && (
                <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                  Verified
                </span>
              )}
              {agent.x402_supported && (
                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                  x402
                </span>
              )}
            </div>
          </div>

          <p className="text-zinc-300 mb-6 whitespace-pre-wrap">
            {agent.description || "No description provided."}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-zinc-800 pt-4">
            <div>
              <div className="text-xs text-zinc-500 uppercase tracking-wide">Reputation</div>
              <div className="text-lg font-mono text-zinc-200">{agent.total_score}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-500 uppercase tracking-wide">Stars</div>
              <div className="text-lg font-mono text-zinc-200">{agent.star_count}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-500 uppercase tracking-wide">Chain</div>
              <div className="text-lg font-mono text-zinc-200">
                {CHAIN_NAMES[agent.chain_id] || `Chain ${agent.chain_id}`}
              </div>
            </div>
            <div>
              <div className="text-xs text-zinc-500 uppercase tracking-wide">Token ID</div>
              <div className="text-lg font-mono text-zinc-200">{agent.token_id}</div>
            </div>
          </div>
        </div>

        {agent.supported_protocols && agent.supported_protocols.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-3">
              Supported Protocols
            </h2>
            <div className="flex flex-wrap gap-2">
              {agent.supported_protocols.map((protocol) => (
                <span
                  key={protocol}
                  className="text-xs bg-zinc-800 text-zinc-300 px-3 py-1 rounded"
                >
                  {protocol}
                </span>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}