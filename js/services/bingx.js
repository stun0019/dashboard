window.BS = window.BS || {};

BS.BingX = {
  WS_URL: "wss://open-api-swap.bingx.com/swap-market",

  socket: null,
  reconnectTimer: null,
  connectionToken: 0,

  symbols: [],

  onStatus: null,
  onTick: null,

  uid() {
    return globalThis.crypto?.randomUUID?.() ||
      Date.now().toString(36) +
      Math.random().toString(36).slice(2);
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
        const stream = new Blob([buffer])
          .stream()
          .pipeThrough(new DecompressionStream("gzip"));

        return await new Response(stream).text();
      } catch {
        // 使用 TextDecoder fallback
      }
    }

    return new TextDecoder().decode(buffer);
  },

  setStatus(state, text) {
    this.onStatus?.(state, text);
  },

  connect(symbols) {
    const normalized = [
      ...new Set(
        symbols
          .map(symbol => String(symbol || "").trim().toUpperCase())
          .filter(Boolean)
      )
    ];

    this.symbols = normalized;

    clearTimeout(this.reconnectTimer);

    const token = ++this.connectionToken;

    if (this.socket) {
      const oldSocket = this.socket;
      this.socket = null;

      try {
        oldSocket.onclose = null;
        oldSocket.onerror = null;
        oldSocket.close();
      } catch {
        // ignore
      }
    }

    this.setStatus("", "BingX 連線中");

    const socket = new WebSocket(this.WS_URL);
    socket.binaryType = "arraybuffer";

    this.socket = socket;

    socket.onopen = () => {
      if (token !== this.connectionToken) {
        socket.close();
        return;
      }

      this.setStatus("on", "BingX 已連線");

      this.symbols.forEach((symbol, index) => {
        setTimeout(() => {
          if (
            token !== this.connectionToken ||
            socket.readyState !== WebSocket.OPEN
          ) {
            return;
          }

          socket.send(JSON.stringify({
            id: this.uid(),
            reqType: "sub",
            dataType: `${symbol}-USDT@ticker`
          }));
        }, index * 20);
      });
    };

    socket.onmessage = async event => {
      if (token !== this.connectionToken) {
        return;
      }

      try {
        const raw = (await this.decodeMessage(event.data)).trim();

        if (raw === "Ping") {
          socket.send("Pong");
          return;
        }

        if (
          raw === "Pong" ||
          !raw.startsWith("{")
        ) {
          return;
        }

        const message = JSON.parse(raw);

        if (
          !message?.data ||
          !String(message.dataType || "").endsWith("@ticker")
        ) {
          return;
        }

        const data = message.data;
        const symbol = String(data.s || "").replace("-USDT", "");

        if (!symbol) {
          return;
        }

        this.onTick?.(symbol, {
          last: Number(data.c),
          open: Number(data.o),
          high: Number(data.h),
          low: Number(data.l),
          volume: Number(data.v),
          change: Number(data.P),
          time: Date.now()
        });
      } catch (error) {
        console.debug("BingX ticker decode error:", error);
      }
    };

    socket.onerror = () => {
      if (token !== this.connectionToken) {
        return;
      }

      this.setStatus("off", "BingX 連線錯誤");
    };

    socket.onclose = () => {
      if (token !== this.connectionToken) {
        return;
      }

      this.setStatus("off", "BingX 已斷線");

      clearTimeout(this.reconnectTimer);

      this.reconnectTimer = setTimeout(() => {
        if (token === this.connectionToken) {
          this.connect(this.symbols);
        }
      }, 3000);
    };
  },

  reconnect() {
    this.connect(this.symbols);
  },

  disconnect() {
    clearTimeout(this.reconnectTimer);

    ++this.connectionToken;

    if (this.socket) {
      try {
        this.socket.close();
      } catch {
        // ignore
      }
    }

    this.socket = null;
    this.setStatus("off", "BingX 已停止");
  }
};
