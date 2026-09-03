export function createEmptyScannerRows(
  symbols
) {

  return Object.fromEntries(

    symbols.map(
      symbol => [
        symbol,
        createEmptyRow(symbol)
      ]
    )

  );

}



export function mergeScannerRow(
  current,
  patch
) {

  const base =
    current ||
    createEmptyRow(
      patch.symbol || ""
    );


  const next = {

    ...base,

    ...cleanPatch(
      patch
    ),

    updatedAt:
      Date.now()

  };


  const patchHasDirectOiUsd =
    Object.prototype.hasOwnProperty.call(patch || {}, "oiUsd") &&
    isPositive(patch.oiUsd) &&
    patch.oiUsdSource !== "derived";

  if (patchHasDirectOiUsd) {
    next.oiUsd = Number(patch.oiUsd);
    next.oiUsdSource = "direct";
  }
  else if (
    next.oiUsdSource !== "direct" &&
    isPositive(next.oiCcy) &&
    isPositive(next.price)
  ) {
    // BingX only supplies base-asset OI. Revalue that derived amount
    // when a newer ticker arrives, but never overwrite official oiUsd.
    next.oiUsd = Number(next.oiCcy) * Number(next.price);
    next.oiUsdSource = "derived";
  }
  else if (
    next.oiUsdSource !== "direct" &&
    patch?.oiUsdSource === "derived" &&
    isPositive(patch.oiUsd)
  ) {
    next.oiUsd = Number(patch.oiUsd);
    next.oiUsdSource = "derived";
  }


  /*
  第一次收到 OI 時，
  當成這次 Session 的 baseline。

  後續就能計算 Session OI change。
  */

  if(
    isPositive(next.oiUsd) &&
    !isPositive(next.oiBaselineUsd)
  ) {

    next.oiBaselineUsd =
      Number(next.oiUsd);

  }


  if(
    isPositive(next.oiUsd) &&
    isPositive(next.oiBaselineUsd)
  ) {

    next.oiChangePct =

      (
        (
          Number(next.oiUsd) -
          Number(next.oiBaselineUsd)
        )

        /

        Number(next.oiBaselineUsd)

      )

      *

      100;

  }


  return next;

}



export function analyzeScannerRows(
  rows,
  rankingLimit = 5,
  staleAfterMs = 15_000,
  now = Date.now()
) {

  const enrichedRows = {};

  const readyRows = [];


  /*
  計算每一個幣的 Scanner Score
  */

  for(
    const [
      symbol,
      row
    ]
    of Object.entries(rows)
  ) {

    const tickerState = getFreshness(row.tickerUpdatedAt, isPositive(row.price), staleAfterMs, now);
    const oiState = getFreshness(
      row.oiUpdatedAt,
      isPositive(row.oiUsd) || isPositive(row.oiCcy),
      staleAfterMs,
      now
    );
    const fundingState = getFreshness(
      row.fundingUpdatedAt,
      hasFiniteValue(row.fundingRate),
      staleAfterMs,
      now
    );
    const isStale = tickerState === "stale";

    const score = scoreRow(row);
    const scored = {
      ...score,
      tickerState,
      oiState,
      fundingState,
      tickerStale: tickerState === "stale",
      oiStale: oiState === "stale",
      fundingStale: fundingState === "stale",
      dataComplete: tickerState !== "missing" && oiState !== "missing" && fundingState !== "missing",
      isStale,
      bias: isStale ? "STALE" : score.bias
    };


    enrichedRows[symbol] =
      scored;


    if(
      isPositive(scored.price) &&
      !scored.isStale
    ) {

      readyRows.push(
        scored
      );

    }

  }


  /*
  LONG Ranking
  */

  const longRanking =

    [...readyRows]

      .sort(
        (a, b) =>
          b.longScore -
          a.longScore
      )

      .slice(
        0,
        rankingLimit
      )

      .map(
        row =>
          toRankingItem(
            row,
            "LONG"
          )
      );


  /*
  SHORT Ranking
  */

  const shortRanking =

    [...readyRows]

      .sort(
        (a, b) =>
          b.shortScore -
          a.shortScore
      )

      .slice(
        0,
        rankingLimit
      )

      .map(
        row =>
          toRankingItem(
            row,
            "SHORT"
          )
      );


  const bullishCount =

    readyRows.filter(
      row =>

        row.longScore >= 60

        &&

        row.longScore >
        row.shortScore

    ).length;


  const bearishCount =

    readyRows.filter(
      row =>

        row.shortScore >= 60

        &&

        row.shortScore >
        row.longScore

    ).length;


  const anomalyCount =

    readyRows.filter(
      isAnomalous
    ).length;


  return {

    rows:
      enrichedRows,

    longRanking,

    shortRanking,

    scannedCount:
      readyRows.length,

    bullishCount,

    bearishCount,

    anomalyCount,

    staleCount:
      Object.values(enrichedRows)
        .filter(row => row.isStale)
        .length,

    oiStaleCount:
      Object.values(enrichedRows)
        .filter(row => row.oiStale)
        .length,

    fundingStaleCount:
      Object.values(enrichedRows)
        .filter(row => row.fundingStale)
        .length,

    incompleteCount:
      Object.values(enrichedRows)
        .filter(row => !row.dataComplete)
        .length,

    updatedAt:
      Date.now()

  };

}



