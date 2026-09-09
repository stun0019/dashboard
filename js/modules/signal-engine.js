window.BS = window.BS || {};

BS.SignalEngine = {
  marketBias() {
    const symbols = BS.Config.coreSymbols;

    const changes = symbols
      .map(symbol => Number(BS.MarketStore.getQuote(symbol).change))
      .filter(Number.isFinite);

    if (!changes.length) {
      return {
        label: "等待行情",
        side: "neutral",
        score: 50,
        average: null
      };
    }

    const average =
      changes.reduce((sum, value) => sum + value, 0) /
      changes.length;

    let label = "中性";
    let side = "neutral";

    if (average >= 1) {
      label = "偏多";
      side = "long";
    } else if (average <= -1) {
      label = "偏空";
      side = "short";
    }

    return {
      label,
      side,
      score: Math.max(0, Math.min(100, 50 + average * 6)),
      average
    };
  },

  scoreSymbol(symbol) {
    const quote = BS.MarketStore.getQuote(symbol);
    const change = Number(quote.change);

    const sector = BS.SectorEngine.getSectorBySymbol(symbol);
    const sectorStats = BS.SectorEngine.getStats(sector);

    const sectorChange = Number(sectorStats.averageChange);
    const market = this.marketBias();

    if (!Number.isFinite(change)) {
      return null;
    }

    const safeSector =
      Number.isFinite(sectorChange)
        ? sectorChange
        : 0;

    const marketAvg =
      Number.isFinite(market.average)
        ? market.average
        : 0;

    /*
      v1 觀察分數
      --------------------------------
      Coin 24H momentum  55%
      Sector momentum    30%
      Market momentum    15%

      結果只用來找「偏多觀察 / 偏空觀察」，
      不等於自動交易訊號。
    */
    const raw =
      change * 0.55 +
      safeSector * 0.30 +
      marketAvg * 0.15;

    const directionalScore =
      Math.max(-100, Math.min(100, raw * 7));

    return {
      symbol,
      sector,
      coinChange: change,
      sectorChange: safeSector,
      marketChange: marketAvg,
      raw,
      directionalScore
    };
  },

  getLongShort() {
    const scored = BS.Config.longShortUniverse
      .map(symbol => this.scoreSymbol(symbol))
      .filter(Boolean);

    const count = BS.Config.maxSignalCount;

    const longs = scored
      .filter(item => item.raw > 0)
      .sort((a, b) => b.raw - a.raw)
      .slice(0, count);

    const shorts = scored
      .filter(item => item.raw < 0)
      .sort((a, b) => a.raw - b.raw)
      .slice(0, count);

    return {
      longs,
      shorts
    };
  }
};
