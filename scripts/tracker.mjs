import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const dataDir = path.join(rootDir, 'data');

async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

async function getSolanaMarketData() {
  try {
    const res = await fetchWithTimeout(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true'
    );
    if (!res.ok) throw new Error(`CoinGecko status: ${res.status}`);
    const json = await res.json();
    const data = json.solana || {};
    return {
      priceUsd: data.usd || null,
      change24hPct: data.usd_24h_change ? Number(data.usd_24h_change.toFixed(2)) : null,
      marketCapUsd: data.usd_market_cap ? Math.round(data.usd_market_cap) : null,
      volume24hUsd: data.usd_24h_vol ? Math.round(data.usd_24h_vol) : null,
    };
  } catch (err) {
    console.warn('⚠️ CoinGecko fetch failed, falling back to Binance/Jupiter public price API:', err.message);
    try {
      const binanceRes = await fetchWithTimeout('https://api.binance.com/api/v3/ticker/24hr?symbol=SOLUSDT');
      const bData = await binanceRes.json();
      return {
        priceUsd: parseFloat(bData.lastPrice) || null,
        change24hPct: parseFloat(bData.priceChangePercent) || null,
        marketCapUsd: null,
        volume24hUsd: parseFloat(bData.quoteVolume) || null,
      };
    } catch (e2) {
      console.error('All price APIs failed:', e2.message);
      return { priceUsd: null, change24hPct: null, marketCapUsd: null, volume24hUsd: null };
    }
  }
}

async function getSolanaTvl() {
  try {
    const res = await fetchWithTimeout('https://api.llama.fi/v2/chains');
    if (!res.ok) throw new Error(`DeFiLlama status: ${res.status}`);
    const chains = await res.json();
    const solana = Array.isArray(chains)
      ? chains.find((c) => c.name.toLowerCase() === 'solana')
      : null;
    return solana ? Math.round(solana.tvl) : null;
  } catch (err) {
    console.warn('⚠️ DeFiLlama TVL fetch failed:', err.message);
    return null;
  }
}

async function getSolanaRpcData() {
  const rpcEndpoints = [
    'https://api.mainnet-beta.solana.com',
    'https://solana-mainnet.rpc.extrnode.com',
  ];

  for (const rpc of rpcEndpoints) {
    try {
      const res = await fetchWithTimeout(rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([
          { jsonrpc: '2.0', id: 1, method: 'getEpochInfo' },
          { jsonrpc: '2.0', id: 2, method: 'getRecentPerformanceSamples', params: [1] },
        ]),
      });
      if (!res.ok) continue;
      const results = await res.json();
      const epochInfo = results.find((r) => r.id === 1)?.result;
      const perfSample = results.find((r) => r.id === 2)?.result?.[0];

      let tps = null;
      let nonVoteTps = null;
      if (perfSample && perfSample.samplePeriodSecs > 0) {
        tps = Math.round(perfSample.numTransactions / perfSample.samplePeriodSecs);
        nonVoteTps = Math.round((perfSample.numNonVoteTransactions || 0) / perfSample.samplePeriodSecs);
      }

      return {
        epoch: epochInfo?.epoch || null,
        slotHeight: epochInfo?.absoluteSlot || null,
        epochProgressPct: epochInfo
          ? Number(((epochInfo.slotIndex / epochInfo.slotsInEpoch) * 100).toFixed(2))
          : null,
        totalTransactions: epochInfo?.transactionCount || null,
        estimatedTps: tps,
        nonVoteTps: nonVoteTps,
      };
    } catch (err) {
      console.warn(`RPC ${rpc} failed:`, err.message);
    }
  }

  return {
    epoch: null,
    slotHeight: null,
    epochProgressPct: null,
    totalTransactions: null,
    estimatedTps: null,
    nonVoteTps: null,
  };
}

function formatCurrency(num) {
  if (num === null || num === undefined) return 'N/A';
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  return `$${num.toLocaleString('en-US')}`;
}

function formatNumber(num) {
  if (num === null || num === undefined) return 'N/A';
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  return num.toLocaleString('en-US');
}

