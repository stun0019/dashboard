window.BS = window.BS || {};

BS.MarketStore = {
  quotes: new Map(),
  listeners: new Set(),

  setQuote(symbol, quote) {
    const key = String(symbol || "").toUpperCase();

    if (!key) {
      return;
    }

    this.quotes.set(key, {
      ...(this.quotes.get(key) || {}),
      ...quote,
      symbol: key
    });

    this.listeners.forEach(listener => listener(key, quote));
  },

  getQuote(symbol) {
    return this.quotes.get(
      String(symbol || "").toUpperCase()
    ) || {};
  },

  subscribe(listener) {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }
};
