import { APP_CONFIG, fromBingXSymbol } from "../config.js";

export class BingXMarketClient {
  constructor({ instruments = [], onStatus, onTicker, onOpenInterest, onFunding }) {
    this.instruments = instruments;
    this.onStatus = onStatus;
    this.onTicker = onTicker;
    this.onOpenInterest = onOpenInterest;
    this.onFunding = onFunding;
    this.sockets = new Set();
    this.reconnectTimers = new Set();
    this.subscriptionTimers = new Set();
    this.restTimer = null;
    this.restRunning = false;
    this.restGeneration = 0;
    this.restCursor = 0;
    this.restTick = 0;
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
    for (const group of chunk(this.instruments, APP_CONFIG.bingx.instrumentsPerSocket)) {
      this.openSocket(group);
    }
  }

  openSocket(instruments) {
    if (this.intentionalClose) return;

    const socket = new WebSocket(APP_CONFIG.bingx.wsUrl);
    socket.binaryType = "arraybuffer";
    this.sockets.add(socket);

    socket.onopen = () => {
      this.onStatus?.({ connected: true, status: "CONNECTED" });
      this.subscribeTickers(socket, instruments);
      this.startRestEnrichment();
    };
    socket.onmessage = async event => {
      try {
        await this.handleMessage(socket, event.data);
      }
      catch (error) {
        console.error("BingX decode error", error);
      }
    };
    socket.onerror = () => {
      if (!this.intentionalClose && !this.hasOpenSocket()) {
        this.onStatus?.({ connected: false, status: "WS ERROR" });
      }
    };
    socket.onclose = () => {
      this.sockets.delete(socket);
      if (this.intentionalClose) return;

      if (!this.hasOpenSocket()) {
        this.stopRestEnrichment();
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
    instruments.forEach((instrument, index) => {
      const timer = setTimeout(() => {
        this.subscriptionTimers.delete(timer);
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            id: createId(),
            reqType: "sub",
            dataType: `${instrument.instrumentId}@ticker`
          }));
        }
      }, index * 5);
      this.subscriptionTimers.add(timer);
    });
  }

  async handleMessage(socket, data) {
    const text = await decodeMessage(data);
    if (text.trim().toLowerCase() === "ping") {
      if (socket.readyState === WebSocket.OPEN) socket.send("Pong");
      return;
    }

    let payload;
    try {
      payload = JSON.parse(text);
    }
    catch {
      return;
    }

    if (!payload.data || !payload.dataType?.endsWith("@ticker")) return;

    const ticker = payload.data;
    const symbol = fromBingXSymbol(
      ticker.s || payload.dataType.split("@")[0]
    );
    const price = toFiniteNumber(ticker.c);
    if (price === null || price <= 0) return;

    let change24h = toFiniteNumber(ticker.P);
    if (change24h === null) {
      const absoluteChange = toFiniteNumber(ticker.p) ?? 0;
      const previousClose = price - absoluteChange;
      change24h = previousClose > 0
        ? (absoluteChange / previousClose) * 100
        : null;
    }

    this.onTicker?.({
      symbol,
      price,
      change24h,
      volume24h: toFiniteNumber(ticker.v),
      timestamp: toFiniteNumber(ticker.E) ?? Date.now(),
      source: "BINGX"
    });
  }

  startRestEnrichment() {
    if (this.restRunning || this.intentionalClose) return;

    this.restRunning = true;
    const generation = ++this.restGeneration;

    const loop = async () => {
      if (
        generation !== this.restGeneration ||
        this.intentionalClose ||
        !this.hasOpenSocket()
      ) {
        if (generation === this.restGeneration) this.restRunning = false;
        return;
      }

      try {
        if (this.restTick % APP_CONFIG.bingx.fundingEveryTicks === 0) {
          await this.fetchFundingSnapshot();
        }
        else {
          await this.fetchNextOpenInterest();
        }
      }
      catch (error) {
        console.debug("BingX REST enrichment unavailable:", error.message);
      }

      this.restTick += 1;
      if (
        generation !== this.restGeneration ||
        this.intentionalClose ||
        !this.hasOpenSocket()
      ) {
        if (generation === this.restGeneration) this.restRunning = false;
        return;
      }
      this.restTimer = setTimeout(loop, APP_CONFIG.bingx.restPollMs);
    };

    void loop();
  }

  stopRestEnrichment() {
    this.restGeneration += 1;
    clearTimeout(this.restTimer);
    this.restTimer = null;
    this.restRunning = false;
  }

  async fetchFundingSnapshot() {
    const payload = await fetchJson(`${APP_CONFIG.bingx.restBaseUrl}/funding`);
    const rows = Array.isArray(payload.data) ? payload.data : [payload.data];
    const allowed = new Set(this.instruments.map(item => item.instrumentId));

    for (const item of rows) {
      if (!item || !allowed.has(item.symbol)) continue;
      this.onFunding?.({
        symbol: fromBingXSymbol(item.symbol),
        fundingRate: toFiniteNumber(item.lastFundingRate),
        nextFundingTime: toFiniteNumber(item.nextFundingTime),
        timestamp: toFiniteNumber(item.time) ?? Date.now(),
        source: "BINGX"
      });
    }
  }

  async fetchNextOpenInterest() {
    if (!this.instruments.length) return;

    const instrument = this.instruments[this.restCursor % this.instruments.length];
    this.restCursor = (this.restCursor + 1) % this.instruments.length;
    const url = new URL(
      `${APP_CONFIG.bingx.restBaseUrl}/open-interest`,
      window.location.origin
    );
    url.searchParams.set("symbol", instrument.instrumentId);

    const payload = await fetchJson(url.toString());
    if (!payload.data) return;

    this.onOpenInterest?.({
      symbol: instrument.symbol,
      oiCcy: toFiniteNumber(payload.data.openInterest),
      timestamp: toFiniteNumber(payload.data.time) ?? Date.now(),
      source: "BINGX"
    });
  }

  hasOpenSocket() {
    return [...this.sockets].some(socket => socket.readyState === WebSocket.OPEN);
  }

  disconnect() {
    this.intentionalClose = true;
    this.stopRestEnrichment();
    for (const timer of this.reconnectTimers) clearTimeout(timer);
    for (const timer of this.subscriptionTimers) clearTimeout(timer);
    this.reconnectTimers.clear();
    this.subscriptionTimers.clear();
    this.restCursor = 0;
    this.restTick = 0;

    for (const socket of this.sockets) {
      socket.onclose = null;
      socket.close();
    }
    this.sockets.clear();
  }
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(10_000)
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const payload = await response.json();
  if (payload.code !== undefined && Number(payload.code) !== 0) {
    throw new Error(payload.msg || `BingX code ${payload.code}`);
  }
  return payload;
}

async function decodeMessage(data) {
  if (typeof data === "string") return data;
  const buffer = data instanceof Blob ? await data.arrayBuffer() : data;

  if (typeof DecompressionStream === "undefined") {
    return new TextDecoder("utf-8").decode(buffer);
  }

  try {
    const stream = new Blob([buffer])
      .stream()
      .pipeThrough(new DecompressionStream("gzip"));
    return await new Response(stream).text();
  }
  catch {
    return new TextDecoder("utf-8").decode(buffer);
  }
}

function createId() {
  return globalThis.crypto?.randomUUID?.() ||
    `${Date.now()}-${Math.random().toString(16).slice(2)}`;
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
