import {
    APP_CONFIG
}
from "./config.js";


import {

    getState,
    subscribe,
    patchState,
    updateMarket,
    pushMarketPrice

}
from "./core/store.js";


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

        price,
        change24h,
        timestamp

    }) {

        pushMarketPrice(
            price
        );


        updateMarket({

            change24h,

            lastUpdate:
                timestamp ||
                Date.now()

        });

    }

};



const clients = {

    OKX:
        new OKXMarketClient({

            ...commonCallbacks,

            onOpenInterest({
                oiUsd
            }) {

                updateMarket({

                    oiUsd

                });

            }

        }),


    BINGX:
        new BingXMarketClient({

            ...commonCallbacks

        })

};



function connectExchange(
    exchange
) {

    activeClient?.disconnect();


    patchState({

        exchange

    });


    updateMarket({

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

        priceHistory:
            []

    });


    activeClient =
        clients[exchange];


    activeClient.connect();

}



function initExchangeSelector() {

    const select =
        document.getElementById(
            "exchangeSelect"
        );


    select.value =
        APP_CONFIG.defaultExchange;


    select.addEventListener(
        "change",
        () => {

            connectExchange(
                select.value
            );

        }
    );

}



function init() {

    initRenderer({

        onTrade(
            signal
        ) {

            openTradeModal(

                signal,

                getState().exchange

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


    initTradeModal();


    initAIPanel(
        getState
    );


    initExchangeSelector();


    subscribe(
        state => {

            renderApp(
                state
            );

        }
    );


    renderApp(
        getState()
    );


    connectExchange(
        APP_CONFIG.defaultExchange
    );

}



document.addEventListener(
    "DOMContentLoaded",
    init
);
