export const APP_CONFIG = {
  version: "0.3.0",

  defaultExchange: "OKX",

  market: {
    base: "BTC",
    quote: "USDT"
  },

  scanner: {
    symbols: [
      "BTC",
      "ETH",
      "SOL",
      "ZEC",
      "AAVE",
      "XRP",
      "DOGE",
      "LINK",
      "SUI"
    ],

    rankingLimit: 5
  },

  okx: {
    wsUrl:
      "wss://ws.okx.com:8443/ws/v5/public"
  },

  bingx: {
    wsUrl:
      "wss://open-api-swap.bingx.com/swap-market",

    restBaseUrl:
      "https://open-api.bingx.com",

    /*
    BingX Open Interest REST
    有 rate limit，因此採 Round-Robin。

    約每 1.25 秒抓一個 REST 資料。
    */
    restPollMs: 1250,

    /*
    每 48 次 REST cycle
    更新一次所有 Funding。
    約 60 秒。
    */
    fundingEveryTicks: 48
  }
};



export function toOKXInstrument(
  symbol
) {

  return (
    `${String(symbol).toUpperCase()}-` +
    `${APP_CONFIG.market.quote}-SWAP`
  );

}



export function fromOKXInstrument(
  instId
) {

  return String(
    instId || ""
  )
    .split("-")[0]
    .toUpperCase();

}



export function toBingXSymbol(
  symbol
) {

  return (
    `${String(symbol).toUpperCase()}-` +
    `${APP_CONFIG.market.quote}`
  );

}



export function fromBingXSymbol(
  symbol
) {

  return String(
    symbol || ""
  )
    .split("-")[0]
    .toUpperCase();

}
