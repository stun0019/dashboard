window.BS = window.BS || {};
BS.Views = BS.Views || {};

BS.Views.records = {
  title: "下單紀錄",
  subtitle: "倉位計算器儲存紀錄",

  render() {
    const records = BS.TradeRecords
      .getAll()
      .slice()
      .reverse();

    return `
      <section class="panel">
        <div class="panel-head">
          <div>
            <div class="panel-title">下單紀錄</div>
            <div class="panel-subtitle">
              ${records.length} 筆
            </div>
          </div>

          <button
            id="clearRecordsBtn"
            class="danger-btn"
            type="button"
            ${records.length ? "" : "disabled"}
          >
            清空紀錄
          </button>
        </div>

        ${this.rows(records)}
      </section>
    `;
  },

  rows(records) {
    if (!records.length) {
      return `
        <div class="empty-state section-gap">
          目前沒有下單紀錄。
        </div>
      `;
    }

    return `
      <div class="records-list">
        ${records.map(record => `
          <article class="record-card">
            <div class="record-head">
              <div>
                <div class="record-symbol">
                  ${BS.UI.escape(record.symbol)}
                </div>

                <div class="record-meta">
                  <span class="${
                    record.side === "long"
                      ? "positive"
                      : "negative"
                  }">
                    ${String(record.side).toUpperCase()}
                  </span>

                  · ${record.leverage}X
                  · ${BS.UI.dateTime(record.createdAt)}
                </div>
              </div>

              <button
                class="danger-btn"
                type="button"
                data-delete-record="${BS.UI.escape(record.id)}"
              >
                刪除
              </button>
            </div>

            <div class="record-grid">
              <div class="record-metric">
                <span>進場價</span>
                <strong>
                  ${BS.UI.priceFixed(
                    record.entry,
                    record.entryDecimals ?? 4
                  )}
                </strong>
              </div>

              <div class="record-metric">
                <span>止損價</span>
                <strong>
                  ${BS.UI.priceFixed(
                    record.sl,
                    record.entryDecimals ?? 4
                  )}
                </strong>
              </div>

              <div class="record-metric">
                <span>保證金</span>
                <strong>
                  ${BS.UI.number(record.margin, 4)} U
                </strong>
              </div>

              <div class="record-metric">
                <span>保證金%</span>
                <strong>
                  ${BS.UI.number(record.marginPct, 2)}%
                </strong>
              </div>

              <div class="record-metric">
                <span>最大虧損</span>
                <strong>
                  ${BS.UI.number(record.maxLoss, 4)} U
                </strong>
              </div>
            </div>
          </article>
        `).join("")}
      </div>
    `;
  },

  bind() {
    const clearButton = document.getElementById("clearRecordsBtn");

    if (clearButton) {
      clearButton.addEventListener("click", () => {
        if (!confirm("確定清空全部下單紀錄？")) {
          return;
        }

        BS.TradeRecords.clear();
        BS.Router.renderCurrent();
      });
    }

    document
      .querySelectorAll("[data-delete-record]")
      .forEach(button => {
        button.addEventListener("click", () => {
          BS.TradeRecords.remove(
            button.dataset.deleteRecord
          );

          BS.Router.renderCurrent();
        });
      });
  }
};
