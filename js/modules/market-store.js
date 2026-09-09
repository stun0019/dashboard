window.BS = window.BS || {};

BS.MarketStore = {
  quotes: new Map(),
  listeners: new Set(),

  setQuote(symbol, quote) {
    const normalized = String(symbol || "").toUpperCase();

    if (!normalized) {
      return;
    }

    this.quotes.set(normalized, {
      ...(this.quotes.get(normalized) || {}),
      ...quote,
      symbol: normalized
    });

    this.emit(normalized);
  },

  getQuote(symbol) {
    return this.quotes.get(String(symbol || "").toUpperCase()) || {};
  },

  getQuotes(symbols) {
    return symbols.map(symbol => this.getQuote(symbol));
  },

  subscribe(listener) {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  },

  emit(symbol) {
    for (const listener of this.listeners) {
      listener(symbol, this.getQuote(symbol));
    }
  }
};
