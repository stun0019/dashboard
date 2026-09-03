export const longRecommendations = [

    {
        symbol: "ZEC",
        price: 825.34,
        strength: 92,
        change: 5.82
    },

    {
        symbol: "AAVE",
        price: 143.82,
        strength: 86,
        change: 3.41
    },

    {
        symbol: "SOL",
        price: 213.47,
        strength: 79,
        change: 2.16
    },

    {
        symbol: "LINK",
        price: 28.19,
        strength: 72,
        change: 1.84
    }

];


export const shortRecommendations = [

    {
        symbol: "ETH",
        price: 4378.20,
        strength: 91,
        change: -4.21
    },

    {
        symbol: "HYPE",
        price: 47.82,
        strength: 84,
        change: -3.74
    },

    {
        symbol: "DOGE",
        price: 0.1842,
        strength: 78,
        change: -2.91
    },

    {
        symbol: "XRP",
        price: 2.831,
        strength: 69,
        change: -1.72
    }

];


export const activeSignals = [

    {
        id: "SIG-001",
        symbol: "ZEC",
        side: "LONG",
        timeframe: "15m",
        trigger: 823.20,
        performance: 3.49,
        time: "3 分鐘前"
    },

    {
        id: "SIG-002",
        symbol: "ETH",
        side: "SHORT",
        timeframe: "15m",
        trigger: 4412.50,
        performance: 2.18,
        time: "8 分鐘前"
    },

    {
        id: "SIG-003",
        symbol: "BTC",
        side: "LONG",
        timeframe: "1H",
        trigger: 111720,
        performance: 1.42,
        time: "14 分鐘前"
    },

    {
        id: "SIG-004",
        symbol: "AAVE",
        side: "LONG",
        timeframe: "30m",
        trigger: 141.76,
        performance: 4.09,
        time: "22 分鐘前"
    },

    {
        id: "SIG-005",
        symbol: "HYPE",
        side: "SHORT",
        timeframe: "5m",
        trigger: 49.31,
        performance: 3.15,
        time: "31 分鐘前"
    },

    {
        id: "SIG-006",
        symbol: "SOL",
        side: "LONG",
        timeframe: "15m",
        trigger: 209.18,
        performance: 2.04,
        time: "42 分鐘前"
    }

];


export const closedSignals = [

    {
        id: "SIG-C001",
        symbol: "NEAR",
        side: "LONG",
        timeframe: "5m",
        trigger: 3.42,
        result: "TP",
        performance: 4.6,
        time: "1 小時前"
    },

    {
        id: "SIG-C002",
        symbol: "XRP",
        side: "SHORT",
        timeframe: "15m",
        trigger: 2.91,
        result: "TP",
        performance: 3.1,
        time: "2 小時前"
    },

    {
        id: "SIG-C003",
        symbol: "ETH",
        side: "SHORT",
        timeframe: "30m",
        trigger: 4291,
        result: "SL",
        performance: -1.5,
        time: "4 小時前"
    }

];


export const bullishAnomalies = [

    {
        symbol: "BSB",
        count: 4,
        ago: "1 分鐘前",

        description:
            "價格 5m +3.20%｜成交量異常放大",

        first: 0.8876,
        current: 1.0386,
        performance: 17.01
    },

    {
        symbol: "EDEN",
        count: 7,
        ago: "2 分鐘前",

        description:
            "價格 5m +5.74%｜Volume +182%",

        first: 0.08774,
        current: 0.1068,
        performance: 21.76
    }

];


export const bearishAnomalies = [

    {
        symbol: "LDO",
        count: 9,
        ago: "6 分鐘前",

        description:
            "價格 5m -3.05%｜做空異動增加",

        first: 1.842,
        current: 1.196,
        performance: -35.07
    },

    {
        symbol: "HYPE",
        count: 12,
        ago: "11 分鐘前",

        description:
            "OI 急增 +8.40%｜價格同步走弱",

        first: 52.14,
        current: 47.82,
        performance: -8.28
    }

];
