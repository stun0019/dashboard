import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { APP_CONFIG } from "../src/js/config.js";
import {
  analyzeScannerRows,
  createEmptyScannerRows,
  mergeScannerRow
} from "../src/js/services/market-scanner.js";
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

assert.equal(APP_CONFIG.version, "0.3.1");
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

const fresh = analyzeScannerRows(rows, 5, 15_000, 10_000);
assert.equal(fresh.rows.BTC.isStale, false);
assert.equal(fresh.scannedCount, 1);

const stale = analyzeScannerRows(rows, 5, 15_000, 20_000);
assert.equal(stale.rows.BTC.isStale, true);
assert.equal(stale.rows.BTC.bias, "STALE");
assert.equal(stale.scannedCount, 0);
assert.equal(stale.staleCount, 1);

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
console.log("OK: dynamic scanner, OI fallback, stale detection and risk smoke tests passed");
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
