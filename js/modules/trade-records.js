window.BS = window.BS || {};

BS.TradeRecords = {
  records: [],

  init() {
    this.records = BS.Storage.getRecords();
  },

  uid() {
    if (globalThis.crypto && crypto.randomUUID) {
      return crypto.randomUUID();
    }

    return (
      Date.now().toString(36) +
      Math.random().toString(36).slice(2)
    );
  },

  getAll() {
    return [...this.records];
  },

  add(record) {
    const newRecord = {
      id: this.uid(),
      createdAt: new Date().toISOString(),
      ...record
    };

    this.records.push(newRecord);
    BS.Storage.saveRecords(this.records);

    return newRecord;
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
