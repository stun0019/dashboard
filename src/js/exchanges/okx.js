import { APP_CONFIG, fromOKXInstrument } from "../config.js";

export class OKXMarketClient {
  constructor({ instruments = [], onStatus, onTicker, onOpenInterest, onFunding }) {
    this.instruments = instruments;
    this.onStatus = onStatus;
    this.onTicker = onTicker;
    this.onOpenInterest = onOpenInterest;
    this.onFunding = onFunding;
    this.sockets = new Set();
    this.reconnectTimers = new Set();
    this.heartbeatTimers = new Map();
    this.subscriptionTimers = new Set();
    this.lastPrices = new Map();
    this.intentionalClose = false;
  }

  connect() {
    this.disconnect();
    this.intentionalClose = false;

    if (!this.instruments.length) {
      this.onStatus?.({ connected: false, status: "NO INSTRUMENTS" });
      return;
    }

    this.onStatus?.({ connected: false, status: "CONNECTING" });
    for (const group of chunk(this.instruments, APP_CONFIG.okx.instrumentsPerSocket)) {
      this.openSocket(group);
    }
  }

  openSocket(instruments) {
    if (this.intentionalClose) return;

    const socket = new WebSocket(APP_CONFIG.okx.wsUrl);
    this.sockets.add(socket);

    socket.onopen = () => {
      this.onStatus?.({ connected: true, status: "CONNECTED" });
      this.subscribe(socket, instruments);
      const heartbeat = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) socket.send("ping");
      }, 20_000);
      this.heartbeatTimers.set(socket, heartbeat);
    };

    socket.onmessage = event => this.handleMessage(event.data);
    socket.onerror = () => {
      if (!this.intentionalClose && !this.hasOpenSocket()) {
        this.onStatus?.({ connected: false, status: "WS ERROR" });
      }
    };
    socket.onclose = () => {
      this.clearSocket(socket);
      if (this.intentionalClose) return;

      if (!this.hasOpenSocket()) {
        this.onStatus?.({ connected: false, status: "RECONNECTING" });
      }
      const timer = setTimeout(() => {
        this.reconnectTimers.delete(timer);
        this.openSocket(instruments);
      }, 3_000);
      this.reconnectTimers.add(timer);
    };
  }

  subscribe(socket, instruments) {
    const args = instruments.flatMap(instrument => [
      { channel: "tickers", instId: instrument.instrumentId },
      { channel: "open-interest", instId: instrument.instrumentId },
      { channel: "funding-rate", instId: instrument.instrumentId }
    ]);

    chunk(args, APP_CONFIG.okx.subscribeBatchSize).forEach((batch, index) => {
      const timer = setTimeout(() => {
        this.subscriptionTimers.delete(timer);
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ op: "subscribe", args: batch }));
        }
      }, index * 100);
      this.subscriptionTimers.add(timer);
    });
  }

  handleMessage(raw) {
    if (raw === "pong") return;

    let payload;
    try {
      payload = JSON.parse(raw);
    }
    catch {
      return;
    }

    if (payload.event === "error") {
      console.warn("OKX subscription error:", payload.code, payload.msg);
      return;
    }
    if (!Array.isArray(payload.data) || !payload.data.length) return;

    const channel = payload.arg?.channel;
    for (const data of payload.data) {
      const instrumentId = data.instId || payload.arg?.instId;
      const symbol = fromOKXInstrument(instrumentId);
      if (!symbol) continue;

      if (channel === "tickers") {
        const price = toFiniteNumber(data.last);
        const open24h = toFiniteNumber(data.open24h);
        if (price !== null) this.lastPrices.set(instrumentId, price);

        this.onTicker?.({
          symbol,
          price,
          change24h: price !== null && open24h > 0
            ? ((price - open24h) / open24h) * 100
            : null,
          volume24h: toFiniteNumber(data.volCcy24h) ?? toFiniteNumber(data.vol24h),
          timestamp: toFiniteNumber(data.ts) ?? Date.now(),
          source: "OKX"
        });
        continue;
      }

      if (channel === "open-interest") {
        const oiCcy = toFiniteNumber(data.oiCcy);
        const directOiUsd = toFiniteNumber(data.oiUsd);
        const lastPrice = this.lastPrices.get(instrumentId);
        const fallbackOiUsd = oiCcy !== null && Number.isFinite(lastPrice)
          ? oiCcy * lastPrice
          : null;

        this.onOpenInterest?.({
          symbol,
          oiUsd: directOiUsd !== null && directOiUsd > 0 ? directOiUsd : fallbackOiUsd,
          oiUsdSource: directOiUsd !== null && directOiUsd > 0 ? "direct" : "derived",
          oiCcy,
          timestamp: toFiniteNumber(data.ts) ?? Date.now(),
          source: "OKX"
        });
        continue;
      }

      if (channel === "funding-rate") {
        this.onFunding?.({
          symbol,
          fundingRate: toFiniteNumber(data.fundingRate),
          nextFundingTime: toFiniteNumber(data.nextFundingTime),
          timestamp: toFiniteNumber(data.ts) ?? Date.now(),
          source: "OKX"
        });
      }
    }
  }

  hasOpenSocket() {
    return [...this.sockets].some(socket => socket.readyState === WebSocket.OPEN);
  }

  clearSocket(socket) {
    clearInterval(this.heartbeatTimers.get(socket));
    this.heartbeatTimers.delete(socket);
    this.sockets.delete(socket);
  }

  disconnect() {
    this.intentionalClose = true;
    for (const timer of this.reconnectTimers) clearTimeout(timer);
    for (const timer of this.subscriptionTimers) clearTimeout(timer);
    this.reconnectTimers.clear();
    this.subscriptionTimers.clear();

    for (const socket of this.sockets) {
      clearInterval(this.heartbeatTimers.get(socket));
      socket.onclose = null;
      socket.close();
    }
    this.sockets.clear();
    this.heartbeatTimers.clear();
    this.lastPrices.clear();
  }
}

function chunk(items, size) {
  const groups = [];
  for (let index = 0; index < items.length; index += size) {
    groups.push(items.slice(index, index + size));
  }
  return groups;
}

function toFiniteNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
