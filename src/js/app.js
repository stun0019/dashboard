import {
  APP_CONFIG
}
from "./config.js";


import {

  getState,

  subscribe,

  setExchange,

  updateMarket,

  updateTicker,

  replaceScanner

}
from "./core/store.js";


import {

  mergeScannerRow,

  analyzeScannerRows

}
from "./services/market-scanner.js";


import {
  OKXMarketClient
}
from "./exchanges/okx.js";


import {
  BingXMarketClient
}
from "./exchanges/bingx.js";


import {

  initRenderer,

  renderApp

}
from "./ui/render.js";


import {

  initScannerUI,

  renderScanner

}
from "./ui/scanner.js";


import {

  initTradeModal,

  openTradeModal

}
from "./ui/trade-modal.js";


import {

  initAIPanel,

  askAI

}
from "./ui/ai-panel.js";



let activeClient =
  null;



/* =====================================================
SCANNER UPDATE
===================================================== */

function applyScannerPatch(
  symbol,
  patch
) {

  const normalizedSymbol =

    String(
      symbol || ""
    )
    .toUpperCase();


  if(
    !APP_CONFIG
      .scanner
      .symbols
      .includes(
        normalizedSymbol
      )
  ) {

    return;

  }


  const currentRows =

    getState()
      .scanner
      .rows;


  const currentRow =

    currentRows[
      normalizedSymbol
    ];


  const mergedRow =

    mergeScannerRow(

      currentRow,

      {

        ...patch,

        symbol:
          normalizedSymbol

      }

    );


  const nextRows = {

    ...currentRows,

    [
      normalizedSymbol
    ]:
      mergedRow

  };


  /*
  每次資料更新後
  重新計算：

  Long Score
  Short Score
  Bias
  Ranking
  Candidate Count
  Anomaly Count
  */

  const analysis =

    analyzeScannerRows(

      nextRows,

      APP_CONFIG
        .scanner
        .rankingLimit

    );


  replaceScanner(
    analysis
  );

}



/* =====================================================
EXCHANGE CALLBACKS
===================================================== */

const commonCallbacks = {

  onStatus({

    connected,

    status

  }) {

    updateMarket({

      connected,

      connectionStatus:
        status

    });

  },



  onTicker({

    symbol,

    price,

    change24h,

    volume24h,

    timestamp,

    source

  }) {

    /*
    Update Scanner
    */

    applyScannerPatch(

      symbol,

      {

        price,

        change24h,

        volume24h,

        source

      }

    );


    /*
    BTC 同步到 Dashboard Hero。
    */

    if(
      symbol ===
      APP_CONFIG
        .market
        .base
    ) {

      updateTicker({

        price,

        change24h,

        timestamp:

          timestamp

          ||

          Date.now()

      });

    }

  },



  onOpenInterest({

    symbol,

    oiUsd,

    oiCcy,

    timestamp,

    source

  }) {

    applyScannerPatch(

      symbol,

      {

        oiUsd,

        oiCcy,

        source

      }

    );


    /*
    BTC OI
    同步到 Dashboard Hero。
    */

    if(
      symbol ===
      APP_CONFIG
        .market
        .base
    ) {

      const btc =

        getState()
          .scanner
          .rows[
            symbol
          ];


      updateMarket({

        oiUsd:

          Number(
            oiUsd
          )

          ||

          Number(
            btc?.oiUsd
          )

          ||

          null,


        lastUpdate:

          timestamp

          ||

          getState()
            .market
            .lastUpdate

          ||

          Date.now()

      });

    }

  },



  onFunding({

    symbol,

    fundingRate,

    nextFundingTime,

    source

  }) {

    applyScannerPatch(

      symbol,

      {

        fundingRate,

        nextFundingTime,

        source

      }

    );

  }

};



/* =====================================================
CLIENTS
===================================================== */

const clients = {

  OKX:

    new OKXMarketClient({

      symbols:
        APP_CONFIG
          .scanner
          .symbols,

      ...commonCallbacks

    }),


  BINGX:

    new BingXMarketClient({

      symbols:
        APP_CONFIG
          .scanner
          .symbols,

      ...commonCallbacks

    })

};



/* =====================================================
EXCHANGE SWITCH
===================================================== */

function connectExchange(
  exchange
) {

  const nextExchange =

    String(
      exchange || ""
    )
    .toUpperCase();


  const nextClient =

    clients[
      nextExchange
    ];


  if(!nextClient) {

    console.error(

      `Unsupported exchange: ${exchange}`

    );


    return;

  }


  activeClient
    ?.disconnect();


  /*
  Reset state
  + reset Scanner baseline
  */

  setExchange(
    nextExchange
  );


  activeClient =
    nextClient;


  activeClient.connect();

}



function initExchangeSelector() {

  const select =
    document.getElementById(
      "exchangeSelect"
    );


  if(!select) {

    return;

  }


  select.value =
    APP_CONFIG
      .defaultExchange;


  select.addEventListener(
    "change",
    () => {

      connectExchange(
        select.value
      );

    }
  );

}



/* =====================================================
INIT
===================================================== */

function init() {

  /*
  Existing UI
  */

  initRenderer({

    onTrade(
      signal
    ) {

      openTradeModal(

        signal,

        getState()
          .exchange

      );

    },


    onAI(
      symbol
    ) {

      askAI(

        `分析 ${symbol} 目前的 Signal、風險與交易機會`

      );

    }

  });


  /*
  v0.3 Scanner UI
  */

  initScannerUI();


  /*
  Trade Modal
  */

  initTradeModal();


  /*
  AI
  */

  initAIPanel(
    getState
  );


  /*
  Exchange
  */

  initExchangeSelector();


  /*
  Store Render Routing
  */

  subscribe(
    (
      state,
      scope
    ) => {

      /*
      舊 UI renderer

      scanner scope 不會重畫
      Signal / Radar。
      */

      renderApp(
        state,
        scope
      );


      /*
      Scanner 自己單獨更新。
      */

      if(
        scope === "scanner"
        ||
        scope === "all"
      ) {

        renderScanner(
          state
        );

      }

    }
  );


  /*
  Initial UI
  */

  renderApp(
    getState(),
    "all"
  );


  renderScanner(
    getState()
  );


  /*
  Start Exchange
  */

  connectExchange(
    APP_CONFIG
      .defaultExchange
  );

}



/* =====================================================
CLEAN UP
===================================================== */

window.addEventListener(
  "beforeunload",
  () => {

    activeClient
      ?.disconnect();

  }
);



document.addEventListener(
  "DOMContentLoaded",
  init
);
