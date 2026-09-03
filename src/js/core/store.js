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



export function patchState(

    patch,

    scope = "all"

) {

    state = {

        ...state,

        ...patch

    };


    emit(
        scope
    );

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

        }

    };


    emit(
        "market"
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

        ...state.market.priceHistory,

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

                    state.market.change24h,


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
