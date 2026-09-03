# TICK

Crypto Market Intelligence Dashboard.

## Current Version

v0.3.1 Full Market Scanner

## Run

Node.js 20 or newer is recommended. The included server is required because BingX rejects browser-origin requests to its public REST endpoints.

```bash
node server.js
```

If npm is available, `npm start` runs the same command.

Open `http://127.0.0.1:8765`. Do not open `index.html` directly from the filesystem.

Run the local validation suite with:

```bash
node scripts/check.mjs
```

`npm run check` is also available when using npm.

## Full Symbol Universe

The scanner no longer contains a fixed symbol list.

- OKX instruments come from `GET /api/v5/public/instruments?instType=SWAP`.
- Only OKX instruments with `state=live`, `settleCcy=USDT`, and a `-USDT-SWAP` instrument ID are included.
- BingX contracts come from `GET /openApi/swap/v2/quote/contracts` through the bundled same-origin read-only proxy.
- Only active BingX USDT perpetual contracts that allow API opening are included.
- Both responses are normalized into one Symbol Universe with exchange-specific instrument IDs and common base symbols.
- Switching exchanges rebuilds the scanner from that exchange's current universe.

## Market Data

### OKX

- Public WebSocket ticker, open interest and funding channels.
- Connections and subscription requests are split into batches for a full-market universe.
- `oiUsd` uses the exchange value when available and falls back to `oiCcy × latest price` when needed.

### BingX

- Public WebSocket ticker channels, sharded across connections.
- Public REST funding snapshot.
- Round-robin public REST open-interest polling.
- The local server proxies only the three allow-listed BingX public market routes used by this app.

No API key, passphrase, API Secret, account endpoint, or authenticated trading endpoint is used or stored by the frontend.

## Scanner Pipeline

1. Load and normalize the OKX and BingX contract universes.
2. Select the active exchange's universe and create empty scanner rows.
3. Open sharded public WebSocket connections for that universe.
4. Merge incoming ticker, OI and funding changes into an in-memory patch queue.
5. Flush the queue every 200 ms and calculate rankings once per batch.
6. Throttle UI rendering to at most once every 250 ms.
7. Mark rows stale after 15 seconds without a ticker update and remove stale rows from rankings and counts.

The score remains a deterministic market heuristic based on 24-hour momentum, session OI change, and funding crowding. It is not an AI or predictive model.

## Trade Safety

Quick Trade calculates entry, stop loss, take-profit targets, position value, estimated maximum loss, and risk/reward validation. Real exchange order submission remains disabled.

`src/js/services/risk-engine.js` is unchanged in v0.3.1.

## Prototype Areas

- Signal Feed still uses mock data.
- Anomaly Radar still uses mock data.
- AI Copilot is a UI prototype and does not call an AI API.
- CVD is reserved for a later engine.

## Project Structure

```text
dashboard/
├─ index.html
├─ package.json
├─ server.js
├─ README.md
├─ assets/css/
│  ├─ app.css
│  └─ scanner.css
├─ scripts/
│  └─ check.mjs
└─ src/js/
   ├─ app.js
   ├─ config.js
   ├─ core/store.js
   ├─ data/mock-data.js
   ├─ exchanges/
   │  ├─ okx.js
   │  └─ bingx.js
   ├─ services/
   │  ├─ market-scanner.js
   │  ├─ risk-engine.js
   │  └─ symbol-universe.js
   └─ ui/
      ├─ ai-panel.js
      ├─ render.js
      ├─ scanner.js
      └─ trade-modal.js
```
