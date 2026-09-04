import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { APP_CONFIG } from "../src/js/config.js";
import { BingXMarketClient } from "../src/js/exchanges/bingx.js";
import { analyzeCandidate, selectCandidates } from "../src/js/services/decision-engine.js";
import {
  analyzeScannerRows,
  createEmptyScannerRows,
  mergeScannerRow
} from "../src/js/services/market-scanner.js";
import { selectScannerTablePage } from "../src/js/ui/scanner.js";
import { buildTradePlan, calculateRisk } from "../src/js/services/risk-engine.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const javascriptFiles = await collectJavaScriptFiles(root);

for (const file of javascriptFiles) {
  execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
  const source = await readFile(file, "utf8");

  for (const match of source.matchAll(/(?:from\s+|import\s*)["'](\.[^"']+)["']/g)) {
    const importedPath = resolve(dirname(file), match[1]);
    const importedStat = await stat(importedPath).catch(() => null);
    assert(importedStat?.isFile(), `Missing import ${match[1]} from ${file}`);
  }
}

assert.equal(APP_CONFIG.version, "0.3.2");
assert.equal("symbols" in APP_CONFIG.scanner, false);

let rows = createEmptyScannerRows(["BTC", "ETH"]);
rows.BTC = mergeScannerRow(rows.BTC, {
  price: 100,
  change24h: 3,
  oiCcy: 10,
  tickerUpdatedAt: 1_000,
  oiUpdatedAt: 1_000
});
assert.equal(rows.BTC.oiUsd, 1_000, "OI currency fallback should use price");

let directOiRow = mergeScannerRow(null, {
  symbol: "BTC",
  price: 100,
  oiCcy: 10,
  oiUsd: 5_000,
  oiUsdSource: "direct",
  tickerUpdatedAt: 1_000,
  oiUpdatedAt: 1_000
});
directOiRow = mergeScannerRow(directOiRow, {
  price: 200,
  tickerUpdatedAt: 2_000
});
assert.equal(
  directOiRow.oiUsd,
  5_000,
  "Direct OKX oiUsd must take precedence over oiCcy multiplied by price"
);

const fresh = analyzeScannerRows(rows, 5, 15_000, 10_000);
assert.equal(fresh.rows.BTC.isStale, false);
assert.equal(fresh.scannedCount, 1);

const stale = analyzeScannerRows(rows, 5, 15_000, 20_000);
assert.equal(stale.rows.BTC.isStale, true);
assert.equal(stale.rows.BTC.bias, "STALE");
assert.equal(stale.scannedCount, 0);
assert.equal(stale.staleCount, 1);

const independentlyStaleRows = createEmptyScannerRows(["BTC"]);
independentlyStaleRows.BTC = mergeScannerRow(independentlyStaleRows.BTC, {
  price: 100,
  change24h: 1,
  oiUsd: 2_000,
  oiUsdSource: "direct",
  fundingRate: 0.0001,
  tickerUpdatedAt: 19_000,
  oiUpdatedAt: 1_000,
  fundingUpdatedAt: 1_000
});
const independentlyStale = analyzeScannerRows(independentlyStaleRows, 5, 15_000, 20_000);
assert.equal(independentlyStale.rows.BTC.tickerStale, false);
assert.equal(independentlyStale.rows.BTC.oiStale, true, "Fresh ticker must not refresh stale OI");
assert.equal(independentlyStale.rows.BTC.fundingStale, true, "Fresh ticker must not refresh stale funding");
assert.equal(independentlyStale.scannedCount, 1, "Ranking must still work when enrichment is stale");

let releaseRestRequest;
let restCalls = 0;
const pendingRestRequest = new Promise(resolvePromise => {
  releaseRestRequest = resolvePromise;
});
const bingxClient = new BingXMarketClient({ instruments: [{ symbol: "BTC", instrumentId: "BTC-USDT" }] });
bingxClient.hasOpenSocket = () => true;
bingxClient.fetchFundingSnapshot = async () => {
  restCalls += 1;
  await pendingRestRequest;
};
bingxClient.startRestEnrichment();
bingxClient.startRestEnrichment();
assert.equal(restCalls, 1, "Multiple socket opens must start only one BingX REST loop");
assert.equal(bingxClient.restRunning, true);
bingxClient.stopRestEnrichment();
releaseRestRequest();
await Promise.resolve();
await Promise.resolve();
assert.equal(bingxClient.restRunning, false);
assert.equal(bingxClient.restTimer, null);

const tableRows = Array.from({ length: 125 }, (_, index) => ({ symbol: `COIN${index}` }));
const firstTablePage = selectScannerTablePage(tableRows, { pageSize: 50 });
const lastTablePage = selectScannerTablePage(tableRows, { page: 3, pageSize: 50 });
assert.equal(firstTablePage.rows.length, 50, "Scanner table must render at most 50 rows by default");
assert.equal(lastTablePage.rows.length, 25);
assert.equal(selectScannerTablePage(tableRows, { query: "COIN12", pageSize: 50 }).total, 6);

const marketRows = Object.fromEntries(Array.from({ length: 30 }, (_, index) => [
  `COIN${index}`,
  {
    symbol: `COIN${index}`,
    price: 100 + index,
    change24h: index / 2,
    volume24h: 1_000_000 + index * 100_000
  }
]));
const focusedCandidates = selectCandidates(marketRows, 12);
assert.equal(focusedCandidates.length, 12, "Only the focused candidate set should be enriched and rendered");
assert.equal(Object.keys(marketRows).length, 30, "Candidate filtering must retain the full market source rows");

const longDecision = analyzeCandidate({
  symbol: "BTC",
  price: 100,
  change24h: 4,
  oiUsd: 2_000,
  oiChangePct: 1,
  fundingRate: 0.0001,
  candles: [
    { close: 96 },
    { close: 97 },
    { close: 99 },
    { close: 101 },
    { close: 103 }
  ]
});
assert.equal(longDecision.side, "LONG");
assert.equal(longDecision.completeness, 3);
assert.equal(longDecision.explanation.reasons.length, 4);

const plan = buildTradePlan({ side: "LONG", trigger: 100, timeframe: "15m" });
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

for (const file of javascriptFiles.filter(file => file.includes("src\\js"))) {
  const source = (await readFile(file, "utf8")).toLowerCase();
  assert.equal(source.includes("localstorage"), false, `localStorage found in ${file}`);
  assert.equal(source.includes("sessionstorage"), false, `sessionStorage found in ${file}`);
}

console.log(`OK: ${javascriptFiles.length} JavaScript files parsed`);
console.log("OK: all relative imports resolve");
console.log("OK: direct OI precedence, single BingX REST loop and independent freshness tests passed");
console.log("OK: scanner table search and 50-row pagination tests passed");
console.log("OK: full-market candidate funnel and decision explanation tests passed");
console.log("OK: frontend source does not use browser storage");

async function collectJavaScriptFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectJavaScriptFiles(path));
    else if ([".js", ".mjs"].includes(extname(entry.name))) files.push(path);
  }
  return files;
}
