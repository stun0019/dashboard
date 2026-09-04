import { APP_CONFIG } from "./config.js";
import { OKXMarketClient } from "./exchanges/okx.js";
import {
  analyzeCandidate,
  calculateAttentionScore,
  selectCandidates
} from "./services/decision-engine.js";
import { buildTradePlan } from "./services/risk-engine.js";
import { loadOKXInstruments } from "./services/symbol-universe.js";
import {
  initFocusDashboard,
  renderFocusDashboard,
  toggleExpandedSymbol
} from "./ui/focus-dashboard.js";

const rows = {};
const instrumentBySymbol = new Map();
const pendingPatches = new Map();
const tradePlansBySymbol = new Map();

let client = null;
let batchTimer = null;
let renderTimer = null;
let candidateTimer = null;
let candidateSymbols = [];
let expandedSymbol = null;

const state = {
  connected: false,
  connectionStatus: "CONNECTING",
  scannedCount: 0,
  candidates: [],
  expandedSymbol: null,
  lastUpdate: null
};

function queuePatch(symbol, patch) {
  if (!rows[symbol]) return;
  const pending = pendingPatches.get(symbol) || {};
  if (patch.candle) {
    pendingPatches.set(symbol, {
      ...pending,
      candles: [...(pending.candles || []), patch.candle]
    });
  }
  else {
    pendingPatches.set(symbol, { ...pending, ...patch });
  }
  if (batchTimer === null) {
    batchTimer = setTimeout(flushPatches, APP_CONFIG.scanner.updateBatchMs);
  }
}

function flushPatches() {
  batchTimer = null;
  for (const [symbol, patch] of pendingPatches) {
    rows[symbol] = mergeRow(rows[symbol], patch);
  }
  pendingPatches.clear();

  state.scannedCount = Object.values(rows).filter(row => Number(row.price) > 0).length;
  state.lastUpdate = Date.now();
  refreshCandidateViews();
  scheduleRender();
}

function refreshCandidateUniverse() {
  const now = Date.now();
  const next = selectCandidates(rows, APP_CONFIG.scanner.candidateLimit, {
    now,
    staleAfterMs: APP_CONFIG.scanner.staleAfterMs
  });
  const nextCandidateSymbols = next.map(row => row.symbol);
  reconcileCandidateMembership(candidateSymbols, nextCandidateSymbols, rows, tradePlansBySymbol);
  candidateSymbols = nextCandidateSymbols;
  if (!candidateSymbols.includes(expandedSymbol)) expandedSymbol = null;

  client?.setCandidates(candidateSymbols
    .map(symbol => instrumentBySymbol.get(symbol)?.instrumentId)
    .filter(Boolean));

  refreshCandidateViews();
  scheduleRender();
}

function refreshCandidateViews() {
  state.candidates = candidateSymbols
    .map(symbol => rows[symbol])
    .filter(Boolean)
    .map(row => {
      const analyzed = analyzeCandidate({
        ...row,
        attentionScore: calculateAttentionScore(row)
      }, {
        now: Date.now(),
        tickerStaleAfterMs: APP_CONFIG.scanner.staleAfterMs,
        candleStaleAfterMs: APP_CONFIG.scanner.candleStaleAfterMs,
        oiStaleAfterMs: APP_CONFIG.scanner.oiStaleAfterMs,
        fundingStaleAfterMs: APP_CONFIG.scanner.fundingStaleAfterMs
      });
      const planRecord = reconcileTradePlan(
        tradePlansBySymbol.get(analyzed.symbol),
        {
          symbol: analyzed.symbol,
          side: analyzed.side,
          currentPrice: analyzed.price
        }
      );

      if (planRecord) tradePlansBySymbol.set(analyzed.symbol, planRecord);
      else tradePlansBySymbol.delete(analyzed.symbol);

      return {
        ...analyzed,
        currentPrice: analyzed.price,
        tradePlan: planRecord?.plan || null,
        tradePlanCreatedAt: planRecord?.createdAt || null
      };
    })
    .sort((a, b) => b.attentionScore - a.attentionScore);

  state.expandedSymbol = expandedSymbol;
}

