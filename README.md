# TICK

Focused OKX opportunity scanner.

Current version: `v0.4.0`.

## What it does

```text
OKX 全市場行情
  ↓
排除 stale ticker，再依 USDT notional 流動性與 24h 波動挑出 12 個候選
  ↓
只對候選讀取 15m K 線、OI、Funding
  ↓
判斷 LONG / SHORT / WAIT
  ↓
首次形成 LONG / SHORT 時，以既有 Risk Engine 建立並鎖定 Entry / SL / TP
  ↓
顯示判斷原因摘要
```

所有 live、USDT 結算的 OKX 永續合約都會留在記憶體中持續掃描。候選篩選不會降低全市場 coverage，只減少 WebSocket enrichment 與 DOM rendering 的負擔。

## Run

Requires Node.js 20 or newer.

```bash
node server.js
```

Open `http://127.0.0.1:8765`.

## Check

```bash
node scripts/check.mjs
```

The checks cover JavaScript syntax, relative imports, full-market candidate filtering, decision generation, OI precedence, data freshness, and the unchanged Risk Engine.

## Decision model

The focused score combines:

- 15-minute candle direction
- 24-hour price momentum
- OI change from the current connection baseline
- Funding crowding

Candidate liquidity uses `volumeNotional24h = volCcy24h × price`, so contracts with different base currencies are compared on the same USDT-notional basis. Stale ticker rows cannot enter the candidate set. Stale candle, OI, or Funding values are marked excluded and contribute zero to the decision score; insufficient fresh data produces `WAIT`.

`LONG` and `SHORT` receive an Entry/SL/TP plan from `risk-engine.js`. The plan is created once and remains frozen while the symbol stays on the same side; live ticker updates change CURRENT only. A side flip creates a new plan, while WAIT or Candidate EXIT clears it. `WAIT` deliberately receives no trade plan.

Candidates render as a single vertical card list. Cards are collapsed by default; clicking opens that card in place and closes any other open card. The compact row includes current price, 24h change, USDT-notional volume, OI change, Funding, side, and a deterministic 1–5 setup rating. Expanded content shows freshness, frozen plan values, and a transparent local “判斷原因” rule summary. No external AI service is called.

OI change is scoped to Candidate membership. ENTER clears the old baseline and waits for a new OI snapshot, KEEP preserves it, and EXIT clears it so re-entry cannot inherit a previous cycle.

## Safety

- Public OKX market data only.
- No API key or Secret is stored in the frontend.
- No account endpoint is called.
- No real order can be submitted.
- `src/js/services/risk-engine.js` remains unchanged.

## Active modules

```text
index.html
assets/css/app.css
src/js/app.js
src/js/config.js
src/js/exchanges/okx.js
src/js/services/
  decision-engine.js
  risk-engine.js
  symbol-universe.js
src/js/ui/focus-dashboard.js
```

Legacy BingX, mock-data, old scanner/renderer/AI/trade-modal modules and `scanner.css` were removed because the production entry graph no longer references them.
