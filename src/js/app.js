import { APP_CONFIG } from "./config.js";
import {
  getState,
  replaceScanner,
  setExchange,
  setUniverse,
  subscribe,
  updateMarket,
  updateTicker
} from "./core/store.js";
import { OKXMarketClient } from "./exchanges/okx.js";
import { BingXMarketClient } from "./exchanges/bingx.js";
import { analyzeScannerRows, mergeScannerRow } from "./services/market-scanner.js";
import { loadSymbolUniverse } from "./services/symbol-universe.js";
import { initAIPanel, askAI } from "./ui/ai-panel.js";
import { initRenderer, renderApp } from "./ui/render.js";
import { initScannerUI, renderScanner } from "./ui/scanner.js";
import { initTradeModal, openTradeModal } from "./ui/trade-modal.js";

let activeClient = null;
let connectionGeneration = 0;
let scannerBatchTimer = null;
let staleTimer = null;
let renderTimer = null;
let lastRenderAt = 0;
let latestRenderState = null;
const pendingScannerPatches = new Map();
const pendingRenderScopes = new Set();

function queueScannerPatch(symbol, patch) {
  const normalizedSymbol = String(symbol || "").toUpperCase();
  if (!getState().scanner.rows[normalizedSymbol]) return;

  pendingScannerPatches.set(normalizedSymbol, {
    ...(pendingScannerPatches.get(normalizedSymbol) || {}),
    ...patch,
    symbol: normalizedSymbol
  });

  if (scannerBatchTimer === null) {
    scannerBatchTimer = setTimeout(flushScannerPatches, APP_CONFIG.scanner.updateBatchMs);
  }
}

function flushScannerPatches() {
  scannerBatchTimer = null;
  if (!pendingScannerPatches.size) return;

  let rows = getState().scanner.rows;
  for (const [symbol, patch] of pendingScannerPatches) {
    rows = {
      ...rows,
      [symbol]: mergeScannerRow(rows[symbol], patch)
    };
  }
  pendingScannerPatches.clear();

  replaceScanner(analyzeScannerRows(
    rows,
    APP_CONFIG.scanner.rankingLimit,
    APP_CONFIG.scanner.staleAfterMs
  ));

  const btc = getState().scanner.rows[APP_CONFIG.market.base];
  if (Number.isFinite(Number(btc?.oiUsd)) && Number(btc.oiUsd) > 0) {
    updateMarket({ oiUsd: Number(btc.oiUsd) });
  }
}

function refreshStaleState() {
  const scanner = getState().scanner;
  if (!Object.keys(scanner.rows).length) return;

  replaceScanner(analyzeScannerRows(
    scanner.rows,
    APP_CONFIG.scanner.rankingLimit,
    APP_CONFIG.scanner.staleAfterMs
  ));
}

const commonCallbacks = {
  onStatus({ connected, status }) {
    updateMarket({ connected, connectionStatus: status });
  },

  onTicker({ symbol, price, change24h, volume24h, timestamp, source }) {
    if (getState().exchange !== source) return;
    const updatedAt = Number(timestamp) || Date.now();
    queueScannerPatch(symbol, {
      price,
      change24h,
      volume24h,
      tickerUpdatedAt: updatedAt,
      source
    });

    if (symbol === APP_CONFIG.market.base) {
      updateTicker({ price, change24h, timestamp: updatedAt });
    }
  },

  onOpenInterest({ symbol, oiUsd, oiCcy, timestamp, source }) {
    if (getState().exchange !== source) return;
    queueScannerPatch(symbol, {
      oiUsd,
      oiCcy,
      oiUpdatedAt: Number(timestamp) || Date.now(),
      source
    });
  },

  onFunding({ symbol, fundingRate, nextFundingTime, timestamp, source }) {
    if (getState().exchange !== source) return;
    queueScannerPatch(symbol, {
      fundingRate,
      nextFundingTime,
      fundingUpdatedAt: Number(timestamp) || Date.now(),
      source
    });
  }
};

function createClient(exchange, instruments) {
  const options = { instruments, ...commonCallbacks };
  if (exchange === "OKX") return new OKXMarketClient(options);
  if (exchange === "BINGX") return new BingXMarketClient(options);
  return null;
}

function connectExchange(exchange) {
  const nextExchange = String(exchange || "").toUpperCase();
  const generation = ++connectionGeneration;
  activeClient?.disconnect();
  activeClient = null;
  pendingScannerPatches.clear();
  clearTimeout(scannerBatchTimer);
  scannerBatchTimer = null;

  const instruments = getState().universe.byExchange[nextExchange] || [];
  setExchange(nextExchange, instruments.map(item => item.symbol));

  if (!instruments.length) {
    const detail = getState().universe.errors[nextExchange];
    updateMarket({
      connected: false,
      connectionStatus: detail ? "UNIVERSE ERROR" : "NO INSTRUMENTS"
    });
    if (detail) console.error(`${nextExchange} universe unavailable:`, detail);
    return;
  }

  const client = createClient(nextExchange, instruments);
  if (!client || generation !== connectionGeneration) return;
  activeClient = client;
  client.connect();
}

function initExchangeSelector() {
  const select = document.getElementById("exchangeSelect");
  if (!select) return;
  select.value = APP_CONFIG.defaultExchange;
  select.addEventListener("change", () => connectExchange(select.value));
}

function scheduleRender(state, scope) {
  latestRenderState = state;
  pendingRenderScopes.add(scope);
  if (renderTimer !== null) return;

  const elapsed = performance.now() - lastRenderAt;
  const delay = Math.max(0, APP_CONFIG.ui.renderThrottleMs - elapsed);
  renderTimer = setTimeout(flushRender, delay);
}

function flushRender() {
  renderTimer = null;
  lastRenderAt = performance.now();
  const state = latestRenderState;
  const scopes = new Set(pendingRenderScopes);
  pendingRenderScopes.clear();

  if (scopes.has("all")) {
    renderApp(state, "all");
    renderScanner(state);
    return;
  }

  for (const scope of scopes) {
    if (scope !== "scanner" && scope !== "universe") renderApp(state, scope);
  }
  if (scopes.has("scanner") || scopes.has("universe")) renderScanner(state);
}

async function init() {
  initRenderer({
    onTrade(signal) {
      openTradeModal(signal, getState().exchange);
    },
    onAI(symbol) {
      askAI(`分析 ${symbol} 目前的 Signal、風險與交易機會`);
    }
  });
  initScannerUI();
  initTradeModal();
  initAIPanel(getState);
  initExchangeSelector();

  subscribe(scheduleRender);
  renderApp(getState(), "all");
  renderScanner(getState());
  updateMarket({ connected: false, connectionStatus: "LOADING UNIVERSE" });

  const universe = await loadSymbolUniverse();
  setUniverse(universe);
  connectExchange(document.getElementById("exchangeSelect")?.value || APP_CONFIG.defaultExchange);

  staleTimer = setInterval(refreshStaleState, APP_CONFIG.scanner.staleCheckMs);
}

window.addEventListener("beforeunload", () => {
  activeClient?.disconnect();
  clearTimeout(scannerBatchTimer);
  clearTimeout(renderTimer);
  clearInterval(staleTimer);
});

document.addEventListener("DOMContentLoaded", () => {
  init().catch(error => {
    console.error("TICK initialization failed", error);
    updateMarket({ connected: false, connectionStatus: "INIT ERROR" });
  });
});
