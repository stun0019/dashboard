window.BS = window.BS || {};

BS.TradeRecords = {
  records: [],

  init() {
    this.records = BS.Storage.getRecords();
  },

  uid() {
    return globalThis.crypto?.randomUUID?.() ||
      Date.now().toString(36) +
      Math.random().toString(36).slice(2);
  },

  all() {
    return [...this.records];
  },

  add(record) {
    this.records.push({
      id: this.uid(),
      createdAt: new Date().toISOString(),
      ...record
    });

    BS.Storage.saveRecords(this.records);
  },

  remove(id) {
    this.records = this.records.filter(
      record => record.id !== id
    );

    BS.Storage.saveRecords(this.records);
  },

  clear() {
    this.records = [];
    BS.Storage.saveRecords(this.records);
  }
};
