import {

  APP_CONFIG,

  toBingXSymbol,

  fromBingXSymbol

}
from "../config.js";



export class BingXMarketClient {

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


    this.restTimer =
      null;


    this.intentionalClose =
      false;


    this.restCursor =
      0;


    this.restTick =
      0;

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
          .bingx
          .wsUrl
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


        /*
        WebSocket:
        real-time ticker
        */

        this.subscribeTickers();


        /*
        REST:
        OI + Funding
        */

        this.startRestEnrichment();

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

        this.stopRestEnrichment();


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



  /* =====================================================
  WEBSOCKET TICKER
  ===================================================== */

  subscribeTickers() {

    if(
      !this.ws
      ||
      this.ws.readyState !==
        WebSocket.OPEN
    ) {

      return;

    }


    for(
      const symbol
      of this.symbols
    ) {

      this.ws.send(

        JSON.stringify({

          id:
            createId(),

          reqType:
            "sub",

          dataType:

            `${toBingXSymbol(
              symbol
            )}@ticker`

        })

      );

    }

  }



  async handleMessage(
    raw
  ) {

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


    /*
    BingX heartbeat
    */

    if(
      text
        .trim()
        .toLowerCase()
      ===
      "ping"
    ) {

      if(
        this.ws
        ?.readyState ===
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
        JSON.parse(
          text
        );

    }
    catch {

      return;

    }


    if(
      !payload.data

      ||

      !payload
        .dataType
        ?.endsWith(
          "@ticker"
        )
    ) {

      return;

    }


    const data =
      payload.data;


    const symbol =

      fromBingXSymbol(

        data.s

        ||

        payload
          .dataType
          .split("@")[0]

      );


    const price =
      Number(
        data.c
      );


    /*
    BingX ticker P:
    Price Change Percent
    */

    let change24h =
      Number(
        data.P
      );


    /*
    fallback:
    p = absolute price change
    */

    if(
      !Number.isFinite(
        change24h
      )
    ) {

      const absoluteChange =
        Number(
          data.p || 0
        );


      const previousClose =
        price -
        absoluteChange;


      change24h =

        previousClose > 0

          ?

          (
            absoluteChange
            /
            previousClose
          )

          *

          100

          :

          null;

    }


    this.onTicker?.({

      symbol,

      price,

      change24h,

      volume24h:

        toFiniteNumber(
          data.v
        ),

      timestamp:
        Date.now(),

      source:
        "BINGX"

    });

  }



  /* =====================================================
  BINGX REST ENRICHMENT

  OI endpoint 是逐 Symbol。
  Rate limit 比較低。

  因此使用 Round Robin：
  BTC
  ETH
  SOL
  ...
  每次只打一個。
  ===================================================== */

  startRestEnrichment() {

    this.stopRestEnrichment();


    this.restCursor =
      0;


    this.restTick =
      0;


    const loop =
      async () => {

        if(
          this.intentionalClose
        ) {

          return;

        }


        try {

          /*
          約每 60 秒
          Refresh Funding。
          */

          if(

            this.restTick

            %

            APP_CONFIG
              .bingx
              .fundingEveryTicks

            ===

            0

          ) {

            await this
              .fetchFundingSnapshot();

          }
          else {

            await this
              .fetchNextOpenInterest();

          }

        }
        catch(error) {

          /*
          如果 Browser CORS
          或網路問題，

          不影響 WebSocket Ticker。
          */

          console.debug(

            "BingX REST enrichment unavailable:",

            error?.message
            ||
            error

          );

        }


        this.restTick +=
          1;


        this.restTimer =

          setTimeout(

            loop,

            APP_CONFIG
              .bingx
              .restPollMs

          );

      };


    this.restTimer =

      setTimeout(
        loop,
        400
      );

  }



  stopRestEnrichment() {

    clearTimeout(
      this.restTimer
    );


    this.restTimer =
      null;

  }



  /* =====================================================
  FUNDING

  premiumIndex 可一次取得多個合約，
  不需要逐幣呼叫。
  ===================================================== */

  async fetchFundingSnapshot() {

    const url =
      new URL(

        `${APP_CONFIG.bingx.restBaseUrl}` +
        `/openApi/swap/v2/quote/premiumIndex`

      );


    url.searchParams.set(

      "timestamp",

      String(
        Date.now()
      )

    );


    const payload =
      await fetchJson(
        url.toString()
      );


    const rows =

      Array.isArray(
        payload.data
      )

        ?

        payload.data

        :

        [
          payload.data
        ];


    const allowed =
      new Set(
        this.symbols
      );


    for(
      const item
      of rows
    ) {

      if(!item) {

        continue;

      }


      const symbol =

        fromBingXSymbol(
          item.symbol
        );


      if(
        !allowed.has(
          symbol
        )
      ) {

        continue;

      }


      this.onFunding?.({

        symbol,

        fundingRate:

          toFiniteNumber(
            item.lastFundingRate
          ),

        nextFundingTime:

          Number(
            item.nextFundingTime
          )

          ||

          null,

        timestamp:

          Number(
            item.time
          )

          ||

          Date.now(),

        source:
          "BINGX"

      });

    }

  }



  /* =====================================================
  OPEN INTEREST
  ===================================================== */

  async fetchNextOpenInterest() {

    if(
      !this.symbols.length
    ) {

      return;

    }


    const symbol =

      this.symbols[

        this.restCursor

        %

        this.symbols.length

      ];


    this.restCursor =

      (
        this.restCursor +
        1
      )

      %

      this.symbols.length;


    const url =
      new URL(

        `${APP_CONFIG.bingx.restBaseUrl}` +
        `/openApi/swap/v2/quote/openInterest`

      );


    url.searchParams.set(

      "symbol",

      toBingXSymbol(
        symbol
      )

    );


    url.searchParams.set(

      "timestamp",

      String(
        Date.now()
      )

    );


    const payload =
      await fetchJson(
        url.toString()
      );


    const data =
      payload.data;


    if(!data) {

      return;

    }


    this.onOpenInterest?.({

      symbol,

      /*
      BingX Open Interest
      回傳 base asset 數量。

      market-scanner.js
      會用 price 換成 USD。
      */

      oiCcy:

        toFiniteNumber(
          data.openInterest
        ),

      timestamp:

        Number(
          data.time
        )

        ||

        Date.now(),

      source:
        "BINGX"

    });

  }



  disconnect() {

    this.intentionalClose =
      true;


    clearTimeout(
      this.reconnectTimer
    );


    this.stopRestEnrichment();


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
REST
===================================================== */

async function fetchJson(
  url
) {

  const controller =
    new AbortController();


  const timeout =

    setTimeout(
      () =>
        controller.abort(),
      8000
    );


  try {

    const response =

      await fetch(

        url,

        {
          method:
            "GET",

          headers: {
            Accept:
              "application/json"
          },

          signal:
            controller.signal
        }

      );


    if(
      !response.ok
    ) {

      throw new Error(
        `HTTP ${response.status}`
      );

    }


    const payload =
      await response.json();


    if(

      payload.code !==
      undefined

      &&

      Number(
        payload.code
      )
      !==
      0

    ) {

      throw new Error(

        payload.msg

        ||

        `BingX code ${payload.code}`

      );

    }


    return payload;

  }
  finally {

    clearTimeout(
      timeout
    );

  }

}



/* =====================================================
GZIP
===================================================== */

async function decodeMessage(
  data
) {

  if(
    typeof data ===
    "string"
  ) {

    return data;

  }


  const buffer =

    data instanceof Blob

      ?

      await data.arrayBuffer()

      :

      data;


  if(
    typeof DecompressionStream ===
    "undefined"
  ) {

    return new TextDecoder(
      "utf-8"
    )
    .decode(
      buffer
    );

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
    .decode(
      buffer
    );

  }

}



/* =====================================================
HELPERS
===================================================== */

function createId() {

  if(
    globalThis
      .crypto
      ?.randomUUID
  ) {

    return globalThis
      .crypto
      .randomUUID();

  }


  return (

    `${Date.now()}-`

    +

    Math.random()
      .toString(16)
      .slice(2)

  );

}



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
