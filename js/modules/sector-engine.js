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
        availableCount: 0,
        totalCount: sector ? sector.symbols.length : 0
      };
    }

    const changes = sector.symbols
      .map(symbol => Number(BS.MarketStore.getQuote(symbol).change))
      .filter(Number.isFinite);

    if (!changes.length) {
      return {
        averageChange: null,
        score: null,
        availableCount: 0,
        totalCount: sector.symbols.length
      };
    }

    const averageChange =
      changes.reduce((sum, value) => sum + value, 0) /
      changes.length;

    /*
      顯示型強度分數：
      24H 平均漲跌 0% = 50 分
      +10% 約 = 100 分
      -10% 約 = 0 分

      這不是交易訊號，只是方便排序板塊。
    */
    const score = Math.max(
      0,
      Math.min(100, 50 + averageChange * 5)
    );

    return {
      averageChange,
      score,
      availableCount: changes.length,
      totalCount: sector.symbols.length
    };
  },

  getRankedSectors() {
    return BS.Config.sectors
      .map(sector => ({
        ...sector,
        ...this.getStats(sector)
      }))
      .sort((a, b) => {
        const scoreA = Number.isFinite(a.score) ? a.score : -1;
        const scoreB = Number.isFinite(b.score) ? b.score : -1;
        return scoreB - scoreA;
      });
  },

  compareSymbolToSector(symbol) {
    const quote = BS.MarketStore.getQuote(symbol);
    const sector = this.getSectorBySymbol(symbol);

    if (!sector) {
      return {
        sector: null,
        difference: null,
        label: "無板塊資料"
      };
    }

    const stats = this.getStats(sector);

    const coinChange = Number(quote.change);
    const sectorChange = Number(stats.averageChange);

    if (
      !Number.isFinite(coinChange) ||
      !Number.isFinite(sectorChange)
    ) {
      return {
        sector,
        stats,
        difference: null,
        label: "等待資料"
      };
    }

    const difference = coinChange - sectorChange;

    let label = "與板塊同步";

    if (difference > 0.5) {
      label = "強於板塊";
    }

    if (difference < -0.5) {
      label = "弱於板塊";
    }

    return {
      sector,
      stats,
      difference,
      label
    };
  }
};
