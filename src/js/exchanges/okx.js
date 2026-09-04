import { APP_CONFIG, fromOKXInstrument } from "../config.js";

export class OKXMarketClient {
  constructor({ instruments = [], onStatus, onTicker, onOpenInterest, onFunding, onCandle }) {
    this.instruments = instruments;
    this.onStatus = onStatus;
    this.onTicker = onTicker;
    this.onOpenInterest = onOpenInterest;
    this.onFunding = onFunding;
    this.onCandle = onCandle;
    this.sockets = new Set();
    this.reconnectTimers = new Set();
    this.heartbeatTimers = new Map();
    this.subscriptionTimers = new Set();
    this.lastPrices = new Map();
    this.socketInstruments = new Map();
    this.enrichmentSubscriptions = new Map();
    this.candidateIds = new Set();
    this.candleSnapshots = new Map();
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
    this.socketInstruments.set(socket, instruments);

    socket.onopen = () => {
      this.onStatus?.({ connected: true, status: "CONNECTED" });
      this.subscribeTickers(socket, instruments);
      this.syncCandidateSubscriptions(socket);
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

  subscribeTickers(socket, instruments) {
    const args = instruments.map(instrument => ({
      channel: "tickers",
      instId: instrument.instrumentId
    }));

    this.sendBatched(socket, "subscribe", args);
  }

  setCandidates(instrumentIds) {
    this.candidateIds = new Set(instrumentIds);
    for (const socket of this.sockets) {
      if (socket.readyState === WebSocket.OPEN) this.syncCandidateSubscriptions(socket);
    }
  }

  syncCandidateSubscriptions(socket) {
    const group = this.socketInstruments.get(socket) || [];
    const desired = new Set(
      group
        .map(instrument => instrument.instrumentId)
        .filter(instrumentId => this.candidateIds.has(instrumentId))
    );
    const current = this.enrichmentSubscriptions.get(socket) || new Set();
    const added = [...desired].filter(instrumentId => !current.has(instrumentId));
    const removed = [...current].filter(instrumentId => !desired.has(instrumentId));
    const channels = ["open-interest", "funding-rate"];

    for (const instId of desired) {
      const lastSnapshot = this.candleSnapshots.get(instId) || 0;
      if (Date.now() - lastSnapshot >= 60_000) {
        this.candleSnapshots.set(instId, Date.now());
        void this.fetchCandleSnapshot(instId);
      }
    }

    this.sendBatched(socket, "subscribe", added.flatMap(instId =>
      channels.map(channel => ({ channel, instId }))
    ));
    this.sendBatched(socket, "unsubscribe", removed.flatMap(instId =>
      channels.map(channel => ({ channel, instId }))
    ));
    this.enrichmentSubscriptions.set(socket, desired);
  }

  async fetchCandleSnapshot(instId) {
    try {
      const url = new URL("/api/v5/market/candles", APP_CONFIG.okx.restBaseUrl);
      url.searchParams.set("instId", instId);
      url.searchParams.set("bar", "15m");
      url.searchParams.set("limit", "20");
      const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      if (String(payload.code) !== "0" || !Array.isArray(payload.data)) return;

      const symbol = fromOKXInstrument(instId);
      for (const candle of payload.data.reverse()) {
        this.onCandle?.({
          symbol,
          candle: {
            timestamp: toFiniteNumber(candle[0]) ?? Date.now(),
            open: toFiniteNumber(candle[1]),
            high: toFiniteNumber(candle[2]),
            low: toFiniteNumber(candle[3]),
            close: toFiniteNumber(candle[4]),
            volume: toFiniteNumber(candle[5]),
            confirmed: String(candle[8]) === "1"
          },
          source: "OKX"
        });
      }
    }
    catch (error) {
      this.candleSnapshots.delete(instId);
      console.debug("OKX candle snapshot unavailable:", error.message);
    }
  }

  sendBatched(socket, operation, args) {
    if (!args.length) return;

    chunk(args, APP_CONFIG.okx.subscribeBatchSize).forEach((batch, index) => {
      const timer = setTimeout(() => {
        this.subscriptionTimers.delete(timer);
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ op: operation, args: batch }));
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

    if (channel?.startsWith("candle")) {
      const symbol = fromOKXInstrument(payload.arg?.instId);
      for (const candle of payload.data) {
        if (!Array.isArray(candle)) continue;
        this.onCandle?.({
          symbol,
          candle: {
            timestamp: toFiniteNumber(candle[0]) ?? Date.now(),
            open: toFiniteNumber(candle[1]),
            high: toFiniteNumber(candle[2]),
            low: toFiniteNumber(candle[3]),
            close: toFiniteNumber(candle[4]),
            volume: toFiniteNumber(candle[5]),
            confirmed: String(candle[8]) === "1"
          },
          source: "OKX"
        });
      }
      return;
    }

    for (const data of payload.data) {
      const instrumentId = data.instId || payload.arg?.instId;
      const symbol = fromOKXInstrument(instrumentId);
      if (!symbol) continue;

      if (channel === "tickers") {
        const price = toFiniteNumber(data.last);
        const open24h = toFiniteNumber(data.open24h);
        const volumeBase24h = toFiniteNumber(data.volCcy24h);
        if (price !== null) this.lastPrices.set(instrumentId, price);

        this.onTicker?.({
          symbol,
          price,
          change24h: price !== null && open24h > 0
            ? ((price - open24h) / open24h) * 100
            : null,
          volume24h: volumeBase24h,
          volumeNotional24h: price !== null && volumeBase24h !== null
            ? volumeBase24h * price
            : null,
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
    this.socketInstruments.delete(socket);
    this.enrichmentSubscriptions.delete(socket);
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
    this.socketInstruments.clear();
    this.enrichmentSubscriptions.clear();
    this.candidateIds.clear();
    this.candleSnapshots.clear();
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
