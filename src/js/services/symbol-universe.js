import {
  APP_CONFIG,
  fromBingXSymbol,
  fromOKXInstrument
} from "../config.js";

export async function loadSymbolUniverse() {
  const [okxResult, bingxResult] = await Promise.allSettled([
    loadOKXInstruments(),
    loadBingXContracts()
  ]);

  const byExchange = {
    OKX: settledValue(okxResult),
    BINGX: settledValue(bingxResult)
  };

  const errors = {};
  if (okxResult.status === "rejected") {
    errors.OKX = errorMessage(okxResult.reason);
  }
  if (bingxResult.status === "rejected") {
    errors.BINGX = errorMessage(bingxResult.reason);
  }

  const allSymbols = [...new Set(
    Object.values(byExchange)
      .flat()
      .map(instrument => instrument.symbol)
  )].sort(compareSymbols);

  return {
    byExchange,
    allSymbols,
    errors,
    loadedAt: Date.now()
  };
}

export async function loadOKXInstruments() {
  const url = new URL(
    "/api/v5/public/instruments",
    APP_CONFIG.okx.restBaseUrl
  );
  url.searchParams.set("instType", "SWAP");

  const payload = await fetchJson(url.toString());
  if (String(payload.code) !== "0" || !Array.isArray(payload.data)) {
    throw new Error(payload.msg || "OKX instrument response is invalid");
  }

  return payload.data
    .filter(item => (
      item.instType === "SWAP" &&
      item.state === "live" &&
      item.settleCcy === APP_CONFIG.market.quote &&
      item.instId?.endsWith(`-${APP_CONFIG.market.quote}-SWAP`)
    ))
    .map(item => ({
      exchange: "OKX",
      symbol: fromOKXInstrument(item.instId),
      instrumentId: item.instId,
      quote: APP_CONFIG.market.quote,
      status: "live",
      contractValue: numberOrNull(item.ctVal),
      contractMultiplier: numberOrNull(item.ctMult),
      contractValueCurrency: item.ctValCcy || null
    }))
    .sort((a, b) => compareSymbols(a.symbol, b.symbol));
}

export async function loadBingXContracts() {
  const payload = await fetchJson(`${APP_CONFIG.bingx.restBaseUrl}/contracts`);
  if (Number(payload.code) !== 0 || !Array.isArray(payload.data)) {
    throw new Error(payload.msg || "BingX contract response is invalid");
  }

  return payload.data
    .filter(item => (
      item.currency === APP_CONFIG.market.quote &&
      Number(item.status) === 1 &&
      String(item.apiStateOpen).toLowerCase() !== "false" &&
      item.symbol?.endsWith(`-${APP_CONFIG.market.quote}`)
    ))
    .map(item => ({
      exchange: "BINGX",
      symbol: fromBingXSymbol(item.symbol),
      instrumentId: item.symbol,
      quote: APP_CONFIG.market.quote,
      status: "live",
      contractValue: numberOrNull(item.size),
      contractMultiplier: 1,
      contractValueCurrency: item.asset || fromBingXSymbol(item.symbol)
    }))
    .sort((a, b) => compareSymbols(a.symbol, b.symbol));
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  }
  finally {
    clearTimeout(timeout);
  }
}

function settledValue(result) {
  return result.status === "fulfilled" ? result.value : [];
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function compareSymbols(a, b) {
  const left = typeof a === "string" ? a : a.symbol;
  const right = typeof b === "string" ? b : b.symbol;
  if (left === APP_CONFIG.market.base) return -1;
  if (right === APP_CONFIG.market.base) return 1;
  return left.localeCompare(right);
}
