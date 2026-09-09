window.BS = window.BS || {};
BS.Views = BS.Views || {};

BS.Views.watchlist = {
  title: "自選幣",
  subtitle: "自訂觀察標的",

  render() {
    const watchlist = BS.Storage.getWatchlist();

    return `
      <section class="panel">
        <div class="panel-head">
          <div>
            <div class="panel-title">新增自選幣</div>
            <div class="panel-subtitle">
              請輸入 BingX USDT-M symbol，例如 WLD、ARB、SUI
            </div>
          </div>
        </div>

        <div class="form-grid">
          <label>
            幣種
            <input
              id="watchSymbolInput"
              type="text"
              maxlength="20"
              placeholder="例如 WLD"
              autocomplete="off"
            >
          </label>
        </div>

        <div class="actions">
          <button
            id="addWatchBtn"
            class="primary-btn"
            type="button"
          >
            新增
          </button>
        </div>
      </section>

      <section class="panel">
        <div class="panel-head">
          <div>
            <div class="panel-title">自選清單</div>
            <div class="panel-subtitle">
              ${watchlist.length} 個標的
            </div>
          </div>
        </div>

        ${this.rows(watchlist)}
      </section>
    `;
  },

  rows(symbols) {
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
                  class="danger-btn"
                  type="button"
                  data-remove-watch="${symbol}"
                >
                  移除
                </button>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }
};
