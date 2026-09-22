import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getAgent(tokenId: string) {
  // Defaulting to BNB Chain (56)
  const chainId = 56;
  const res = await fetch(
    `https://8004scan.io/api/v1/agents/${chainId}/${tokenId}`,
    { next: { revalidate: 60 } }
  );

  if (!res.ok) {
    // Fallback search query
    const searchRes = await fetch(
      `https://8004scan.io/api/v1/public/agents?search=${tokenId}`
    );
    const searchData = await searchRes.json();
    
    if (searchData.success && searchData.data?.length > 0) {
      const match = searchData.data.find(
        (a: any) => String(a.token_id) === String(tokenId)
      );
      if (match) return match;
    }
    return null;
  }

  const json = await res.json();
  return json.data || json;
}

export default async function AgentDetailPage({ params }: PageProps) {
  const { id } = await params;
  const agent = await getAgent(id);

  if (!agent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <h1 className="text-2xl font-bold text-red-500">Agent #{id} Not Found</h1>
        <p className="mt-2 text-gray-400">
          This agent could not be found on BNB Smart Chain (Chain ID 56).
        </p>
      </div>
    );
  }

  return (
    <main className="max-w-4xl mx-auto p-6">
      <div className="border border-gray-800 rounded-lg p-6 bg-slate-900 text-white shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold">{agent.name || `Agent #${agent.token_id}`}</h1>
          <span className="px-3 py-1 bg-blue-600 rounded-full text-xs font-semibold">
            Token #{agent.token_id}
          </span>
        </div>

        <p className="text-gray-300 mb-6">{agent.description || 'No description provided.'}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm border-t border-gray-800 pt-4">
          <div>
            <span className="text-gray-500 block">Owner Address</span>
            <span className="font-mono text-xs">{agent.owner_address || 'N/A'}</span>
          </div>
          <div>
            <span className="text-gray-500 block">Total Score</span>
            <span className="font-semibold text-green-400">{agent.total_score ?? 'N/A'}</span>
          </div>
          <div>
            <span className="text-gray-500 block">x402 Payment Support</span>
            <span>{agent.x402_supported ? '✅ Enabled' : '❌ Disabled'}</span>
          </div>
        </div>
      </div>
    </main>
  );
}