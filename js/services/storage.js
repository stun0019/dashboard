window.BS = window.BS || {};

BS.Storage = {
  RECORDS_KEY: "bryce-strategy-records-v3",
  WATCHLIST_KEY: "bryce-strategy-watchlist-v1",

  readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);

      if (!raw) {
        return fallback;
      }

      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  },

  writeJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },

  getRecords() {
    const value = this.readJSON(this.RECORDS_KEY, []);
    return Array.isArray(value) ? value : [];
  },

  saveRecords(records) {
    this.writeJSON(this.RECORDS_KEY, records);
  },

  getWatchlist() {
    const value = this.readJSON(
      this.WATCHLIST_KEY,
      BS.Config.watchlist
    );

    return Array.isArray(value)
      ? [...new Set(value.map(item => String(item).toUpperCase()))]
      : [...BS.Config.watchlist];
  },

  saveWatchlist(symbols) {
    this.writeJSON(
      this.WATCHLIST_KEY,
      [...new Set(symbols.map(item => String(item).toUpperCase()))]
    );
  }
};