/* =====================================================
EMPTY ROW
===================================================== */

function createEmptyRow(
  symbol
) {

  return {

    symbol,

    price:
      null,

    change24h:
      null,

    volume24h:
      null,

    /*
    oiCcy:
    base asset OI

    oiUsd:
    USD notion
    */

    oiCcy:
      null,

    oiUsd:
      null,

    oiUsdSource:
      null,

    oiBaselineUsd:
      null,

    oiChangePct:
      null,

    fundingRate:
      null,

    nextFundingTime:
      null,

    tickerUpdatedAt:
      null,

    oiUpdatedAt:
      null,

    fundingUpdatedAt:
      null,

    isStale:
      false,

    tickerState:
      "missing",

    oiState:
      "missing",

    fundingState:
      "missing",

    tickerStale:
      false,

    oiStale:
      false,

    fundingStale:
      false,

    dataComplete:
      false,

    longScore:
      50,

    shortScore:
      50,

    bias:
      "WAIT",

    source:
      null,

    updatedAt:
      null

  };

}



/* =====================================================
SCORING
===================================================== */

function scoreRow(
  row
) {

  if(
    !isPositive(
      row.price
    )
  ) {

    return {

      ...row,

      longScore:
        50,

      shortScore:
        50,

      bias:
        "WAIT"

    };

  }


  /*
  v0.3 Scanner Score

  24H Momentum
  約 ±6% 以上視為 full strength
  */

  const changeBias =

    clamp(

      toNumber(
        row.change24h
      )
      /
      6,

      -1,

      1

    );


  /*
  Session OI change

  約 ±2% 視為 full strength。
  */

  const oiBias =

    clamp(

      toNumber(
        row.oiChangePct
      )
      /
      2,

      -1,

      1

    );


  /*
  fundingRate 原始格式：

  0.0001
  =
  0.01%

  Funding 太正代表 Long crowded，
  所以 LONG score 小幅扣分。

  Funding 太負則反過來。
  */

  const fundingPercent =

    toNumber(
      row.fundingRate
    )

    *

    100;


  const fundingCrowding =

    clamp(

      fundingPercent
      /
      0.05,

      -1,

      1

    );


  /*
  Score Weight

  Base              50
  Momentum          ±30
  OI                ±15
  Funding crowding  ±5
  */

  const longScore =

    clamp(

      Math.round(

        50

        +

        changeBias *
        30

        +

        oiBias *
        15

        -

        fundingCrowding *
        5

      ),

      0,

      100

    );


  const shortScore =

    clamp(

      Math.round(

        50

        -

        changeBias *
        30

        -

        oiBias *
        15

        +

        fundingCrowding *
        5

      ),

      0,

      100

    );


  let bias =
    "NEUTRAL";


  if(
    longScore -
    shortScore
    >=
    8
  ) {

    bias =
      "LONG";

  }


  if(
    shortScore -
    longScore
    >=
    8
  ) {

    bias =
      "SHORT";

  }


  return {

    ...row,

    longScore,

    shortScore,

    bias

  };

}



/* =====================================================
RANKING
===================================================== */

function toRankingItem(
  row,
  side
) {

  const strength =

    side === "SHORT"

      ?

      row.shortScore

      :

      row.longScore;


  return {

    symbol:
      row.symbol,

    price:
      row.price,

    strength,

    change:
      toNumber(
        row.change24h
      ),

    side

  };

}



/* =====================================================
ANOMALY
===================================================== */

function isAnomalous(
  row
) {

  const change =

    Math.abs(
      toNumber(
        row.change24h
      )
    );


  const oiChange =

    Math.abs(
      toNumber(
        row.oiChangePct
      )
    );


  const fundingPercent =

    Math.abs(

      toNumber(
        row.fundingRate
      )

      *

      100

    );


  return (

    change >= 3

    ||

    oiChange >= 1

    ||

    fundingPercent >= 0.03

  );

}



/* =====================================================
HELPERS
===================================================== */

function cleanPatch(
  patch
) {

  const output = {};


  for(
    const [
      key,
      value
    ]
    of Object.entries(
      patch || {}
    )
  ) {

    if(
      value !==
      undefined
    ) {

      output[key] =
        value;

    }

  }


  return output;

}



function isPositive(
  value
) {

  const number =
    Number(value);


  return (

    Number.isFinite(
      number
    )

    &&

    number > 0

  );

}

function hasFiniteValue(value) {
  return value !== "" && value !== null && value !== undefined && Number.isFinite(Number(value));
}

function getFreshness(updatedAt, hasValue, staleAfterMs, now) {
  if (!hasValue) return "missing";
  const timestamp = Number(updatedAt);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return "stale";
  return now - timestamp > staleAfterMs ? "stale" : "fresh";
}



function toNumber(
  value
) {

  const number =
    Number(value);


  return (

    Number.isFinite(
      number
    )

      ?

      number

      :

      0

  );

}



function clamp(
  value,
  min,
  max
) {

  return Math.min(

    max,

    Math.max(
      min,
      value
    )

  );

}
