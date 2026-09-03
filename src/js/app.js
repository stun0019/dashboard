import {
    APP_CONFIG
}
from "./config.js";


import {

    getState,

    subscribe,

    setExchange,

    updateMarket,

    updateTicker

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

        /*
        v0.2.1

        原本：
        pushMarketPrice()
        +
        updateMarket()

        一次 ticker 會 emit 兩次。

        現在改成 updateTicker()
        一次完成：
        price
        change24h
        timestamp
        priceHistory
        */

        updateTicker({

            price,

            change24h,

            timestamp:
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

                oiUsd,

                timestamp

            }) {

                updateMarket({

                    oiUsd,


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

        }),


    BINGX:

        new BingXMarketClient({

            ...commonCallbacks

        })

};



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
    一次重置交易所與 Market State。
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

    /*
    UI Renderer
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
    Trade Modal
    */

    initTradeModal();


    /*
    AI Copilot
    */

    initAIPanel(
        getState
    );


    /*
    Exchange selector
    */

    initExchangeSelector();


    /*
    Store subscription

    scope:
    market
    recommendations
    signals
    anomalies
    all
    */

    subscribe(
        (
            state,
            scope
        ) => {

            renderApp(
                state,
                scope
            );

        }
    );


    /*
    Initial render
    */

    renderApp(
        getState(),
        "all"
    );


    /*
    Initial WebSocket
    */

    connectExchange(
        APP_CONFIG.defaultExchange
    );

}



/*
離開頁面時，
主動關閉 WebSocket。
*/

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
