window.BS = window.BS || {};

BS.BingX = {
  WS_URL: "wss://open-api-swap.bingx.com/swap-market",

  socket: null,
  reconnectTimer: null,
  manualClose: false,
  symbols: [],

  onStatus: null,
  onTick: null,

  uid() {
    if (globalThis.crypto && crypto.randomUUID) {
      return crypto.randomUUID();
    }

    return (
      Date.now().toString(36) +
      Math.random().toString(36).slice(2)
    );
  },

  symbolKey(symbol) {
    return `${symbol}-USDT`;
  },

  async decodeMessage(data) {
    if (typeof data === "string") {
      return data;
    }

    const buffer =
      data instanceof Blob
        ? await data.arrayBuffer()
        : data;

    if ("DecompressionStream" in window) {
      try {
        const ds = new DecompressionStream("gzip");
        const stream = new Blob([buffer])
          .stream()
          .pipeThrough(ds);

        return await new Response(stream).text();
      } catch {
        // fallback below
      }
    }

    return new TextDecoder().decode(buffer);
  },

  setStatus(state, text) {
    if (typeof this.onStatus === "function") {
      this.onStatus(state, text);
    }
  },

  connect(symbols) {
    this.symbols = [...new Set(symbols.map(s => String(s).toUpperCase()))];
    this.manualClose = false;

    clearTimeout(this.reconnectTimer);

    if (
      this.socket &&
      (
        this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING
      )
    ) {
      this.socket.close();
    }

    this.setStatus("", "BingX 連線中");

    const socket = new WebSocket(this.WS_URL);
    socket.binaryType = "arraybuffer";

    this.socket = socket;

    socket.onopen = () => {
      this.setStatus("on", "BingX 已連線");

      this.symbols.forEach((symbol, index) => {
        setTimeout(() => {
          if (socket.readyState !== WebSocket.OPEN) {
            return;
          }

          socket.send(
            JSON.stringify({
              id: this.uid(),
              reqType: "sub",
              dataType: `${this.symbolKey(symbol)}@ticker`
            })
          );
        }, index * 25);
      });
    };

    socket.onmessage = async event => {
      try {
        const raw = (await this.decodeMessage(event.data)).trim();

        if (raw === "Ping") {
          socket.send("Pong");
          return;
        }

        if (raw === "Pong" || !raw.startsWith("{")) {
          return;
        }

        const message = JSON.parse(raw);

        if (
          !message ||
          !message.data ||
          !String(message.dataType || "").endsWith("@ticker")
        ) {
          return;
        }

        const data = message.data;
        const symbol = String(data.s || "").replace("-USDT", "");

        if (!symbol) {
          return;
        }

        const quote = {
          last: Number(data.c),
          high: Number(data.h),
          low: Number(data.l),
          volume: Number(data.v),
          change: Number(data.P),
          time: Date.now()
        };

        if (typeof this.onTick === "function") {
          this.onTick(symbol, quote);
        }
      } catch (error) {
        console.debug("BingX WebSocket decode error:", error);
      }
    };

    socket.onerror = () => {
      this.setStatus("off", "BingX 連線錯誤");
    };

    socket.onclose = () => {
      this.setStatus("off", "BingX 已斷線");

      if (this.manualClose) {
        return;
      }

      clearTimeout(this.reconnectTimer);

      this.reconnectTimer = setTimeout(() => {
        this.connect(this.symbols);
      }, 3000);
    };
  },

  reconnect() {
    this.manualClose = false;
    this.connect(this.symbols);
  },

  disconnect() {
    this.manualClose = true;
    clearTimeout(this.reconnectTimer);

    if (this.socket) {
      this.socket.close();
    }
  }
};
