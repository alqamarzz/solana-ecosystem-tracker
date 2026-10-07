# ⚡ Solana Ecosystem Telemetry Tracker

[![Daily Sync](https://github.com/alqamarzz/solana-ecosystem-tracker/actions/workflows/daily-tracker.yml/badge.svg)](https://github.com/alqamarzz/solana-ecosystem-tracker/actions/workflows/daily-tracker.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Network: Solana Mainnet](https://img.shields.io/badge/Network-Solana%20Mainnet-14F195?logo=solana)](https://solana.com)
[![Status: Automated](https://img.shields.io/badge/Sync-Every%2024h-9945FF)](https://github.com/alqamarzz/solana-ecosystem-tracker/actions)

> An automated, zero-maintenance public time-series telemetry oracle for the **Solana Blockchain Ecosystem**. Powered by **Git Scraping** via **GitHub Actions** running daily cron jobs.

---

## 📊 Live Metrics Snapshot (Updated: Wed, 07 Oct 2026 03:33:53 GMT)

| Metric | Latest Value | Context |
|---|---|---|
| **SOL Price** | **$118.14** | 24h Change: `-1.39%` |
| **Solana DeFi TVL** | **$6.60B** | Total Value Locked across Solana protocols |
| **Market Capitalization** | **$69.61B** | Circulating market value |
| **24h Trading Volume** | **$2.83B** | Global 24h SOL volume |
| **Estimated Network TPS** | **4,220 TPS** | Non-vote TPS: `~1,717 TPS` |
| **Current Epoch** | **Epoch #1051** | Progress: `16.49%` |
| **Slot Height** | **#454.10M** | Current absolute block height |
| **Lifetime Network Txs** | **556.99B** | Total lifetime processed instructions |
| **Historical Snapshots Logged** | **4 entries** | Stored in [`data/history.json`](./data/history.json) |

---

## 🚀 How to Consume This Open Data in Your App

You can query this live telemetry feed directly from any frontend, Discord bot, or Web3 backend without needing an API key:

### Direct Raw JSON Endpoint:
```bash
# Latest Snapshot:
curl -s https://raw.githubusercontent.com/alqamarzz/solana-ecosystem-tracker/main/data/latest.json

# Complete Historical Time-Series (JSON Array):
curl -s https://raw.githubusercontent.com/alqamarzz/solana-ecosystem-tracker/main/data/history.json
```

### In React / TypeScript:
```typescript
const fetchSolanaPulse = async () => {
  const res = await fetch('https://raw.githubusercontent.com/alqamarzz/solana-ecosystem-tracker/main/data/latest.json');
  const data = await res.json();
  console.log(`SOL Price: ${data.market.priceUsd}, TVL: ${data.defi.tvlUsd}, TPS: ${data.network.estimatedTps}`);
  return data;
};
```

---

## 🛠️ Architecture

```
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
```

---

## 👤 Author
**Md Alqamar Ziaul**
- Portfolio: [alqamar.dev](https://github.com/alqamarzz/portfolio)
- GitHub: [@alqamarzz](https://github.com/alqamarzz)
- Twitter: [@alqamarzz](https://x.com/alqamarzz)

*License: MIT. Open for community contributions and ecosystem integrations.*
