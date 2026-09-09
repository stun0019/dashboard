window.BS = window.BS || {};

BS.RiskCalculator = {
  decimalPlaces(rawValue) {
    const raw = String(rawValue ?? "").trim();

    if (!raw) {
      return 0;
    }

    if (/e/i.test(raw)) {
      const value = Number(raw);

      if (!Number.isFinite(value)) {
        return 0;
      }

      const normalized = value
        .toFixed(12)
        .replace(/0+$/, "")
        .replace(/\.$/, "");

      const dot = normalized.indexOf(".");

      return dot === -1
        ? 0
        : normalized.length - dot - 1;
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
    leverage,
    balance = BS.Config.balance,
    riskPct = BS.Config.riskPct
  }) {
    const normalizedSymbol = String(symbol || "")
      .trim()
      .toUpperCase();

    const normalizedSide =
      String(side || "long").toLowerCase();

    const entryNumber = Number(entry);
    const slNumber = Number(sl);
    const leverageNumber = Number(leverage);
    const balanceNumber = Number(balance);
    const riskNumber = Number(riskPct);

    if (!normalizedSymbol) {
      return {
        valid: false,
        error: ""
      };
    }

    if (
      !(entryNumber > 0) ||
      !(slNumber > 0) ||
      !(leverageNumber > 0) ||
      !(balanceNumber > 0) ||
      !(riskNumber > 0)
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

    const maxLoss = balanceNumber * riskNumber / 100;
    const stopDistance = Math.abs(entryNumber - slNumber);
    const stopPct = stopDistance / entryNumber * 100;

    const quantity = maxLoss / stopDistance;
    const notional = quantity * entryNumber;
    const margin = notional / leverageNumber;
    const marginPct = margin / balanceNumber * 100;

    const values = [
      maxLoss,
      stopDistance,
      stopPct,
      quantity,
      notional,
      margin,
      marginPct
    ];

    if (!values.every(Number.isFinite)) {
      return {
        valid: false,
        error: "計算超出數值範圍。"
      };
    }

    if (marginPct > 100) {
      return {
        valid: false,
        error:
          `此止損距離在 ${leverageNumber}X 下需要約 ` +
          `${marginPct.toFixed(2)}% 總資金作為保證金，超過可用資金。`,
        data: {
          symbol: normalizedSymbol,
          side: normalizedSide,
          entry: entryNumber,
          sl: slNumber,
          leverage: leverageNumber,
          balance: balanceNumber,
          riskPct: riskNumber,
          maxLoss,
          stopDistance,
          stopPct,
          quantity,
          notional,
          margin,
          marginPct
        }
      };
    }

    return {
      valid: true,
      error: "",
      data: {
        symbol: normalizedSymbol,
        side: normalizedSide,
        entry: entryNumber,
        sl: slNumber,
        leverage: leverageNumber,
        balance: balanceNumber,
        riskPct: riskNumber,
        maxLoss,
        stopDistance,
        stopPct,
        quantity,
        notional,
        margin,
        marginPct
      }
    };
  }
};
