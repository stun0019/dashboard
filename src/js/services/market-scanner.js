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


  /*
  BingX OI 為 base asset 數量。

  如果有：
  OI coin quantity
  +
  current price

  就換算 OI USD。
  */

  if(
    isPositive(next.oiCcy) &&
    isPositive(next.price)
  ) {

    next.oiUsd =
      Number(next.oiCcy) *
      Number(next.price);

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

    const tickerUpdatedAt = Number(row.tickerUpdatedAt);
    const isStale = (
      Number.isFinite(tickerUpdatedAt) &&
      tickerUpdatedAt > 0 &&
      now - tickerUpdatedAt > staleAfterMs
    );

    const score = scoreRow(row);
    const scored = {
      ...score,
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
