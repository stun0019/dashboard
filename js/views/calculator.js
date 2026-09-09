window.BS = window.BS || {};
BS.Views = BS.Views || {};

BS.Views.calculator = {
  state: {
    symbol: "",
    side: "long",
    entry: "",
    sl: "",
    leverage: BS.Config.defaultLeverage
  },

  render() {
    return `
      <form id="tradeForm" class="form-grid" novalidate>
        <label>
          幣種
          <input
            name="symbol"
            type="text"
            maxlength="30"
            value="${BS.UI.escape(this.state.symbol)}"
            placeholder="例如 WLD"
            autocomplete="off"
          >
        </label>

        <label>
          方向
          <select name="side">
            <option
              value="long"
              ${this.state.side === "long" ? "selected" : ""}
            >
              LONG · 做多
            </option>

            <option
              value="short"
              ${this.state.side === "short" ? "selected" : ""}
            >
              SHORT · 做空
            </option>
          </select>
        </label>

        <label>
          進場價
          <input
            name="entry"
            type="number"
            step="any"
            min="0.00000001"
            value="${BS.UI.escape(this.state.entry)}"
            placeholder="可由即時行情帶入"
          >
        </label>

        <label>
          止損價
          <input
            name="sl"
            type="number"
            step="any"
            min="0.00000001"
            value="${BS.UI.escape(this.state.sl)}"
            placeholder="手動輸入"
          >
        </label>

        <label>
          槓桿
          <select name="leverage">
            ${BS.Config.leverageOptions.map(value => `
              <option
                value="${value}"
                ${Number(this.state.leverage) === value ? "selected" : ""}
              >
                ${value}X
              </option>
            `).join("")}
          </select>
        </label>
      </form>

      <div id="calcError" class="error-text"></div>

      <div class="calc-result-grid">
        <div class="result-card focus">
          <span>建議使用保證金</span>
          <strong id="marginPctResult">—</strong>
        </div>

        <div class="result-card">
          <span>最大虧損</span>
          <strong id="maxLossResult">
            ${(BS.Config.balance * BS.Config.riskPct / 100).toFixed(2)} U
          </strong>
        </div>

        <div class="result-card">
          <span>保證金</span>
          <strong id="marginResult">—</strong>
        </div>

        <div class="result-card">
          <span>理論倉位價值</span>
          <strong id="notionalResult">—</strong>
        </div>
      </div>

      <div class="actions">
        <button
          id="saveTradeBtn"
          class="primary-btn"
          type="button"
          disabled
        >
          儲存紀錄
        </button>
      </div>

      <div class="note">
        本金 ${BS.Config.balance} U ·
        單筆風險 ${BS.Config.riskPct}%。
        未納入手續費、滑價、Funding 與強平條件。
      </div>
    `;
  },

  mount() {
    const mount =
      document.getElementById("calculatorMount");

    mount.innerHTML = this.render();

    const form =
      document.getElementById("tradeForm");

    const update = () => {
      this.capture(form);
      this.calculate(form);
    };

    form.addEventListener("input", update);
    form.addEventListener("change", update);

    document
      .getElementById("saveTradeBtn")
      .addEventListener("click", () => {
        this.capture(form);

        const result = this.calculate(form);

        if (!result.valid || !result.data) {
          return;
        }

        BS.TradeRecords.add({
          ...result.data,
          entryDecimals:
            BS.RiskCalculator.decimalPlaces(
              form.elements.entry.value
            )
        });

        this.state.sl = "";

        BS.App.closeCalculator();
        BS.Router.go("records");
      });

    this.calculate(form);
  },

  capture(form) {
    this.state = {
      symbol:
        form.elements.symbol.value
          .trim()
          .toUpperCase(),

      side:
        form.elements.side.value,

      entry:
        form.elements.entry.value.trim(),

      sl:
        form.elements.sl.value.trim(),

      leverage:
        Number(form.elements.leverage.value)
    };
  },

  calculate(form) {
    const result =
      BS.RiskCalculator.calculate({
        symbol: form.elements.symbol.value,
        side: form.elements.side.value,
        entry: form.elements.entry.value,
        sl: form.elements.sl.value,
        leverage: form.elements.leverage.value
      });

    const error =
      document.getElementById("calcError");

    const marginPct =
      document.getElementById("marginPctResult");

    const margin =
      document.getElementById("marginResult");

    const notional =
      document.getElementById("notionalResult");

    const saveButton =
      document.getElementById("saveTradeBtn");

    error.textContent = result.error || "";

    marginPct.textContent =
      result.data && Number.isFinite(result.data.marginPct)
        ? `${BS.UI.number(result.data.marginPct, 2)}%`
        : "—";

    margin.textContent =
      result.data && Number.isFinite(result.data.margin)
        ? `${BS.UI.number(result.data.margin, 4)} U`
        : "—";

    notional.textContent =
      result.data && Number.isFinite(result.data.notional)
        ? `${BS.UI.number(result.data.notional, 2)} U`
        : "—";

    saveButton.disabled = !result.valid;

    return result;
  },

  useMarketPrice(symbol, side = null) {
    const quote =
      BS.MarketStore.getQuote(symbol);

    if (!Number.isFinite(Number(quote.last))) {
      return false;
    }

    this.state.symbol = symbol;
    this.state.entry = String(quote.last);
    this.state.sl = "";

    if (side === "LONG") {
      this.state.side = "long";
    }

    if (side === "SHORT") {
      this.state.side = "short";
    }

    return true;
  }
};
