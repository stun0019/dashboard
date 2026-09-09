window.BS = window.BS || {};

BS.Router = {
  currentRoute: "alerts",

  routes: {
    alerts: {
      view: () => BS.Views.alerts,
      title: "交易快訊",
      subtitle: "市場方向、賽道強弱與多空觀察"
    },

    sectors: {
      view: () => BS.Views.sectors,
      title: "賽道強弱",
      subtitle: "辨別當前較強勢與較弱勢區塊"
    },

    signals: {
      view: () => BS.Views.signals,
      title: "多空標的",
      subtitle: "當前偏多 / 偏空觀察清單"
    },

    records: {
      view: () => BS.Views.records,
      title: "下單紀錄",
      subtitle: "交易與風控紀錄"
    }
  },

  init() {
    document
      .querySelectorAll("[data-route]")
      .forEach(button => {
        button.addEventListener("click", () => {
          this.go(button.dataset.route);
          BS.App.closeMenu();
        });
      });

    window.addEventListener("hashchange", () => {
      const route =
        location.hash.replace("#", "") || "alerts";

      if (this.routes[route]) {
        this.go(route, false);
      }
    });

    const initial =
      location.hash.replace("#", "") || "alerts";

    this.go(
      this.routes[initial] ? initial : "alerts",
      false
    );
  },

  go(route, updateHash = true) {
    const config = this.routes[route];

    if (!config) {
      return;
    }

    this.currentRoute = route;

    if (updateHash) {
      history.replaceState(null, "", `#${route}`);
    }

    this.renderCurrent();
  },

  renderCurrent() {
    const config =
      this.routes[this.currentRoute];

    const view = config.view();

    document.getElementById("pageTitle").textContent =
      config.title;

    document.getElementById("pageSubtitle").textContent =
      config.subtitle;

    document.getElementById("mainPanel").innerHTML =
      view.render();

    document
      .querySelectorAll("[data-route]")
      .forEach(button => {
        button.classList.toggle(
          "active",
          button.dataset.route === this.currentRoute
        );
      });

    if (this.currentRoute === "records") {
      BS.Views.records.bind();
    }

    BS.App.bindPanelActions();
  }
};
