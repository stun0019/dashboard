window.BS = window.BS || {};

BS.Config = {
  balance: 50,
  riskPct: 1,
  defaultLeverage: 50,

  leverageOptions: [50, 75, 100, 200, 300],

  coreSymbols: ["BTC", "ETH", "SOL"],

  sectors: [
    {
      id: "ai",
      name: "AI",
      symbols: ["TAO", "RENDER", "FET", "WLD"]
    },
    {
      id: "rwa",
      name: "RWA",
      symbols: ["ONDO", "LINK"]
    },
    {
      id: "meme",
      name: "Meme",
      symbols: ["DOGE", "PEPE", "WIF", "BONK"]
    },
    {
      id: "l1",
      name: "L1",
      symbols: ["SOL", "SUI", "AVAX", "APT"]
    },
    {
      id: "l2",
      name: "L2",
      symbols: ["ARB", "OP", "STRK"]
    },
    {
      id: "defi",
      name: "DeFi",
      symbols: ["AAVE", "UNI", "PENDLE"]
    },
    {
      id: "perp",
      name: "Perp",
      symbols: ["HYPE", "DYDX"]
    },
    {
      id: "depin",
      name: "DePIN",
      symbols: ["RENDER", "AKT", "FIL"]
    },
    {
      id: "gaming",
      name: "Gaming",
      symbols: ["IMX", "GALA", "SAND"]
    },
    {
      id: "btc-eco",
      name: "BTC 生態",
      symbols: ["BTC", "STX"]
    }
  ],

  longShortUniverse: [
    "WLD",
    "TAO",
    "RENDER",
    "FET",
    "ONDO",
    "LINK",
    "SUI",
    "SOL",
    "ARB",
    "OP",
    "STRK",
    "AAVE",
    "UNI",
    "PENDLE",
    "HYPE",
    "DYDX",
    "DOGE",
    "PEPE",
    "WIF",
    "BONK",
    "IMX",
    "GALA",
    "FIL"
  ],

  maxSignalCount: 8
};
