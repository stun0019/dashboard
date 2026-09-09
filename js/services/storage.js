window.BS = window.BS || {};

BS.Storage = {
  RECORDS_KEY: "bryce-strategy-trade-records-v5",

  read(key, fallback) {
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

  write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },

  getRecords() {
    const value = this.read(this.RECORDS_KEY, []);
    return Array.isArray(value) ? value : [];
  },

  saveRecords(records) {
    this.write(this.RECORDS_KEY, records);
  }
};
