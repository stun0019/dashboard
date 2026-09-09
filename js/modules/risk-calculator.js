window.BS = window.BS || {};

BS.RiskCalculator = {
  decimalPlaces(rawValue) {
    const raw = String(rawValue ?? "").trim();

    if (!raw) {
      return 0;
    }

    const dot = raw.indexOf(".");

    return dot === -1
      ? 0
      : raw.length - dot - 1;
  },

  calculate({
    symbol,
    side,
    entry,
    sl,
    leverage
  }) {
    const normalizedSymbol =
      String(symbol || "").trim().toUpperCase();

    const normalizedSide =
      String(side || "long").toLowerCase();

    const entryNumber = Number(entry);
    const slNumber = Number(sl);
    const leverageNumber = Number(leverage);

    if (
      !normalizedSymbol ||
      !(entryNumber > 0) ||
      !(slNumber > 0) ||
      !(leverageNumber > 0)
    ) {
      return {
        valid: false,
        error: ""
      };
    }

    if (
      normalizedSide === "long" &&
      slNumber >= entryNumber
    ) {
      return {
        valid: false,
        error: "LONG 的止損價必須低於進場價。"
      };
    }

    if (
      normalizedSide === "short" &&
      slNumber <= entryNumber
    ) {
      return {
        valid: false,
        error: "SHORT 的止損價必須高於進場價。"
      };
    }

    const balance = BS.Config.balance;
    const riskPct = BS.Config.riskPct;

    const maxLoss = balance * riskPct / 100;
    const stopDistance = Math.abs(entryNumber - slNumber);
    const stopPct = stopDistance / entryNumber * 100;

    const quantity = maxLoss / stopDistance;
    const notional = quantity * entryNumber;
    const margin = notional / leverageNumber;
    const marginPct = margin / balance * 100;

    const numbers = [
      maxLoss,
      stopDistance,
      stopPct,
      quantity,
      notional,
      margin,
      marginPct
    ];

    if (!numbers.every(Number.isFinite)) {
      return {
        valid: false,
        error: "計算超出數值範圍。"
      };
    }

    const data = {
      symbol: normalizedSymbol,
      side: normalizedSide,
      entry: entryNumber,
      sl: slNumber,
      leverage: leverageNumber,
      balance,
      riskPct,
      maxLoss,
      stopDistance,
      stopPct,
      quantity,
      notional,
      margin,
      marginPct
    };

    if (marginPct > 100) {
      return {
        valid: false,
        error:
          `此止損距離在 ${leverageNumber}X 下需要約 ` +
          `${marginPct.toFixed(2)}% 總資金作為保證金，超過可用資金。`,
        data
      };
    }

    return {
      valid: true,
      error: "",
      data
    };
  }
};
