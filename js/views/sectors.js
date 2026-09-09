window.BS = window.BS || {};
BS.Views = BS.Views || {};

BS.Views.sectors = {
  title: "賽道強弱",
  subtitle: "辨別當前較強勢與較弱勢區塊",

  render() {
    const sectors = BS.SectorEngine.ranked();

    return `
      <section class="panel">
        <div class="panel-head">
          <div>
            <div class="panel-title">賽道排行</div>
            <div class="panel-subtitle">
              依各賽道成員 24H 平均漲跌排序
            </div>
          </div>

          <span class="muted" style="font-size:9px;">
            ${sectors.length} 個賽道
          </span>
        </div>

        <div class="sector-list">
          ${sectors.map((sector, index) => {
            const score = Number.isFinite(sector.score)
              ? Math.round(sector.score)
              : "—";

            return `
              <article class="sector-card">
                <div class="sector-card-top">
                  <div>
                    <div class="sector-card-name">
                      ${String(index + 1).padStart(2, "0")} ·
                      ${BS.UI.escape(sector.name)}
                    </div>

                    <div class="sector-card-symbols">
                      ${BS.UI.escape(sector.symbols.join(" · "))}
                    </div>
                  </div>

                  <div class="sector-score ${BS.UI.changeClass(sector.averageChange)}">
                    ${score}
                  </div>

                  <div class="sector-change ${BS.UI.changeClass(sector.averageChange)}">
                    ${BS.UI.percent(sector.averageChange)}
                  </div>
                </div>

                <div
                  class="strength-bar"
                  style="color:${BS.UI.changeColor(sector.averageChange)}"
                >
                  <i style="width:${Number.isFinite(sector.score) ? sector.score : 0}%"></i>
                </div>
              </article>
            `;
          }).join("")}
        </div>

        <div class="note">
          強度分數目前以 24H 賽道平均漲跌換算；後續若要做交易級判斷，
          再加入 1H / 4H、Funding、OI。
        </div>
      </section>
    `;
  }
};
