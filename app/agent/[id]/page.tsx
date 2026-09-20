export const dynamic = 'force-dynamic';
export const revalidate = 0;

import Link from "next/link";
import { AgentClient } from "./agent-client";

const CHAIN_IDS = [56, 8453, 1, 137, 143, 97, 11155111];

async function fetchAgent(tokenId: string) {
  for (const chainId of CHAIN_IDS) {
    try {
      const res = await fetch(
        `https://api.8004scan.io/api/v1/agents/${chainId}/${tokenId}`,
        {
          headers: { Accept: "application/json" },
          cache: "no-store",
        }
      );

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) return json.data;
      }
    } catch (err) {
      console.warn(`Chain ${chainId} lookup failed:`, err);
    }
  }
  return null;
}

export default async function AgentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const agent = await fetchAgent(id);

  if (!agent) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center gap-4 px-6">
        <div className="text-red-400 text-center max-w-md">
          <p className="text-lg font-semibold mb-2">Could not load agent</p>
          <p className="text-sm text-zinc-400">
            Agent #{id} was not found on any supported network.
          </p>
          <p className="text-xs text-zinc-600 mt-2">Token ID: {id}</p>
        </div>
        <Link
          href="/"
          className="px-4 py-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 text-sm"
        >
          Return to marketplace
        </Link>
      </div>
    );
  }

  return <AgentClient agent={agent} />;
}