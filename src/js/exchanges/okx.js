import {

  APP_CONFIG,

  toOKXInstrument,

  fromOKXInstrument

}
from "../config.js";



export class OKXMarketClient {

  constructor({

    symbols =
      APP_CONFIG
        .scanner
        .symbols,

    onStatus,

    onTicker,

    onOpenInterest,

    onFunding

  }) {

    this.symbols =
      symbols;


    this.onStatus =
      onStatus;


    this.onTicker =
      onTicker;


    this.onOpenInterest =
      onOpenInterest;


    this.onFunding =
      onFunding;


    this.ws =
      null;


    this.reconnectTimer =
      null;


    this.heartbeatTimer =
      null;


    this.intentionalClose =
      false;

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
        APP_CONFIG
          .okx
          .wsUrl
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


        this.startHeartbeat();

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

        this.stopHeartbeat();


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



  subscribe() {

    if(
      !this.ws
      ||
      this.ws.readyState !==
        WebSocket.OPEN
    ) {

      return;

    }


    const args = [];


    /*
    每個 Symbol 同時訂閱：

    ticker
    OI
    funding
    */

    for(
      const symbol
      of this.symbols
    ) {

      const instId =
        toOKXInstrument(
          symbol
        );


      args.push(

        {
          channel:
            "tickers",

          instId
        },


        {
          channel:
            "open-interest",

          instId
        },


        {
          channel:
            "funding-rate",

          instId
        }

      );

    }


    this.ws.send(

      JSON.stringify({

        id:
          String(
            Date.now()
          ),

        op:
          "subscribe",

        args

      })

    );

  }



  handleMessage(
    raw
  ) {

    /*
    OKX heartbeat response
    */

    if(
      raw === "pong"
    ) {

      return;

    }


    let payload;


    try {

      payload =
        JSON.parse(
          raw
        );

    }
    catch {

      return;

    }


    /*
    某單一 Symbol 不存在，
    不應讓整個 Scanner crash。
    */

    if(
      payload.event ===
      "error"
    ) {

      console.warn(

        "OKX subscription error:",

        payload.code,

        payload.msg

      );


      return;

    }


    if(
      !payload.data
      ||
      !payload.data.length
    ) {

      return;

    }


    const channel =
      payload
        .arg
        ?.channel;


    const data =
      payload.data[0];


    const symbol =

      fromOKXInstrument(

        data.instId

        ||

        payload
          .arg
          ?.instId

      );


    if(!symbol) {

      return;

    }


    /* ===================================================
    TICKER
    =================================================== */

    if(
      channel ===
      "tickers"
    ) {

      const price =
        Number(
          data.last
        );


      const open24h =
        Number(
          data.open24h
        );


      const change24h =

        open24h > 0

          ?

          (
            (
              price -
              open24h
            )

            /

            open24h

          )

          *

          100

          :

          null;


      this.onTicker?.({

        symbol,

        price,

        change24h,

        volume24h:

          toFiniteNumber(

            data.volCcy24h

            ??

            data.vol24h

          ),

        timestamp:

          Number(
            data.ts
          )

          ||

          Date.now(),

        source:
          "OKX"

      });


      return;

    }


    /* ===================================================
    OPEN INTEREST
    =================================================== */

    if(
      channel ===
      "open-interest"
    ) {

      this.onOpenInterest?.({

        symbol,

        oiUsd:

          toFiniteNumber(
            data.oiUsd
          ),

        oiCcy:

          toFiniteNumber(
            data.oiCcy
          ),

        timestamp:

          Number(
            data.ts
          )

          ||

          Date.now(),

        source:
          "OKX"

      });


      return;

    }


    /* ===================================================
    FUNDING
    =================================================== */

    if(
      channel ===
      "funding-rate"
    ) {

      this.onFunding?.({

        symbol,

        fundingRate:

          toFiniteNumber(
            data.fundingRate
          ),

        nextFundingTime:

          Number(
            data.nextFundingTime
          )

          ||

          null,

        timestamp:

          Number(
            data.ts
          )

          ||

          Date.now(),

        source:
          "OKX"

      });

    }

  }



  startHeartbeat() {

    this.stopHeartbeat();


    this.heartbeatTimer =

      setInterval(

        () => {

          if(
            this.ws
            ?.readyState ===
            WebSocket.OPEN
          ) {

            this.ws.send(
              "ping"
            );

          }

        },

        20000

      );

  }



  stopHeartbeat() {

    clearInterval(
      this.heartbeatTimer
    );


    this.heartbeatTimer =
      null;

  }



  disconnect() {

    this.intentionalClose =
      true;


    clearTimeout(
      this.reconnectTimer
    );


    this.stopHeartbeat();


    if(this.ws) {

      this.ws.onclose =
        null;


      this.ws.close();


      this.ws =
        null;

    }

  }

}



/* =====================================================
HELPERS
===================================================== */

function toFiniteNumber(
  value
) {

  const number =
    Number(
      value
    );


  return (

    Number.isFinite(
      number
    )

      ?

      number

      :

      null

  );

}
