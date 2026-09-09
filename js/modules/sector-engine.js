window.BS = window.BS || {};

BS.SectorEngine = {
  getSectorById(id) {
    return BS.Config.sectors.find(
      sector => sector.id === id
    ) || null;
  },

  getSectorBySymbol(symbol) {
    const target = String(symbol || "").toUpperCase();

    return BS.Config.sectors.find(
      sector => sector.symbols.includes(target)
    ) || null;
  },

  getStats(sector) {
    if (!sector || !sector.symbols.length) {
      return {
        averageChange: null,
        score: null,
        available: 0,
        total: sector?.symbols.length || 0
      };
    }

    const changes = sector.symbols
      .map(symbol => Number(BS.MarketStore.getQuote(symbol).change))
      .filter(Number.isFinite);

    if (!changes.length) {
      return {
        averageChange: null,
        score: null,
        available: 0,
        total: sector.symbols.length
      };
    }

    const averageChange =
      changes.reduce((sum, value) => sum + value, 0) /
      changes.length;

    /*
      v1 強弱分數：
      24H 平均漲跌 0% = 50
      +10% = 100
      -10% = 0

      此分數只作為「賽道相對強弱排序」，
      不是做多 / 做空交易訊號。
    */
    const score = Math.max(
      0,
      Math.min(100, 50 + averageChange * 5)
    );

    return {
      averageChange,
      score,
      available: changes.length,
      total: sector.symbols.length
    };
  },

  ranked() {
    return BS.Config.sectors
      .map(sector => ({
        ...sector,
        ...this.getStats(sector)
      }))
      .sort((a, b) => {
        const aScore = Number.isFinite(a.score) ? a.score : -1;
        const bScore = Number.isFinite(b.score) ? b.score : -1;

        return bScore - aScore;
      });
  }
};
