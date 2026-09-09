window.BS = window.BS || {};

BS.Config = {
  balance: 50,
  riskPct: 1,
  defaultLeverage: 50,

  leverageOptions: [50, 75, 100, 200, 300],

  coreSymbols: ["BTC", "ETH", "SOL", "WLD"],

  watchlist: [
    "WLD",
    "ARB",
    "TAO",
    "RENDER",
    "FET",
    "ONDO",
    "LINK",
    "HYPE",
    "DOGE",
    "PEPE",
    "SOL",
    "SUI"
  ],

  tags: {
    BTC: ["BTC", "Market"],
    ETH: ["Ethereum", "L1"],
    SOL: ["Solana", "L1"],
    WLD: ["AI", "Identity", "World Chain / L2"],
    ARB: ["Ethereum", "L2"],
    TAO: ["AI"],
    RENDER: ["AI", "DePIN"],
    FET: ["AI"],
    ONDO: ["RWA"],
    LINK: ["Oracle", "RWA"],
    HYPE: ["Perp"],
    DOGE: ["Meme"],
    PEPE: ["Meme"]
  },

  sectors: [
    {
      id: "btc",
      name: "BTC 生態",
      symbols: ["BTC", "STX"]
    },
    {
      id: "eth-l2",
      name: "Ethereum / L2",
      symbols: ["ETH", "ARB", "OP", "STRK"]
    },
    {
      id: "l1",
      name: "L1",
      symbols: ["SOL", "SUI", "AVAX", "APT"]
    },
    {
      id: "ai",
      name: "AI",
      symbols: ["TAO", "RENDER", "FET", "WLD"]
    },
    {
      id: "depin",
      name: "DePIN",
      symbols: ["RENDER", "AKT", "FIL"]
    },
    {
      id: "rwa",
      name: "RWA",
      symbols: ["ONDO", "LINK"]
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
      id: "gaming",
      name: "Gaming",
      symbols: ["IMX", "GALA", "SAND"]
    },
    {
      id: "meme",
      name: "Meme",
      symbols: ["DOGE", "PEPE", "BONK", "WIF"]
    },
    {
      id: "privacy",
      name: "Privacy / ZK",
      symbols: ["ZEC", "XMR"]
    },
    {
      id: "microcap",
      name: "土狗 / Micro Cap",
      symbols: []
    }
  ]
};
