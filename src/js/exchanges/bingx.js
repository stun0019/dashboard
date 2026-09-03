import {
    APP_CONFIG
}
from "../config.js";


export class BingXMarketClient {

    constructor({

        onStatus,
        onTicker

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
                APP_CONFIG.bingx.wsUrl
            );


        this.ws.binaryType =
            "arraybuffer";


        this.ws.onopen =
            () => {

                this.onStatus?.({

                    connected:
                        true,

                    status:
                        "CONNECTED"

                });


                this.subscribeTicker();

            };


        this.ws.onmessage =
            async event => {

                await this.handleMessage(
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
                            ?
                            "DISCONNECTED"
                            :
                            "RECONNECTING"

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


    subscribeTicker() {

        if(
            !this.ws ||
            this.ws.readyState !==
                WebSocket.OPEN
        ) {

            return;

        }


        const symbol =
            APP_CONFIG.bingx.symbol;


        this.ws.send(

            JSON.stringify({

                id:
                    crypto.randomUUID
                        ?
                        crypto.randomUUID()
                        :
                        String(
                            Date.now()
                        ),

                reqType:
                    "sub",

                dataType:
                    `${symbol}@ticker`

            })

        );

    }


    async handleMessage(raw) {

        let text;


        try {

            text =
                await decodeMessage(
                    raw
                );

        }
        catch(error) {

            console.error(
                "BingX decode error",
                error
            );

            return;

        }


        if(
            text === "Ping" ||
            text.includes("ping")
        ) {

            if(
                this.ws &&
                this.ws.readyState ===
                    WebSocket.OPEN
            ) {

                this.ws.send(
                    "Pong"
                );

            }

            return;

        }


        let payload;


        try {

            payload =
                JSON.parse(text);

        }
        catch {

            return;

        }


        if(
            !payload.data
        ) {

            return;

        }


        if(
            payload.dataType?.endsWith(
                "@ticker"
            )
        ) {

            const data =
                payload.data;


            const price =
                Number(data.c);


            const absoluteChange =
                Number(
                    data.p || 0
                );


            const previousClose =
                price -
                absoluteChange;


            const change24h =
                previousClose
                    ?
                    (
                        absoluteChange
                        /
                        previousClose
                    )
                    * 100
                    :
                    0;


            this.onTicker?.({

                price,

                change24h,

                timestamp:
                    Date.now()

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



async function decodeMessage(data) {

    if(
        typeof data ===
        "string"
    ) {

        return data;

    }


    let buffer;


    if(
        data instanceof Blob
    ) {

        buffer =
            await data.arrayBuffer();

    }
    else {

        buffer =
            data;

    }


    if(
        typeof DecompressionStream ===
        "undefined"
    ) {

        return new TextDecoder(
            "utf-8"
        )
        .decode(buffer);

    }


    try {

        const stream =
            new Blob(
                [buffer]
            )
            .stream()
            .pipeThrough(
                new DecompressionStream(
                    "gzip"
                )
            );


        return await new Response(
            stream
        )
        .text();

    }
    catch {

        return new TextDecoder(
            "utf-8"
        )
        .decode(buffer);

    }

}
