export const APP_CONFIG = {
  version: "0.4.0",
  name: "Candidate Card UI",

  market: {
    base: "BTC",
    quote: "USDT"
  },

  scanner: {
    candidateLimit: 12,
    candidateRefreshMs: 10_000,
    updateBatchMs: 200,
    staleAfterMs: 15_000,
    candleStaleAfterMs: 90_000,
    oiStaleAfterMs: 30_000,
    fundingStaleAfterMs: 90_000
  },

  ui: {
    renderThrottleMs: 250
  },

  okx: {
    restBaseUrl: "https://www.okx.com",
    wsUrl: "wss://ws.okx.com/ws/v5/public",
    instrumentsPerSocket: 80,
    subscribeBatchSize: 60
  }
};

export function fromOKXInstrument(instId) {
  return String(instId || "")
    .replace(`-${APP_CONFIG.market.quote}-SWAP`, "")
    .toUpperCase();
}
