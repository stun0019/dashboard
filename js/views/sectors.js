window.BS = window.BS || {};
BS.Views = BS.Views || {};

BS.Views.sectors = {
  title: "板塊",
  subtitle: "加密貨幣 Narrative 強弱",

  render() {
    const sectors = BS.SectorEngine.getRankedSectors();

    return `
      <section class="panel">
        <div class="panel-head">
          <div>
            <div class="panel-title">板塊雷達</div>
            <div class="panel-subtitle">
              24H 平均漲跌與相對強度
            </div>
          </div>

          <div class="muted" style="font-size:10px;">
            ${BS.Config.sectors.length} 類
          </div>
        </div>

        <div class="sector-grid">
          ${sectors.map(sector => {
            return this.sectorCard(sector);
          }).join("")}
        </div>
      </section>
    `;
  },

  sectorCard(sector) {
    const score = Number.isFinite(sector.score)
      ? Math.round(sector.score)
      : "—";

    const avg = sector.averageChange;

    const symbols = sector.symbols.length
      ? sector.symbols.join(" · ")
      : "動態新幣池";

    return `
      <article
        class="sector-card"
        data-sector-id="${sector.id}"
      >
        <div class="sector-card-top">
          <span class="sector-name">${BS.UI.escape(sector.name)}</span>
          <span class="sector-score ${BS.UI.changeClass(avg)}">
            ${score}
          </span>
        </div>

        <div class="sector-meta">
          <span>${BS.UI.escape(symbols)}</span>
          <span class="${BS.UI.changeClass(avg)}">
            ${BS.UI.percent(avg)}
          </span>
        </div>

        <div
          class="strength-bar"
          style="color:${BS.UI.changeColor(avg)}"
        >
          <i style="width:${Number.isFinite(sector.score) ? sector.score : 0}%"></i>
        </div>
      </article>
    `;
  }
};
