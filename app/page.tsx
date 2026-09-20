"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useWalletClient } from "wagmi";
import { wrapFetchWithPayment, x402Client } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { toClientEvmSigner } from "@x402/evm";

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
};

type AgentGroup = {
  representative: Agent;
  duplicates: Agent[];
  count: number;
};

type Category = "All" | "Trading" | "Analysis" | "Monitoring" | "Other";
type Quality = "featured" | "standard" | "unverified";

const CATEGORY_KEYWORDS: Record<Exclude<Category, "All" | "Other">, string[]> = {
  Trading: ["trading", "trade", "swap", "dex", "arbitrage", "market", "liquidity"],
  Analysis: ["analysis", "analyst", "signal", "sentiment", "research", "report", "insight"],
  Monitoring: ["monitor", "watch", "alert", "health", "liquidation", "risk", "guard", "protect", "defend"],
};

function categorize(agent: Agent): Category {
  const text = `${agent.name} ${agent.description ?? ""}`.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((k) => text.includes(k))) return cat as Category;
  }
  return "Other";
}

function qualityOf(agent: Agent): Quality {
  const hasRealDesc =
    agent.description &&
    agent.description.trim().length > 20 &&
    !agent.description.toLowerCase().includes(" on termix platform");
  const score = agent.total_score ?? 0;

  if (agent.x402_supported && hasRealDesc && score > 0) {
    return "featured";
  }
  if (hasRealDesc) return "standard";
  return "unverified";
}

function ExportButton() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  async function handleExport() {
    if (!walletClient || !address) return;

    setExporting(true);
    setExportError(null);

    try {
      const signer = toClientEvmSigner(walletClient as any);
      const client = new x402Client();
      client.register("eip155:56", new ExactEvmScheme(signer as any));
      const fetchWithPayment = wrapFetchWithPayment(fetch, client);

      const response = await fetchWithPayment("/api/export");

      if (!response.ok) {
        throw new Error(`Export failed with status ${response.status}`);
      }

      const csv = await response.text();
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "agents.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  if (!address) {
    return (
      <button
        disabled
        className="px-4 py-3 bg-zinc-800 text-zinc-400 rounded-lg font-medium cursor-not-allowed whitespace-nowrap"
      >
        Connect to export
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleExport}
        disabled={exporting}
        className="px-4 py-3 bg-amber-500 text-black rounded-lg font-medium hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
      >
        {exporting ? "Exporting..." : "Export CSV ($0.10)"}
      </button>
      {exportError && (
        <span className="text-xs text-red-400 max-w-xs text-right">
          {exportError}
        </span>
      )}
    </div>
  );
}

function dedupe(agents: Agent[]): AgentGroup[] {
  const map = new Map<string, Agent[]>();
  for (const a of agents) {
    const key = `${(a.name ?? "").toLowerCase().trim()}|${a.owner_address.toLowerCase()}`;
    const list = map.get(key) ?? [];
    list.push(a);
    map.set(key, list);
  }
  const groups: AgentGroup[] = [];
  for (const list of map.values()) {
    list.sort((a, b) => (b.total_score ?? 0) - (a.total_score ?? 0));
    groups.push({
      representative: list[0],
      duplicates: list.slice(1),
      count: list.length,
    });
  }
  return groups;
}

