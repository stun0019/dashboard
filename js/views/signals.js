window.BS = window.BS || {};
BS.Views = BS.Views || {};

BS.Views.signals = {
  title: "多空標的",
  subtitle: "當前偏多 / 偏空觀察清單",

  render() {
    const { longs, shorts } =
      BS.SignalEngine.getLongShort();

    return `
      <section class="panel">
        <div class="panel-head">
          <div>
            <div class="panel-title">多空觀察</div>
            <div class="panel-subtitle">
              各選最多 ${BS.Config.maxSignalCount} 個
            </div>
          </div>
        </div>

        <div class="signal-columns section-gap">
          ${this.renderColumn(
            "偏多觀察",
            "positive",
            longs,
            "LONG"
          )}

          ${this.renderColumn(
            "偏空觀察",
            "negative",
            shorts,
            "SHORT"
          )}
        </div>

        <div class="note">
          本清單為相對強弱篩選，不代表建議直接下單。
          實際進場仍應結合你的 H1 / M15 結構與止損位置。
        </div>
      </section>
    `;
  },

  renderColumn(title, titleClass, items, side) {
    return `
      <div class="signal-column">
        <div class="signal-column-head">
          <strong class="${titleClass}">
            ${title}
          </strong>

          <span>${items.length} 個</span>
        </div>

        <div class="signal-list">
          ${
            items.length
              ? items.map((item, index) => {
                  const quote =
                    BS.MarketStore.getQuote(item.symbol);

                  return `
                    <article class="signal-card">
                      <div class="signal-rank">
                        ${String(index + 1).padStart(2, "0")}
                      </div>

                      <div>
                        <div class="signal-symbol">
                          ${BS.UI.escape(item.symbol)}
                        </div>

                        <div class="signal-sector">
                          ${BS.UI.escape(item.sector?.name || "—")}
                        </div>
                      </div>

                      <div class="signal-score ${titleClass}">
                        ${Math.abs(item.directionalScore).toFixed(0)}
                      </div>

                      <div class="signal-change ${BS.UI.changeClass(item.coinChange)}">
                        ${BS.UI.percent(item.coinChange)}
                      </div>

                      <button
                        class="secondary-btn"
                        type="button"
                        data-open-calc="${item.symbol}"
                        data-side="${side}"
                      >
                        倉位計算
                      </button>
                    </article>
                  `;
                }).join("")
              : `
                <div class="empty-state">
                  目前沒有足夠行情資料。
                </div>
              `
          }
        </div>
      </div>
    `;
  }
};
