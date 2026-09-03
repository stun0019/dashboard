export const APP_CONFIG = {
  version: "0.3.2",
  defaultExchange: "OKX",

  market: {
    base: "BTC",
    quote: "USDT"
  },

  scanner: {
    rankingLimit: 5,
    updateBatchMs: 200,
    staleAfterMs: 15_000,
    staleCheckMs: 5_000
  },

  ui: {
    renderThrottleMs: 250,
    scannerPageSize: 50
  },

  okx: {
    restBaseUrl: "https://www.okx.com",
    wsUrl: "wss://ws.okx.com/ws/v5/public",
    instrumentsPerSocket: 80,
    subscribeBatchSize: 60
  },

  bingx: {
    // BingX rejects browser Origin headers on these REST endpoints.
    // The bundled server exposes only the public, read-only routes we use.
    restBaseUrl: "/api/bingx",
    wsUrl: "wss://open-api-swap.bingx.com/swap-market",
    instrumentsPerSocket: 150,
    restPollMs: 1250,
    fundingEveryTicks: 48
  }
};

export function toOKXInstrument(symbol) {
  return `${String(symbol).toUpperCase()}-${APP_CONFIG.market.quote}-SWAP`;
}

export function fromOKXInstrument(instId) {
  return String(instId || "")
    .replace(`-${APP_CONFIG.market.quote}-SWAP`, "")
    .toUpperCase();
}

export function toBingXSymbol(symbol) {
  return `${String(symbol).toUpperCase()}-${APP_CONFIG.market.quote}`;
}

export function fromBingXSymbol(symbol) {
  return String(symbol || "")
    .replace(`-${APP_CONFIG.market.quote}`, "")
    .toUpperCase();
}
