window.BS = window.BS || {};

BS.Router = {
  currentRoute: "dashboard",
  currentSectorId: null,

  routes: {
    dashboard: {
      view: () => BS.Views.dashboard,
      title: "Dashboard",
      subtitle: "市場總覽與板塊強弱"
    },

    sectors: {
      view: () => BS.Views.sectors,
      title: "板塊",
      subtitle: "加密貨幣 Narrative 強弱"
    },

    "sector-ai": {
      sectorId: "ai",
      title: "AI",
      subtitle: "AI 板塊"
    },

    "sector-meme": {
      sectorId: "meme",
      title: "Meme",
      subtitle: "Meme 板塊"
    },

    "sector-rwa": {
      sectorId: "rwa",
      title: "RWA",
      subtitle: "RWA 板塊"
    },

    watchlist: {
      view: () => BS.Views.watchlist,
      title: "自選幣",
      subtitle: "自訂觀察標的"
    },

    calculator: {
      view: () => BS.Views.calculator,
      title: "倉位計算",
      subtitle: "依最大可承受虧損反推倉位"
    },

    records: {
      view: () => BS.Views.records,
      title: "下單紀錄",
      subtitle: "交易風控紀錄"
    }
  },

  init() {
    document
      .querySelectorAll("[data-route]")
      .forEach(button => {
        button.addEventListener("click", () => {
          this.go(button.dataset.route);
        });
      });

    window.addEventListener("hashchange", () => {
      const route = location.hash.replace("#", "") || "dashboard";

      if (this.routes[route]) {
        this.go(route, false);
      }
    });

    const initial =
      location.hash.replace("#", "") || "dashboard";

    this.go(this.routes[initial] ? initial : "dashboard", false);
  },

  go(route, updateHash = true) {
    const config = this.routes[route];

    if (!config) {
      return;
    }

    this.currentRoute = route;
    this.currentSectorId = config.sectorId || null;

    if (updateHash) {
      history.replaceState(null, "", `#${route}`);
    }

    this.renderCurrent();
  },

  goSector(sectorId) {
    const fixedRouteMap = {
      ai: "sector-ai",
      meme: "sector-meme",
      rwa: "sector-rwa"
    };

    if (fixedRouteMap[sectorId]) {
      this.go(fixedRouteMap[sectorId]);
      return;
    }

    this.currentRoute = "sector-detail";
    this.currentSectorId = sectorId;

    history.replaceState(null, "", "#sectors");
    this.renderCurrent();
  },

  renderCurrent() {
    const main = document.getElementById("mainPanel");
    const routeConfig = this.routes[this.currentRoute];

    let title = routeConfig ? routeConfig.title : "板塊";
    let subtitle = routeConfig ? routeConfig.subtitle : "";
    let html = "";

    if (this.currentRoute === "sector-detail") {
      const sector =
        BS.SectorEngine.getSectorById(this.currentSectorId);

      title = sector ? sector.name : "板塊";
      subtitle = "板塊詳細";

      html = BS.Views.sectorDetail.render(
        this.currentSectorId
      );
    } else if (routeConfig && routeConfig.sectorId) {
      const sector =
        BS.SectorEngine.getSectorById(routeConfig.sectorId);

      html = BS.Views.sectorDetail.render(
        routeConfig.sectorId
      );

      title = sector ? sector.name : routeConfig.title;
    } else if (routeConfig && routeConfig.view) {
      html = routeConfig.view().render();
    }

    document.getElementById("pageTitle").textContent = title;
    document.getElementById("pageSubtitle").textContent = subtitle;
    main.innerHTML = html;

    this.updateActiveNav();
    this.bindCurrentView();
    BS.App.bindGlobalPanelActions();
  },

  updateActiveNav() {
    document
      .querySelectorAll("[data-route]")
      .forEach(button => {
        button.classList.toggle(
          "active",
          button.dataset.route === this.currentRoute ||
          (
            this.currentRoute === "sector-detail" &&
            button.dataset.route === "sectors"
          )
        );
      });
  },

  bindCurrentView() {
    if (this.currentRoute === "calculator") {
      BS.Views.calculator.bind();
    }

    if (this.currentRoute === "records") {
      BS.Views.records.bind();
    }

    if (this.currentRoute === "watchlist") {
      BS.App.bindWatchlistActions();
    }
  }
};
