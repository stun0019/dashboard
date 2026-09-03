import {
  APP_CONFIG
}
from "../config.js";


import {

  longRecommendations,
  shortRecommendations,

  activeSignals,
  closedSignals,

  bullishAnomalies,
  bearishAnomalies

}
from "../data/mock-data.js";


import {
  createEmptyScannerRows
}
from "../services/market-scanner.js";



function createScannerState() {

  return {

    rows:
      createEmptyScannerRows(
        APP_CONFIG
          .scanner
          .symbols
      ),

    longRanking:
      [],

    shortRanking:
      [],

    scannedCount:
      0,

    bullishCount:
      0,

    bearishCount:
      0,

    anomalyCount:
      0,

    updatedAt:
      null

  };

}



let state = {

  exchange:
    APP_CONFIG
      .defaultExchange,


  market: {

    symbol:

      `${APP_CONFIG.market.base}-` +
      `${APP_CONFIG.market.quote}`,

    price:
      null,

    change24h:
      null,

    oiUsd:
      null,

    connected:
      false,

    connectionStatus:
      "CONNECTING",

    lastUpdate:
      null,

    priceHistory:
      []

  },


  scanner:
    createScannerState(),


  /*
  v0.3：

  Long / Short Ranking
  已由 Scanner 接管。

  但這裡暫時保留舊資料，
  避免其他模組相依時斷掉。
  */

  recommendations: {

    long:
      longRecommendations,

    short:
      shortRecommendations

  },


  /*
  v0.3 Signal Feed
  暫時仍為 Mock。

  下一階段再做 Signal Engine。
  */

  signals: {

    active:
      activeSignals,

    closed:
      closedSignals

  },


  /*
  v0.3 Radar
  暫時仍保留 Mock。

  v0.4 會改成實際 Anomaly Engine。
  */

  anomalies: {

    bullish:
      bullishAnomalies,

    bearish:
      bearishAnomalies

  }

};



const listeners =
  new Set();



export function getState() {

  return state;

}



export function subscribe(
  listener
) {

  listeners.add(
    listener
  );


  return () => {

    listeners.delete(
      listener
    );

  };

}



export function setExchange(
  exchange
) {

  state = {

    ...state,


    exchange,


    market: {

      ...state.market,

      price:
        null,

      change24h:
        null,

      oiUsd:
        null,

      connected:
        false,

      connectionStatus:
        "CONNECTING",

      lastUpdate:
        null,

      priceHistory:
        []

    },


    /*
    切換交易所後，
    Scanner 全部重新建立 baseline。
    */

    scanner:
      createScannerState()

  };


  emit(
    "all"
  );

}



export function updateMarket(
  patch
) {

  state = {

    ...state,


    market: {

      ...state.market,

      ...patch

    }

  };


  emit(
    "market"
  );

}



export function updateTicker({

  price,

  change24h = null,

  timestamp = Date.now()

}) {

  const numericPrice =
    Number(
      price
    );


  if(
    !Number.isFinite(
      numericPrice
    )
    ||
    numericPrice <= 0
  ) {

    return;

  }


  const history = [

    ...state
      .market
      .priceHistory,

    numericPrice

  ];


  while(
    history.length > 45
  ) {

    history.shift();

  }


  const numericChange =
    Number(
      change24h
    );


  state = {

    ...state,


    market: {

      ...state.market,


      price:
        numericPrice,


      change24h:

        Number.isFinite(
          numericChange
        )

          ?

          numericChange

          :

          state
            .market
            .change24h,


      lastUpdate:

        Number(
          timestamp
        )

        ||

        Date.now(),


      priceHistory:
        history

    }

  };


  emit(
    "market"
  );

}



export function replaceScanner(
  scannerPatch
) {

  state = {

    ...state,


    scanner: {

      ...state.scanner,

      ...scannerPatch

    }

  };


  emit(
    "scanner"
  );

}



export function updateRecommendations(
  patch
) {

  state = {

    ...state,


    recommendations: {

      ...state.recommendations,

      ...patch

    }

  };


  emit(
    "recommendations"
  );

}



export function updateSignals(
  patch
) {

  state = {

    ...state,


    signals: {

      ...state.signals,

      ...patch

    }

  };


  emit(
    "signals"
  );

}



export function updateAnomalies(
  patch
) {

  state = {

    ...state,


    anomalies: {

      ...state.anomalies,

      ...patch

    }

  };


  emit(
    "anomalies"
  );

}



function emit(
  scope = "all"
) {

  listeners.forEach(
    listener => {

      listener(
        state,
        scope
      );

    }
  );

}