export function mergeRow(current, patch) {
  const next = { ...current, ...patch };

  if (patch.candles?.length) {
    const byTimestamp = new Map((current.candles || []).map(candle => [candle.timestamp, candle]));
    for (const candle of patch.candles) byTimestamp.set(candle.timestamp, candle);
    next.candles = [...byTimestamp.values()]
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-30);
    next.candleUpdatedAt = Date.now();
  }

  if (Number(patch.oiUsd) > 0) {
    next.oiBaselineUsd = Number(current.oiBaselineUsd) > 0
      ? current.oiBaselineUsd
      : Number(patch.oiUsd);
    next.oiChangePct = ((Number(patch.oiUsd) - next.oiBaselineUsd) / next.oiBaselineUsd) * 100;
  }

  return next;
}

export function reconcileTradePlan(existing, setup, now = Date.now()) {
  const side = String(setup.side || "").toUpperCase();
  if (side === "WAIT") return null;
  if (existing?.side === side) return existing;

  return {
    symbol: setup.symbol,
    side,
    plan: buildTradePlan({
      side,
      trigger: setup.currentPrice,
      timeframe: "15m"
    }),
    createdAt: now
  };
}

export function reconcileCandidateMembership(previousSymbols, nextSymbols, marketRows, planMap) {
  const previous = new Set(previousSymbols);
  const next = new Set(nextSymbols);
  const entered = nextSymbols.filter(symbol => !previous.has(symbol));
  const kept = nextSymbols.filter(symbol => previous.has(symbol));
  const exited = previousSymbols.filter(symbol => !next.has(symbol));

  for (const symbol of [...entered, ...exited]) {
    const row = marketRows[symbol];
    if (!row) continue;
    row.oiBaselineUsd = null;
    row.oiChangePct = null;
    if (entered.includes(symbol)) row.oiUpdatedAt = null;
  }

  for (const symbol of exited) planMap.delete(symbol);
  return { entered, kept, exited };
}

function scheduleRender() {
  if (renderTimer !== null) return;
  renderTimer = setTimeout(() => {
    renderTimer = null;
    renderFocusDashboard(state);
  }, APP_CONFIG.ui.renderThrottleMs);
}

function handleStatus({ connected, status }) {
  state.connected = connected;
  state.connectionStatus = status;
  scheduleRender();
}

async function init() {
  initFocusDashboard({
    onToggle(symbol) {
      expandedSymbol = toggleExpandedSymbol(expandedSymbol, symbol);
      state.expandedSymbol = expandedSymbol;
      scheduleRender();
    }
  });
  renderFocusDashboard(state);

  state.connectionStatus = "LOADING OKX";
  renderFocusDashboard(state);
  const instruments = await loadOKXInstruments();
  for (const instrument of instruments) {
    instrumentBySymbol.set(instrument.symbol, instrument);
    rows[instrument.symbol] = createRow(instrument.symbol);
  }

  client = new OKXMarketClient({
    instruments,
    onStatus: handleStatus,
    onTicker({ symbol, price, change24h, volume24h, volumeNotional24h, timestamp }) {
      queuePatch(symbol, {
        price,
        change24h,
        volume24h,
        volumeNotional24h,
        tickerUpdatedAt: timestamp
      });
    },
    onOpenInterest({ symbol, oiUsd, oiCcy, timestamp }) {
      queuePatch(symbol, { oiUsd, oiCcy, oiUpdatedAt: timestamp });
    },
    onFunding({ symbol, fundingRate, nextFundingTime, timestamp }) {
      queuePatch(symbol, { fundingRate, nextFundingTime, fundingUpdatedAt: timestamp });
    },
    onCandle({ symbol, candle }) {
      queuePatch(symbol, { candle });
    }
  });

  client.connect();
  candidateTimer = setInterval(refreshCandidateUniverse, APP_CONFIG.scanner.candidateRefreshMs);
  setTimeout(refreshCandidateUniverse, 2_500);
}

function createRow(symbol) {
  return {
    symbol,
    price: null,
    change24h: null,
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
    nextFundingTime: null
  };
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.addEventListener("beforeunload", () => {
    client?.disconnect();
    clearTimeout(batchTimer);
    clearTimeout(renderTimer);
    clearInterval(candidateTimer);
  });

  document.addEventListener("DOMContentLoaded", () => {
    init().catch(error => {
      console.error("TICK initialization failed", error);
      state.connected = false;
      state.connectionStatus = "INIT ERROR";
      renderFocusDashboard(state);
    });
  });
}
