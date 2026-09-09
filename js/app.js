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

    const safeDigits = Math.max(
      0,
      Math.min(12, Number(digits) || 0)
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

  refreshScheduled: false,
  lastRenderAt: 0,
  renderInterval: 350,

  init() {
    BS.TradeRecords.init();

    this.allSymbols = [
      ...new Set([
        ...BS.Config.coreSymbols,
        ...BS.Config.longShortUniverse,
        ...BS.Config.sectors.flatMap(
          sector => sector.symbols
        )
      ])
    ];

    this.bindShell();

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
      this.scheduleRender();
    });

    BS.Router.init();
    BS.Views.calculator.mount();

    BS.BingX.connect(this.allSymbols);
  },

  bindShell() {
    document
      .getElementById("menuBtn")
      .addEventListener("click", () => {
        this.openMenu();
      });

    document
      .getElementById("closeMenuBtn")
      .addEventListener("click", () => {
        this.closeMenu();
      });

    document
      .getElementById("calculatorBtn")
      .addEventListener("click", () => {
        this.openCalculator();
      });

    document
      .getElementById("closeCalculatorBtn")
      .addEventListener("click", () => {
        this.closeCalculator();
      });

    document
      .getElementById("reconnectBtn")
      .addEventListener("click", () => {
        BS.BingX.reconnect();
      });

    document
      .getElementById("overlay")
      .addEventListener("click", () => {
        this.closeMenu();
        this.closeCalculator();
      });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        this.closeMenu();
        this.closeCalculator();
      }
    });
  },

  scheduleRender() {
    if (this.refreshScheduled) {
      return;
    }

    const elapsed =
      performance.now() - this.lastRenderAt;

    const delay =
      Math.max(0, this.renderInterval - elapsed);

    this.refreshScheduled = true;

    setTimeout(() => {
      this.refreshScheduled = false;
      this.lastRenderAt = performance.now();

      /*
        Main Panel 允許即時重繪。
        Calculator 是獨立 Drawer，不會受到 Main Panel 重繪影響。
      */
      BS.Router.renderCurrent();
    }, delay);
  },

  setWsStatus(state, text) {
    const dot =
      document.getElementById("wsDot");

    const label =
      document.getElementById("wsText");

    dot.className = `status-dot ${state || ""}`;
    label.textContent = text;
  },

  setOverlay(show) {
    document.getElementById("overlay").hidden = !show;
  },

  openMenu() {
    this.closeCalculator(false);

    document
      .getElementById("sideDrawer")
      .classList.add("open");

    document
      .getElementById("sideDrawer")
      .setAttribute("aria-hidden", "false");

    document
      .getElementById("menuBtn")
      .setAttribute("aria-expanded", "true");

    this.setOverlay(true);
  },

  closeMenu(updateOverlay = true) {
    document
      .getElementById("sideDrawer")
      .classList.remove("open");

    document
      .getElementById("sideDrawer")
      .setAttribute("aria-hidden", "true");

    document
      .getElementById("menuBtn")
      .setAttribute("aria-expanded", "false");

    if (updateOverlay) {
      this.setOverlay(false);
    }
  },

  openCalculator() {
    this.closeMenu(false);

    BS.Views.calculator.mount();

    document
      .getElementById("calculatorDrawer")
      .classList.add("open");

    document
      .getElementById("calculatorDrawer")
      .setAttribute("aria-hidden", "false");

    document
      .getElementById("calculatorBtn")
      .setAttribute("aria-expanded", "true");

    this.setOverlay(true);
  },

  closeCalculator(updateOverlay = true) {
    document
      .getElementById("calculatorDrawer")
      .classList.remove("open");

    document
      .getElementById("calculatorDrawer")
      .setAttribute("aria-hidden", "true");

    document
      .getElementById("calculatorBtn")
      .setAttribute("aria-expanded", "false");

    if (updateOverlay) {
      this.setOverlay(false);
    }
  },

  bindPanelActions() {
    document
      .querySelectorAll("[data-route-link]")
      .forEach(button => {
        button.addEventListener("click", () => {
          BS.Router.go(
            button.dataset.routeLink
          );
        });
      });

    document
      .querySelectorAll("[data-open-calc]")
      .forEach(button => {
        button.addEventListener("click", () => {
          const symbol =
            button.dataset.openCalc;

          const side =
            button.dataset.side || null;

          const ok =
            BS.Views.calculator.useMarketPrice(
              symbol,
              side
            );

          if (!ok) {
            alert("目前尚未取得此幣即時價格。");
            return;
          }

          this.openCalculator();
        });
      });
  }
};

document.addEventListener("DOMContentLoaded", () => {
  BS.App.init();
});
