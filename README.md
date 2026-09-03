# TICK

Crypto Market Intelligence Dashboard.

## Current Version

v0.3.0 Market Scanner

---

## Current Features

### Market Data

- OKX Public WebSocket
- BingX Public WebSocket
- Exchange switcher
- Multi-symbol scanner
- Real-time price
- 24H price change
- 24H volume

### Open Interest

OKX:

- Public WebSocket
- Real-time OI
- Session OI change

BingX:

- Public REST
- Round-robin OI polling
- OI converted to estimated USD notional

### Funding

OKX:

- Public WebSocket funding-rate channel

BingX:

- Public market REST premium index / funding data

### Market Scanner

Current scan list:

- BTC
- ETH
- SOL
- ZEC
- AAVE
- XRP
- DOGE
- LINK
- SUI

Scanner generates:

- LONG Score
- SHORT Score
- Market Bias
- Long Ranking
- Short Ranking
- Candidate Count
- Anomaly Count

### Trade

- Quick Trade UI
- Auto Entry prototype
- Auto SL
- Auto TP1
- Auto TP2
- Auto TP3
- Position Value
- Estimated Max Loss
- Risk / Reward validation

Real exchange order submission is disabled.

---

## Project Structure

```text
dashboard/
│
├─ index.html
├─ README.md
├─ .gitignore
│
├─ assets/
│  └─ css/
│     ├─ app.css
│     └─ scanner.css
│
└─ src/
   └─ js/
      │
      ├─ app.js
      ├─ config.js
      │
      ├─ core/
      │  └─ store.js
      │
      ├─ data/
      │  └─ mock-data.js
      │
      ├─ exchanges/
      │  ├─ okx.js
      │  └─ bingx.js
      │
      ├─ services/
      │  ├─ market-scanner.js
      │  └─ risk-engine.js
      │
      └─ ui/
         ├─ ai-panel.js
         ├─ render.js
         ├─ scanner.js
         └─ trade-modal.js