export default function Home() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<Category>("All");
  const [hideEmpty, setHideEmpty] = useState(true);
  const [dedupeOn, setDedupeOn] = useState(true);
  const [sortBy, setSortBy] = useState<"score" | "recent" | "stars">("score");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const fetchAgents = async (pageNum: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `https://8004scan.io/api/v1/public/agents?limit=50&page=${pageNum}`
      );
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const json = await res.json();
      if (!json.success) throw new Error("API returned success: false");
      setAgents(json.data);
      setHasMore(json.meta?.pagination?.hasMore ?? false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents(page);
  }, [page]);

  const processed = useMemo(() => {
    let list = [...agents];

    if (hideEmpty) {
      list = list.filter((a) => a.description && a.description.trim().length > 0);
    }

    if (category !== "All") {
      list = list.filter((a) => categorize(a) === category);
    }

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.name?.toLowerCase().includes(q) ||
          a.description?.toLowerCase().includes(q) ||
          a.owner_address?.toLowerCase().includes(q)
      );
    }

    const groups = dedupeOn
      ? dedupe(list)
      : list.map((a) => ({ representative: a, duplicates: [], count: 1 }));

    groups.sort((a, b) => {
      const ra = a.representative;
      const rb = b.representative;
      const qa = qualityOf(ra);
      const qb = qualityOf(rb);
      const rank = (q: Quality) => (q === "featured" ? 0 : q === "standard" ? 1 : 2);
      if (rank(qa) !== rank(qb)) return rank(qa) - rank(qb);

      if (sortBy === "score") return (rb.total_score ?? 0) - (ra.total_score ?? 0);
      if (sortBy === "stars") return (rb.star_count ?? 0) - (ra.star_count ?? 0);
      return new Date(rb.created_at).getTime() - new Date(ra.created_at).getTime();
    });

    return groups;
  }, [agents, search, category, hideEmpty, dedupeOn, sortBy]);

  const counts = useMemo(() => {
    const base = hideEmpty
      ? agents.filter((a) => a.description && a.description.trim().length > 0)
      : agents;
    return {
      All: base.length,
      Trading: base.filter((a) => categorize(a) === "Trading").length,
      Analysis: base.filter((a) => categorize(a) === "Analysis").length,
      Monitoring: base.filter((a) => categorize(a) === "Monitoring").length,
      Other: base.filter((a) => categorize(a) === "Other").length,
    };
  }, [agents, hideEmpty]);

  const stats = useMemo(() => {
    const all = processed.map((g) => g.representative);
    return {
      featured: all.filter((a) => qualityOf(a) === "featured").length,
      deduped: agents.length - processed.reduce((sum, g) => sum + g.count, 0),
    };
  }, [processed, agents]);

  const categories: Category[] = ["All", "Trading", "Analysis", "Monitoring", "Other"];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              BNB Agent Marketplace
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Curated discovery for AI agents on BNB Chain
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right shrink-0 hidden md:block">
              <div className="text-xs text-zinc-500 uppercase tracking-wide">
                Total indexed
              </div>
              <div className="text-lg font-mono text-zinc-300">852,844</div>
            </div>
            <ConnectButton />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <input
            type="text"
            placeholder="Search name, description, owner..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:border-zinc-600"
          >
            <option value="score">Sort: Reputation</option>
            <option value="stars">Sort: Stars</option>
            <option value="recent">Sort: Newest</option>
          </select>

          <label className="flex items-center gap-2 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-300 cursor-pointer whitespace-nowrap">
            <input
              type="checkbox"
              checked={hideEmpty}
              onChange={(e) => setHideEmpty(e.target.checked)}
              className="accent-white"
            />
            Hide empty
          </label>

          <label className="flex items-center gap-2 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-300 cursor-pointer whitespace-nowrap">
            <input
              type="checkbox"
              checked={dedupeOn}
              onChange={(e) => setDedupeOn(e.target.checked)}
              className="accent-white"
            />
            Dedupe
          </label>

          <ExportButton />
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                category === cat
                  ? "bg-white text-black"
                  : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 border border-zinc-800"
              }`}
            >
              {cat}
              <span className="ml-2 text-xs text-zinc-600">{counts[cat]}</span>
            </button>
          ))}
        </div>

        <div className="text-sm text-zinc-500 mb-6 flex flex-wrap gap-4">
          <span>
            Showing <span className="text-zinc-300">{processed.length}</span>{" "}
            unique agents
          </span>
          {dedupeOn && stats.deduped > 0 && (
            <span>
              <span className="text-zinc-300">{stats.deduped}</span> duplicates
              collapsed
            </span>
          )}
          {stats.featured > 0 && (
            <span className="text-amber-400">★ {stats.featured} featured</span>
          )}
        </div>

        {loading && (
          <div className="text-center py-20 text-zinc-400">Loading agents...</div>
        )}

        {error && (
          <div className="text-center py-20">
            <p className="text-red-400 mb-2">Error: {error}</p>
            <button
              onClick={() => fetchAgents(page)}
              className="px-4 py-2 bg-zinc-800 rounded-lg hover:bg-zinc-700"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {processed.map((group) => {
                const agent = group.representative;
                const cat = categorize(agent);
                const quality = qualityOf(agent);
                const borderClass =
                  quality === "featured"
                    ? "border-amber-500/40 hover:border-amber-500/70"
                    : quality === "standard"
                    ? "border-zinc-800 hover:border-zinc-700"
                    : "border-zinc-800/60 hover:border-zinc-700/60 opacity-75";

                return (
                  <div
                    key={agent.id}
                    className={`bg-zinc-900 border rounded-lg p-5 transition-colors flex flex-col ${borderClass}`}
                  >
                    <div className="flex items-start justify-between mb-3 gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg truncate">
                          {agent.name || `Agent #${agent.token_id}`}
                        </h3>
                        <a
                          href={`https://bscscan.com/address/${agent.owner_address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-zinc-500 font-mono truncate mt-1 hover:text-zinc-300 inline-block"
                        >
                          {agent.owner_address.slice(0, 6)}...
                          {agent.owner_address.slice(-4)}
                        </a>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {quality === "featured" && (
                          <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded">
                            ★ Featured
                          </span>
                        )}
                        {agent.is_verified && quality !== "featured" && (
                          <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">
                            Verified
                          </span>
                        )}
                        {group.count > 1 && (
                          <span className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded">
                            ×{group.count}
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-zinc-400 line-clamp-3 mb-4 flex-1">
                      {agent.description || "No description provided."}
                    </p>

                    <div className="flex items-center justify-between text-xs text-zinc-500 border-t border-zinc-800 pt-3">
                      <div className="flex gap-3">
                        <span>
                          Score:{" "}
                          <span className="text-zinc-300">
                            {agent.total_score}
                          </span>
                        </span>
                        <span className="bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">
                          {cat}
                        </span>
                      </div>
                      {agent.x402_supported && (
                        <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
                          x402
                        </span>
                      )}
                    </div>

                    <Link
                      href={`/agent/${agent.token_id}`}
                      className="w-full mt-4 py-2 bg-white text-black rounded-lg font-medium hover:bg-zinc-200 transition-colors text-center block"
                    >
                      {quality === "featured" ? "View Featured Agent" : "View Agent"}
                    </Link>
                  </div>
                );
              })}
            </div>

            {processed.length === 0 && (
              <div className="text-center py-20 text-zinc-400">
                No agents match your filters.
              </div>
            )}

            <div className="flex justify-center items-center gap-3 mt-8">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="px-4 py-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-zinc-400">Page {page}</span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasMore || loading}
                className="px-4 py-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}