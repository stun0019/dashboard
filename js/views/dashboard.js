window.BS = window.BS || {};
BS.Views = BS.Views || {};

BS.Views.dashboard = {
  title: "Dashboard",
  subtitle: "市場總覽與板塊強弱",

  render() {
    const ranked = BS.SectorEngine.getRankedSectors();
    const topSectors = ranked.slice(0, 6);

    return `
      <section class="panel">
        <div class="panel-head">
          <div>
            <div class="panel-title">市場總覽</div>
            <div class="panel-subtitle">
              BingX USDT-M 永續合約 · 24H
            </div>
          </div>
        </div>

        <div class="grid-4 section-gap">
          ${BS.Config.coreSymbols.map(symbol => {
            return this.marketCard(symbol);
          }).join("")}
        </div>
      </section>

      <section class="panel">
        <div class="panel-head">
          <div>
            <div class="panel-title">板塊強弱 Top 6</div>
            <div class="panel-subtitle">
              依板塊成員 24H 平均漲跌計算
            </div>
          </div>

          <button
            class="secondary-btn"
            type="button"
            data-route-link="sectors"
          >
            查看全部
          </button>
        </div>

        <div class="sector-grid">
          ${topSectors.map(sector => {
            return BS.Views.sectors.sectorCard(sector);
          }).join("")}
        </div>
      </section>

      <section class="panel">
        <div class="panel-head">
          <div>
            <div class="panel-title">主要觀察</div>
            <div class="panel-subtitle">
              點擊幣種可快速帶入倉位計算器
            </div>
          </div>

          <button
            class="secondary-btn"
            type="button"
            data-route-link="watchlist"
          >
            自選幣
          </button>
        </div>

        ${this.watchRows(BS.Storage.getWatchlist().slice(0, 8))}
      </section>
    `;
  },

  marketCard(symbol) {
    const quote = BS.MarketStore.getQuote(symbol);

    return `
      <div class="market-card">
        <div class="market-card-symbol">${symbol}USDT</div>
        <div class="market-card-price">
          ${BS.UI.price(quote.last)}
        </div>
        <div class="market-card-change ${BS.UI.changeClass(quote.change)}">
          ${BS.UI.percent(quote.change)}
        </div>
      </div>
    `;
  },

  watchRows(symbols) {
    if (!symbols.length) {
      return `
        <div class="empty-state section-gap">
          目前沒有自選幣。
        </div>
      `;
    }

    return `
      <div class="coin-list">
        ${symbols.map(symbol => {
          const quote = BS.MarketStore.getQuote(symbol);

          return `
            <div class="coin-row">
              <div class="coin-symbol">${symbol}</div>

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