function generateReadme(latest, historyCount) {
  const timestamp = new Date(latest.timestamp).toUTCString();
  const dateStr = latest.date;

  return `# ⚡ Solana Ecosystem Telemetry Tracker

[![Daily Sync](https://github.com/alqamarzz/solana-ecosystem-tracker/actions/workflows/daily-tracker.yml/badge.svg)](https://github.com/alqamarzz/solana-ecosystem-tracker/actions/workflows/daily-tracker.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Network: Solana Mainnet](https://img.shields.io/badge/Network-Solana%20Mainnet-14F195?logo=solana)](https://solana.com)
[![Status: Automated](https://img.shields.io/badge/Sync-Every%2024h-9945FF)](https://github.com/alqamarzz/solana-ecosystem-tracker/actions)

> An automated, zero-maintenance public time-series telemetry oracle for the **Solana Blockchain Ecosystem**. Powered by **Git Scraping** via **GitHub Actions** running daily cron jobs.

---

## 📊 Live Metrics Snapshot (Updated: ${timestamp})

| Metric | Latest Value | Context |
|---|---|---|
| **SOL Price** | **$${latest.market.priceUsd ?? 'N/A'}** | 24h Change: \`${latest.market.change24hPct >= 0 ? '+' : ''}${latest.market.change24hPct ?? 0}%\` |
| **Solana DeFi TVL** | **${formatCurrency(latest.defi.tvlUsd)}** | Total Value Locked across Solana protocols |
| **Market Capitalization** | **${formatCurrency(latest.market.marketCapUsd)}** | Circulating market value |
| **24h Trading Volume** | **${formatCurrency(latest.market.volume24hUsd)}** | Global 24h SOL volume |
| **Estimated Network TPS** | **${formatNumber(latest.network.estimatedTps)} TPS** | Non-vote TPS: \`~${formatNumber(latest.network.nonVoteTps)} TPS\` |
| **Current Epoch** | **Epoch #${latest.network.epoch ?? 'N/A'}** | Progress: \`${latest.network.epochProgressPct ?? 'N/A'}%\` |
| **Slot Height** | **#${formatNumber(latest.network.slotHeight)}** | Current absolute block height |
| **Lifetime Network Txs** | **${formatNumber(latest.network.totalTransactions)}** | Total lifetime processed instructions |
| **Historical Snapshots Logged** | **${historyCount} entries** | Stored in [\`data/history.json\`](./data/history.json) |

---

## 🚀 How to Consume This Open Data in Your App

You can query this live telemetry feed directly from any frontend, Discord bot, or Web3 backend without needing an API key:

### Direct Raw JSON Endpoint:
\`\`\`bash
# Latest Snapshot:
curl -s https://raw.githubusercontent.com/alqamarzz/solana-ecosystem-tracker/main/data/latest.json

# Complete Historical Time-Series (JSON Array):
curl -s https://raw.githubusercontent.com/alqamarzz/solana-ecosystem-tracker/main/data/history.json
\`\`\`

### In React / TypeScript:
\`\`\`typescript
const fetchSolanaPulse = async () => {
  const res = await fetch('https://raw.githubusercontent.com/alqamarzz/solana-ecosystem-tracker/main/data/latest.json');
  const data = await res.json();
  console.log(\`SOL Price: \${data.market.priceUsd}, TVL: \${data.defi.tvlUsd}, TPS: \${data.network.estimatedTps}\`);
  return data;
};
\`\`\`

---

## 🛠️ Architecture

\`\`\`
  ┌────────────────────────────────────────────────────────┐
  │       GitHub Actions Scheduled Cron (Daily 00:00 UTC)  │
  └───────────────────────────┬────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│ CoinGecko API    │ │ DeFiLlama API    │ │ Solana Mainnet   │
│ (Price & Volume) │ │ (Chain TVL)      │ │ RPC (TPS, Epoch) │
└────────┬─────────┘ └────────┬─────────┘ └────────┬─────────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              │
                              ▼
                 ┌──────────────────────────┐
                 │ Node.js Telemetry Engine │
                 └────────────┬─────────────┘
                              │
       ┌──────────────────────┴──────────────────────┐
       ▼                                             ▼
┌───────────────────────────┐         ┌───────────────────────────┐
│     data/latest.json      │         │     data/history.json     │
│ (Instant current snapshot)│         │ (Historical time-series)  │
└───────────────────────────┘         └───────────────────────────┘
\`\`\`

---

## 👤 Author
**Md Alqamar Ziaul**
- Portfolio: [alqamar.dev](https://github.com/alqamarzz/portfolio)
- GitHub: [@alqamarzz](https://github.com/alqamarzz)
- Twitter: [@alqamarzz](https://x.com/alqamarzz)

*License: MIT. Open for community contributions and ecosystem integrations.*
`;
}

async function run() {
  console.log('⚡ Starting Solana Ecosystem Telemetry Tracker...');
  await fs.mkdir(dataDir, { recursive: true });

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];

  console.log('📡 Fetching CoinGecko market stats...');
  const market = await getSolanaMarketData();

  console.log('📡 Fetching DeFiLlama TVL...');
  const tvl = await getSolanaTvl();

  console.log('📡 Fetching Solana Mainnet RPC telemetry...');
  const network = await getSolanaRpcData();

  const snapshot = {
    date: dateStr,
    timestamp: now.toISOString(),
    market: {
      priceUsd: market.priceUsd,
      change24hPct: market.change24hPct,
      marketCapUsd: market.marketCapUsd,
      volume24hUsd: market.volume24hUsd,
    },
    defi: {
      tvlUsd: tvl,
    },
    network: {
      epoch: network.epoch,
      slotHeight: network.slotHeight,
      epochProgressPct: network.epochProgressPct,
      totalTransactions: network.totalTransactions,
      estimatedTps: network.estimatedTps,
      nonVoteTps: network.nonVoteTps,
    },
  };

  // Write latest.json
  const latestPath = path.join(dataDir, 'latest.json');
  await fs.writeFile(latestPath, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');
  console.log(`✅ Saved latest snapshot to ${latestPath}`);

  // Update history.json (prevent duplicate entries for the same date)
  const historyPath = path.join(dataDir, 'history.json');
  let history = [];
  try {
    const rawHistory = await fs.readFile(historyPath, 'utf8');
    history = JSON.parse(rawHistory);
    if (!Array.isArray(history)) history = [];
  } catch {
    history = [];
  }

  const existingIndex = history.findIndex((entry) => entry.date === dateStr);
  if (existingIndex >= 0) {
    history[existingIndex] = snapshot;
  } else {
    history.push(snapshot);
  }

  // Keep history sorted chronologically
  history.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  await fs.writeFile(historyPath, JSON.stringify(history, null, 2) + '\n', 'utf8');
  console.log(`✅ Updated history.json (${history.length} entries recorded)`);

  // Regenerate README.md with live metrics
  const readmeContent = generateReadme(snapshot, history.length);
  const readmePath = path.join(rootDir, 'README.md');
  await fs.writeFile(readmePath, readmeContent, 'utf8');
  console.log(`✅ Generated updated README.md`);

  console.log('🎉 Telemetry sync completed successfully!');
}

run().catch((err) => {
  console.error('❌ Telemetry tracker failed:', err);
  process.exit(1);
});
