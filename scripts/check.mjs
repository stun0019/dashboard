import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  mergeRow,
  reconcileCandidateMembership,
  reconcileTradePlan
} from "../src/js/app.js";
import { APP_CONFIG } from "../src/js/config.js";
import { OKXMarketClient } from "../src/js/exchanges/okx.js";
import {
  analyzeCandidate,
  calculateDirectionStrength,
  calculateSetupRating,
  selectCandidates
} from "../src/js/services/decision-engine.js";
import { calculateRisk } from "../src/js/services/risk-engine.js";
import { toggleExpandedSymbol } from "../src/js/ui/focus-dashboard.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const activeFiles = await collectActiveFiles([
  resolve(root, "server.js"),
  resolve(root, "src/js/app.js")
]);

for (const file of activeFiles) {
  execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
}

assert.equal(APP_CONFIG.version, "0.4.0");

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
  oiBaselineUsd: 1_900,
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

const staleTickerDecision = analyzeCandidate({ ...freshData, change24h: 999, tickerUpdatedAt: 1_000 }, freshnessOptions);
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

// Trade plans are created once per directional setup and remain frozen.
const longPlan = reconcileTradePlan(null, { symbol: "BTC", side: "LONG", currentPrice: 100 }, 1_000);
assert.equal(longPlan.side, "LONG");
assert.equal(longPlan.createdAt, 1_000);
const updatedLong = reconcileTradePlan(longPlan, { symbol: "BTC", side: "LONG", currentPrice: 125 }, 2_000);
assert.equal(updatedLong, longPlan, "Same-side update must preserve the same plan record");
assert.equal(updatedLong.plan.entry, longPlan.plan.entry, "Entry must stay frozen while side is unchanged");
assert.equal(updatedLong.plan.stopLoss, longPlan.plan.stopLoss, "SL must stay frozen while side is unchanged");
assert.deepEqual(
  [updatedLong.plan.tp1, updatedLong.plan.tp2, updatedLong.plan.tp3],
  [longPlan.plan.tp1, longPlan.plan.tp2, longPlan.plan.tp3],
  "TP values must stay frozen while side is unchanged"
);
const shortPlan = reconcileTradePlan(longPlan, { symbol: "BTC", side: "SHORT", currentPrice: 90 }, 3_000);
assert.equal(shortPlan.side, "SHORT");
assert.notEqual(shortPlan, longPlan, "Side flip must create a new plan");
assert.equal(shortPlan.createdAt, 3_000);
assert.equal(reconcileTradePlan(shortPlan, { symbol: "BTC", side: "WAIT", currentPrice: 92 }), null);
const reenteredLong = reconcileTradePlan(null, { symbol: "BTC", side: "LONG", currentPrice: 105 }, 4_000);
assert.notEqual(reenteredLong.plan.entry, longPlan.plan.entry, "WAIT to LONG must use the new formation price");

// Candidate membership owns the OI baseline lifecycle.
const lifecycleRows = {
  BTC: row({
    symbol: "BTC",
    oiUsd: 2_000,
    oiBaselineUsd: 1_000,
    oiChangePct: 100,
    oiUpdatedAt: 19_000
  })
};
const lifecyclePlans = new Map([["BTC", longPlan]]);
let lifecycle = reconcileCandidateMembership([], ["BTC"], lifecycleRows, lifecyclePlans);
assert.deepEqual(lifecycle.entered, ["BTC"]);
assert.equal(lifecycleRows.BTC.oiBaselineUsd, null, "ENTER must reset old OI baseline");
assert.equal(lifecycleRows.BTC.oiChangePct, null);
assert.equal(lifecycleRows.BTC.oiUpdatedAt, null, "ENTER must wait for a new OI snapshot");
lifecycleRows.BTC = mergeRow(lifecycleRows.BTC, { oiUsd: 2_100, oiUpdatedAt: 21_000 });
assert.equal(lifecycleRows.BTC.oiBaselineUsd, 2_100, "First snapshot after ENTER becomes baseline");
assert.equal(lifecycleRows.BTC.oiChangePct, 0);
lifecycle = reconcileCandidateMembership(["BTC"], ["BTC"], lifecycleRows, lifecyclePlans);
assert.deepEqual(lifecycle.kept, ["BTC"]);
assert.equal(lifecycleRows.BTC.oiBaselineUsd, 2_100, "KEEP must preserve baseline");
lifecycle = reconcileCandidateMembership(["BTC"], [], lifecycleRows, lifecyclePlans);
assert.deepEqual(lifecycle.exited, ["BTC"]);
assert.equal(lifecycleRows.BTC.oiBaselineUsd, null, "EXIT must clear baseline");
assert.equal(lifecycleRows.BTC.oiChangePct, null);
assert.equal(lifecyclePlans.has("BTC"), false, "EXIT must clear the frozen trade plan");
reconcileCandidateMembership([], ["BTC"], lifecycleRows, lifecyclePlans);
lifecycleRows.BTC = mergeRow(lifecycleRows.BTC, { oiUsd: 2_500, oiUpdatedAt: 25_000 });
assert.equal(lifecycleRows.BTC.oiBaselineUsd, 2_500, "Re-entry must establish a new baseline");
assert.equal(lifecycleRows.BTC.oiChangePct, 0);

// Rating is deterministic from directional strength; WAIT never exceeds 3.
assert.equal(calculateSetupRating(50, "WAIT"), 1);
assert.equal(calculateDirectionStrength(70), 40);
assert.equal(calculateSetupRating(70, "LONG"), 3);
assert.equal(calculateSetupRating(30, "SHORT"), 3);
assert.equal(calculateSetupRating(90, "LONG"), 5);
assert.equal(calculateSetupRating(10, "SHORT"), 5);
assert.equal(calculateSetupRating(100, "WAIT"), 3);

// Accordion state is scalar: zero or one symbol can be expanded.
assert.equal(toggleExpandedSymbol(null, "BTC"), "BTC");
assert.equal(toggleExpandedSymbol("BTC", "BTC"), null);
assert.equal(toggleExpandedSymbol("BTC", "ETH"), "ETH");

const risk = calculateRisk({
  side: longPlan.plan.side,
  entry: longPlan.plan.entry,
  stopLoss: longPlan.plan.stopLoss,
  tp1: longPlan.plan.tp1,
  tp2: longPlan.plan.tp2,
  tp3: longPlan.plan.tp3,
  margin: 100,
  leverage: 2
});
assert.equal(risk.isValid, true);

for (const file of activeFiles) {
  const source = (await readFile(file, "utf8")).toLowerCase();
  assert.equal(source.includes("localstorage"), false, `localStorage found in ${file}`);
  assert.equal(source.includes("sessionstorage"), false, `sessionStorage found in ${file}`);
  assert.equal(source.includes("/trade/order"), false, `Order route found in ${file}`);
  assert.equal(source.includes("ai 解釋原因"), false, `Legacy AI label found in ${file}`);
}

console.log(`OK: ${activeFiles.size} active production JavaScript files parsed and imports resolve`);
console.log("OK: stale ticker, normalized liquidity, and stale factor checks passed");
console.log("OK: frozen trade plan lifecycle and Risk Engine smoke test passed");
console.log("OK: candidate ENTER / KEEP / EXIT / re-entry OI baseline lifecycle passed");
console.log("OK: deterministic 1–5 rating and single-card accordion state passed");
console.log("OK: active frontend has no browser storage, AI label, or order route");

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
    oiCcy: null,
    oiUsd: null,
    oiBaselineUsd: null,
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
