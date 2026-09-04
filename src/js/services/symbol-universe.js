import { APP_CONFIG, fromOKXInstrument } from "../config.js";

export async function loadOKXInstruments() {
  const url = new URL("/api/v5/public/instruments", APP_CONFIG.okx.restBaseUrl);
  url.searchParams.set("instType", "SWAP");

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(12_000)
  });
  if (!response.ok) throw new Error(`OKX instruments HTTP ${response.status}`);

  const payload = await response.json();
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
      symbol: fromOKXInstrument(item.instId),
      instrumentId: item.instId
    }))
    .sort((a, b) => a.symbol.localeCompare(b.symbol));
}
