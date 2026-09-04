import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { APP_CONFIG } from "../src/js/config.js";
import { OKXMarketClient } from "../src/js/exchanges/okx.js";
import { analyzeCandidate, selectCandidates } from "../src/js/services/decision-engine.js";
import { buildTradePlan, calculateRisk } from "../src/js/services/risk-engine.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const activeFiles = await collectActiveFiles([
  resolve(root, "server.js"),
  resolve(root, "src/js/app.js")
]);

for (const file of activeFiles) {
  execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
}

assert.equal(APP_CONFIG.version, "0.3.3");

let normalizedTicker;
const okx = new OKXMarketClient({
  onTicker(ticker) {
    normalizedTicker = ticker;
  }
});
okx.handleMessage(JSON.stringify({
  arg: { channel: "tickers", instId: "BTC-USDT-SWAP" },
  data: [{ last: "100", open24h: "90", volCcy24h: "10", ts: "1000" }]
}));
assert.equal(normalizedTicker.volume24h, 10);
assert.equal(normalizedTicker.volumeNotional24h, 1_000, "OKX base volume must be converted to USDT notional");

const now = 20_000;
const marketRows = {
  HIGH_PRICE: row({ symbol: "HIGH_PRICE", price: 100, volume24h: 10, volumeNotional24h: 1_000, tickerUpdatedAt: 10_000 }),
  HIGH_BASE_QTY: row({ symbol: "HIGH_BASE_QTY", price: 1, volume24h: 100, volumeNotional24h: 100, tickerUpdatedAt: 10_000 }),
  STALE: row({ symbol: "STALE", price: 1_000, volume24h: 1_000, volumeNotional24h: 1_000_000, tickerUpdatedAt: 1_000 })
};
const candidates = selectCandidates(marketRows, 12, { now, staleAfterMs: 15_000 });
assert.deepEqual(candidates.map(item => item.symbol), ["HIGH_PRICE", "HIGH_BASE_QTY"]);
assert.equal(candidates.some(item => item.symbol === "STALE"), false, "Stale ticker must not enter candidates");

const freshData = row({
  symbol: "BTC",
  price: 100,
  change24h: 4,
  volumeNotional24h: 1_000_000,
  tickerUpdatedAt: 19_000,
  candles: [{ close: 96 }, { close: 98 }, { close: 101 }, { close: 103 }],
  candleUpdatedAt: 19_000,
  oiUsd: 2_000,
  oiChangePct: 1,
  oiUpdatedAt: 19_000,
  fundingRate: 0.0001,
  fundingUpdatedAt: 19_000
});
const freshnessOptions = {
  now,
  tickerStaleAfterMs: 15_000,
  candleStaleAfterMs: 15_000,
  oiStaleAfterMs: 15_000,
  fundingStaleAfterMs: 15_000
};
const freshDecision = analyzeCandidate(freshData, freshnessOptions);
assert.equal(freshDecision.side, "LONG");
assert.equal(freshDecision.completeness, 3);

const staleTickerDecision = analyzeCandidate({
  ...freshData,
  change24h: 999,
  tickerUpdatedAt: 1_000
}, freshnessOptions);
assert.equal(staleTickerDecision.side, "WAIT");
assert.equal(staleTickerDecision.score < freshDecision.score, true, "Stale ticker momentum must be excluded");

const staleCandleDecision = analyzeCandidate({ ...freshData, candleUpdatedAt: 1_000 }, freshnessOptions);
const missingCandleDecision = analyzeCandidate({ ...freshData, candles: [], candleUpdatedAt: null }, freshnessOptions);
assert.equal(staleCandleDecision.score, missingCandleDecision.score, "Stale candle factor must be excluded");

const staleOiDecision = analyzeCandidate({ ...freshData, oiChangePct: 999, oiUpdatedAt: 1_000 }, freshnessOptions);
const neutralOiDecision = analyzeCandidate({ ...freshData, oiChangePct: 0, oiUpdatedAt: 19_000 }, freshnessOptions);
assert.equal(staleOiDecision.score, neutralOiDecision.score, "Stale OI factor must be excluded");

const staleFundingDecision = analyzeCandidate({ ...freshData, fundingRate: -1, fundingUpdatedAt: 1_000 }, freshnessOptions);
const neutralFundingDecision = analyzeCandidate({ ...freshData, fundingRate: 0, fundingUpdatedAt: 19_000 }, freshnessOptions);
assert.equal(staleFundingDecision.score, neutralFundingDecision.score, "Stale Funding factor must be excluded");

const insufficientDecision = analyzeCandidate({
  ...freshData,
  oiUsd: null,
  oiUpdatedAt: null,
  fundingRate: null,
  fundingUpdatedAt: null
}, freshnessOptions);
assert.equal(insufficientDecision.side, "WAIT", "Insufficient fresh enrichment must remain WAIT");

const plan = buildTradePlan({ side: freshDecision.side, trigger: freshDecision.price, timeframe: "15m" });
const risk = calculateRisk({
  side: plan.side,
  entry: plan.entry,
  stopLoss: plan.stopLoss,
  tp1: plan.tp1,
  tp2: plan.tp2,
  tp3: plan.tp3,
  margin: 100,
  leverage: 2
});
assert.equal(risk.isValid, true);

for (const file of activeFiles) {
  const source = (await readFile(file, "utf8")).toLowerCase();
  assert.equal(source.includes("localstorage"), false, `localStorage found in ${file}`);
  assert.equal(source.includes("sessionstorage"), false, `sessionStorage found in ${file}`);
  assert.equal(source.includes("/trade/order"), false, `Order route found in ${file}`);
}

console.log(`OK: ${activeFiles.size} active production JavaScript files parsed`);
console.log("OK: active production imports resolve");
console.log("OK: stale ticker exclusion and USDT notional candidate ranking passed");
console.log("OK: stale candle, OI and Funding factors are excluded");
console.log("OK: insufficient data returns WAIT and Risk Engine smoke test passed");
console.log("OK: active frontend has no browser storage or order route");

function row(overrides) {
  return {
    symbol: "TEST",
    price: null,
    change24h: 0,
    volume24h: null,
    volumeNotional24h: null,
    tickerUpdatedAt: null,
    candles: [],
    candleUpdatedAt: null,
    oiUsd: null,
    oiChangePct: null,
    oiUpdatedAt: null,
    fundingRate: null,
    fundingUpdatedAt: null,
    ...overrides
  };
}

async function collectActiveFiles(entries) {
  const files = new Set();

  async function visit(file) {
    if (files.has(file)) return;
    const fileStat = await stat(file).catch(() => null);
    assert(fileStat?.isFile(), `Missing active module ${file}`);
    files.add(file);

    const source = await readFile(file, "utf8");
    for (const match of source.matchAll(/(?:from\s+|import\s*)["'](\.[^"']+)["']/g)) {
      await visit(resolve(dirname(file), match[1]));
    }
  }

  for (const entry of entries) await visit(entry);
  return files;
}
