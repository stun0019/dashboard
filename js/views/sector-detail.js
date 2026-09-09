window.BS = window.BS || {};
BS.Views = BS.Views || {};

BS.Views.sectorDetail = {
  render(sectorId) {
    const sector = BS.SectorEngine.getSectorById(sectorId);

    if (!sector) {
      return `
        <section class="panel">
          <div class="empty-state">找不到板塊。</div>
        </section>
      `;
    }

    const stats = BS.SectorEngine.getStats(sector);

    return `
      <section class="panel">
        <div class="panel-head">
          <div>
            <div class="panel-title">${BS.UI.escape(sector.name)}</div>
            <div class="panel-subtitle">
              板塊成員即時報價與 24H 相對強弱
            </div>
          </div>

          <div class="sector-score ${BS.UI.changeClass(stats.averageChange)}">
            ${Number.isFinite(stats.score) ? Math.round(stats.score) : "—"}
          </div>
        </div>

        <div class="grid-3 section-gap">
          <div class="metric-card">
            <span>板塊 24H</span>
            <strong class="${BS.UI.changeClass(stats.averageChange)}">
              ${BS.UI.percent(stats.averageChange)}
            </strong>
          </div>

          <div class="metric-card">
            <span>強度分數</span>
            <strong>
              ${Number.isFinite(stats.score) ? `${Math.round(stats.score)} / 100` : "—"}
            </strong>
          </div>

          <div class="metric-card">
            <span>已取得行情</span>
            <strong>
              ${stats.availableCount} / ${stats.totalCount}
            </strong>
          </div>
        </div>
      </section>

      <section class="panel">
        <div class="panel-head">
          <div>
            <div class="panel-title">板塊成員</div>
          </div>
        </div>

        ${this.coinRows(sector)}
      </section>
    `;
  },

  coinRows(sector) {
    if (!sector.symbols.length) {
      return `
        <div class="empty-state section-gap">
          土狗 / Micro Cap 建議後續另外串新幣池資料，
          不用固定 symbol。
        </div>
      `;
    }

    return `
      <div class="coin-list">
        ${sector.symbols.map(symbol => {
          const quote = BS.MarketStore.getQuote(symbol);
          const relation = BS.SectorEngine.compareSymbolToSector(symbol);

          return `
            <div class="coin-row">
              <div>
                <div class="coin-symbol">${symbol}</div>
                <div class="muted" style="font-size:8px;margin-top:3px;">
                  ${BS.UI.escape(relation.label || "—")}
                </div>
              </div>

              <div class="coin-price">
                ${BS.UI.price(quote.last)}
              </div>

              <div class="coin-change ${BS.UI.changeClass(quote.change)}">
                ${BS.UI.percent(quote.change)}
              </div>

              <div class="coin-action">
                <button
                  class="secondary-btn"
                  type="button"
                  data-use-price="${symbol}"
                >
                  倉位計算
                </button>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }
};
