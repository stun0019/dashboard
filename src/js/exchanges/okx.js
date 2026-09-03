import {
    APP_CONFIG
}
from "../config.js";


export class OKXMarketClient {

    constructor({

        onStatus,
        onTicker,
        onOpenInterest

    }) {

        this.ws =
            null;

        this.reconnectTimer =
            null;

        this.intentionalClose =
            false;

        this.onStatus =
            onStatus;

        this.onTicker =
            onTicker;

        this.onOpenInterest =
            onOpenInterest;

    }


    connect() {

        this.disconnect();


        this.intentionalClose =
            false;


        this.onStatus?.({

            connected:
                false,

            status:
                "CONNECTING"

        });


        this.ws =
            new WebSocket(
                APP_CONFIG.okx.wsUrl
            );


        this.ws.onopen =
            () => {

                this.onStatus?.({

                    connected:
                        true,

                    status:
                        "CONNECTED"

                });


                this.subscribe();

            };


        this.ws.onmessage =
            event => {

                this.handleMessage(
                    event.data
                );

            };


        this.ws.onerror =
            () => {

                this.onStatus?.({

                    connected:
                        false,

                    status:
                        "WS ERROR"

                });

            };


        this.ws.onclose =
            () => {

                this.onStatus?.({

                    connected:
                        false,

                    status:
                        this.intentionalClose
                            ? "DISCONNECTED"
                            : "RECONNECTING"

                });


                if(
                    !this.intentionalClose
                ) {

                    this.reconnectTimer =
                        setTimeout(
                            () =>
                                this.connect(),
                            3000
                        );

                }

            };

    }


    subscribe() {

        if(
            !this.ws ||
            this.ws.readyState !==
                WebSocket.OPEN
        ) {

            return;

        }


        const instrument =
            APP_CONFIG.okx.instrument;


        this.ws.send(

            JSON.stringify({

                op:
                    "subscribe",

                args: [

                    {
                        channel:
                            "tickers",

                        instId:
                            instrument
                    },

                    {
                        channel:
                            "open-interest",

                        instId:
                            instrument
                    }

                ]

            })

        );

    }


    handleMessage(raw) {

        let payload;


        try {

            payload =
                JSON.parse(raw);

        }
        catch {

            return;

        }


        if(
            !payload.data ||
            !payload.data.length
        ) {

            return;

        }


        const channel =
            payload.arg?.channel;


        const data =
            payload.data[0];


        if(
            channel ===
            "tickers"
        ) {

            const price =
                Number(data.last);


            const open24h =
                Number(
                    data.open24h
                );


            const change24h =
                open24h
                    ?
                    (
                        (
                            price -
                            open24h
                        )
                        /
                        open24h
                    )
                    * 100
                    :
                    null;


            this.onTicker?.({

                price,

                change24h,

                timestamp:
                    Number(
                        data.ts
                    )

            });

        }


        if(
            channel ===
            "open-interest"
        ) {

            this.onOpenInterest?.({

                oiUsd:
                    Number(
                        data.oiUsd
                    ),

                timestamp:
                    Number(
                        data.ts
                    )

            });

        }

    }


    disconnect() {

        this.intentionalClose =
            true;


        clearTimeout(
            this.reconnectTimer
        );


        if(this.ws) {

            this.ws.onclose =
                null;

            this.ws.close();

            this.ws =
                null;

        }

    }

}
