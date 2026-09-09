window.BS = window.BS || {};

BS.UI = {
  escape(value) {
    return String(value ?? "").replace(
      /[&<>"']/g,
      char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      })[char]
    );
  },

  number(value, digits = 4) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return "—";
    }

    return number.toLocaleString("en-US", {
      maximumFractionDigits: digits
    });
  },

  price(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return "—";
    }

    let digits = 8;

    if (number >= 1000) digits = 2;
    else if (number >= 1) digits = 4;
    else if (number >= 0.01) digits = 5;

    return number.toLocaleString("en-US", {
      maximumFractionDigits: digits
    });
  },

  priceFixed(value, digits = 4) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return "—";
    }

    const safeDigits = Math.min(
      Math.max(Number(digits) || 0, 0),
      12
    );

    return number.toLocaleString("en-US", {
      minimumFractionDigits: safeDigits,
      maximumFractionDigits: safeDigits
    });
  },

  percent(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return "—";
    }

    return `${number >= 0 ? "+" : ""}${number.toFixed(2)}%`;
  },

  changeClass(value) {
    const number = Number(value);

    if (number > 0) return "positive";
    if (number < 0) return "negative";

    return "neutral";
  },

  changeColor(value) {
    const number = Number(value);

    if (number > 0) return "var(--green)";
    if (number < 0) return "var(--red)";

    return "var(--muted)";
  },

  dateTime(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return date.toLocaleString("zh-TW", {
      hour12: false
    });
  }
};

BS.App = {
  allSymbols: [],

  init() {
    BS.TradeRecords.init();

    this.allSymbols = [
      ...new Set([
        ...BS.Config.coreSymbols,
        ...BS.Config.watchlist,
        ...BS.Config.sectors.flatMap(
          sector => sector.symbols
        ),
        ...BS.Storage.getWatchlist()
      ])
    ];

    BS.BingX.onStatus = (state, text) => {
      this.setWsStatus(state, text);
    };

    BS.BingX.onTick = (symbol, quote) => {
      BS.MarketStore.setQuote(symbol, quote);

      document.getElementById("lastUpdate").textContent =
        new Date().toLocaleTimeString("zh-TW", {
          hour12: false
        });
    };

    BS.MarketStore.subscribe(() => {
      this.schedulePanelRefresh();
    });

    document
      .getElementById("reconnectBtn")
      .addEventListener("click", () => {
        BS.BingX.reconnect();
      });

    BS.Router.init();
    BS.BingX.connect(this.allSymbols);
  },

  refreshTimer: null,

  schedulePanelRefresh() {
    clearTimeout(this.refreshTimer);

    this.refreshTimer = setTimeout(() => {
      /*
        不在使用者輸入倉位計算器時強制重繪，
        避免即時行情更新造成輸入框失焦。
      */
      if (BS.Router.currentRoute === "calculator") {
        return;
      }

      if (BS.Router.currentRoute === "watchlist") {
        return;
      }

      if (BS.Router.currentRoute === "records") {
        return;
      }

      BS.Router.renderCurrent();
    }, 180);
  },

  setWsStatus(state, text) {
    const dot = document.getElementById("wsDot");
    const label = document.getElementById("wsText");

    dot.className = `status-dot ${state || ""}`;
    label.textContent = text;
  },

  bindGlobalPanelActions() {
    document
      .querySelectorAll("[data-route-link]")
      .forEach(button => {
        button.addEventListener("click", () => {
          BS.Router.go(button.dataset.routeLink);
        });
      });

    document
      .querySelectorAll("[data-sector-id]")
      .forEach(card => {
        card.addEventListener("click", () => {
          BS.Router.goSector(card.dataset.sectorId);
        });
      });

    document
      .querySelectorAll("[data-use-price]")
      .forEach(button => {
        button.addEventListener("click", () => {
          const symbol = button.dataset.usePrice;

          const ok =
            BS.Views.calculator.useMarketPrice(symbol);

          if (!ok) {
            alert("目前尚未取得此幣種即時價格。");
            return;
          }

          BS.Router.go("calculator");
        });
      });
  },

  bindWatchlistActions() {
    const addButton =
      document.getElementById("addWatchBtn");

    const input =
      document.getElementById("watchSymbolInput");

    if (addButton && input) {
      const add = () => {
        const symbol = input.value
          .trim()
          .toUpperCase()
          .replace("-USDT", "");

        if (!symbol) {
          return;
        }

        const list = BS.Storage.getWatchlist();

        if (!list.includes(symbol)) {
          list.push(symbol);
          BS.Storage.saveWatchlist(list);
        }

        if (!this.allSymbols.includes(symbol)) {
          this.allSymbols.push(symbol);

          /*
            目前簡單重連一次，
            讓新增 symbol 加入 WebSocket 訂閱。
          */
          BS.BingX.connect(this.allSymbols);
        }

        BS.Router.renderCurrent();
      };

      addButton.addEventListener("click", add);

      input.addEventListener("keydown", event => {
        if (event.key === "Enter") {
          event.preventDefault();
          add();
        }
      });
    }

    document
      .querySelectorAll("[data-remove-watch]")
      .forEach(button => {
        button.addEventListener("click", () => {
          const symbol =
            button.dataset.removeWatch;

          const next = BS.Storage
            .getWatchlist()
            .filter(item => item !== symbol);

          BS.Storage.saveWatchlist(next);
          BS.Router.renderCurrent();
        });
      });
  }
};

document.addEventListener("DOMContentLoaded", () => {
  BS.App.init();
});
