window.BS = window.BS || {};
BS.Views = BS.Views || {};

BS.Views.alerts = {
  title: "交易快訊",
  subtitle: "市場方向、賽道強弱與多空觀察",

  render() {
    const market = BS.SignalEngine.marketBias();
    const sectors = BS.SectorEngine.ranked();
    const signals = BS.SignalEngine.getLongShort();

    const strong = sectors.slice(0, 3);
    const weak = sectors
      .slice()
      .reverse()
      .slice(0, 3);

    return `
      <section class="panel">
        <div class="panel-head">
          <div>
            <div class="panel-title">市場方向</div>
            <div class="panel-subtitle">
              BTC / ETH / SOL 24H 綜合
            </div>
          </div>

          <div class="market-direction">
            <span class="direction-pill ${market.side}">
              ${market.label}
            </span>
          </div>
        </div>

        <div class="grid-3 section-gap">
          ${BS.Config.coreSymbols.map(symbol => {
            const quote = BS.MarketStore.getQuote(symbol);

            return `
              <div class="market-card">
                <span>${symbol}USDT</span>
                <strong>${BS.UI.price(quote.last)}</strong>
                <small class="${BS.UI.changeClass(quote.change)}">
                  ${BS.UI.percent(quote.change)}
                </small>
              </div>
            `;
          }).join("")}
        </div>
      </section>

      <section class="panel">
        <div class="panel-head">
          <div>
            <div class="panel-title">賽道快訊</div>
            <div class="panel-subtitle">
              最強與最弱賽道
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

        <div class="grid-2 section-gap">
          <div>
            <div class="quick-note">
              <strong class="positive">強勢 Top 3</strong>
              ${strong.map((sector, index) => `
                <div style="margin-top:6px;">
                  ${index + 1}. ${BS.UI.escape(sector.name)}
                  <span class="${BS.UI.changeClass(sector.averageChange)}">
                    ${BS.UI.percent(sector.averageChange)}
                  </span>
                </div>
              `).join("")}
            </div>
          </div>

          <div>
            <div class="quick-note">
              <strong class="negative">弱勢 Bottom 3</strong>
              ${weak.map((sector, index) => `
                <div style="margin-top:6px;">
                  ${index + 1}. ${BS.UI.escape(sector.name)}
                  <span class="${BS.UI.changeClass(sector.averageChange)}">
                    ${BS.UI.percent(sector.averageChange)}
                  </span>
                </div>
              `).join("")}
            </div>
          </div>
        </div>
      </section>

      <section class="panel">
        <div class="panel-head">
          <div>
            <div class="panel-title">多空觀察</div>
            <div class="panel-subtitle">
              目前排序前 5 名
            </div>
          </div>

          <button
            class="secondary-btn"
            type="button"
            data-route-link="signals"
          >
            查看全部
          </button>
        </div>

        <div class="signal-columns section-gap">
          ${BS.Views.signals.renderColumn(
            "偏多觀察",
            "positive",
            signals.longs.slice(0, 5),
            "LONG"
          )}

          ${BS.Views.signals.renderColumn(
            "偏空觀察",
            "negative",
            signals.shorts.slice(0, 5),
            "SHORT"
          )}
        </div>

        <div class="note">
          偏多 / 偏空清單只依目前行情做相對排序，不代表自動進場訊號。
        </div>
      </section>
    `;
  }
};
