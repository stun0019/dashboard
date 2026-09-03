import {
    longRecommendations,
    shortRecommendations,
    activeSignals,
    closedSignals,
    bullishAnomalies,
    bearishAnomalies
}
from "../data/mock-data.js";


let state = {

    exchange:
        "OKX",

    market: {

        symbol:
            "BTC-USDT",

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

    recommendations: {

        long:
            longRecommendations,

        short:
            shortRecommendations

    },

    signals: {

        active:
            activeSignals,

        closed:
            closedSignals

    },

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


export function subscribe(listener) {

    listeners.add(listener);

    return () =>
        listeners.delete(listener);

}


function emit() {

    listeners.forEach(
        listener =>
            listener(state)
    );

}


export function patchState(patch) {

    state = {

        ...state,

        ...patch

    };

    emit();

}


export function updateMarket(patch) {

    state = {

        ...state,

        market: {

            ...state.market,

            ...patch

        }

    };

    emit();

}


export function pushMarketPrice(price) {

    const history = [

        ...state.market.priceHistory,

        Number(price)

    ];


    while(
        history.length > 45
    ) {

        history.shift();

    }


    updateMarket({

        price:
            Number(price),

        priceHistory:
            history,

        lastUpdate:
            Date.now()

    });

}
