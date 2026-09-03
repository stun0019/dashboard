import {
  APP_CONFIG
}
from "../config.js";



let mounted =
  false;



export function initScannerUI() {

  if(mounted) {

    return;

  }


  mounted =
    true;


  ensureStylesheet();


  ensureScannerSection();


  relabelSummaryCards();

}



export function renderScanner(
  state
) {

  initScannerUI();


  const scanner =
    state.scanner;


  const rows =
    Object.values(
      scanner.rows
    );


  renderScannerTable(
    rows
  );


  renderScannerSummary(
    scanner
  );


  renderScannerCoverage(
    state
  );


  /*
  接管原本的
  做多 / 做空 Ranking。
  */

  renderScannerRankings(
    scanner
  );


  /*
  Dashboard 上方
  Funding / Structure
  由 BTC Scanner Data 更新。
  */

  renderHeroScannerMetrics(

    rows.find(
      row =>
        row.symbol ===
        APP_CONFIG
          .market
          .base
    )

  );

}



/* =====================================================
MOUNT
===================================================== */

function ensureStylesheet() {

  if(
    document.querySelector(
      "link[data-tick-scanner-css]"
    )
  ) {

    return;

  }


  const link =
    document.createElement(
      "link"
    );


  link.rel =
    "stylesheet";


  link.href =
    "./assets/css/scanner.css";


  link.dataset.tickScannerCss =
    "true";


  document.head.appendChild(
    link
  );

}



function ensureScannerSection() {

  if(
    document.getElementById(
      "marketScanner"
    )
  ) {

    return;

  }


  const dashboard =
    document.getElementById(
      "dashboard"
    );


  if(!dashboard) {

    return;

  }


  const section =
    document.createElement(
      "section"
    );


  section.className =
    "section";


  section.id =
    "marketScanner";


  section.innerHTML = `

    <div
      class="
        section-header
        scanner-section-header
      "
    >

      <div>

        <div class="section-title">
          Market Scanner
        </div>

        <div class="section-subtitle">
          REAL-TIME MULTI-SYMBOL SCANNER
        </div>

      </div>


      <div
        class="scanner-coverage"
        id="scannerCoverage"
      >
        等待市場資料...
      </div>

    </div>


    <div
      class="
        panel
        scanner-panel
      "
    >

      <div class="scanner-table-wrap">

        <table class="scanner-table">

          <thead>

            <tr>

              <th>
                SYMBOL
              </th>

              <th>
                PRICE
              </th>

              <th>
                24H
              </th>

              <th>
                VOL 24H
              </th>

              <th>
                OI
              </th>

              <th>
                OI Δ
              </th>

              <th>
                FUNDING
              </th>

              <th>
                BIAS
              </th>

              <th>
                SCORE
              </th>

            </tr>

          </thead>


          <tbody
            id="marketScannerBody"
          >
          </tbody>

        </table>

      </div>

    </div>

  `;


  dashboard
    .insertAdjacentElement(
      "afterend",
      section
    );

}



function relabelSummaryCards() {

  const labels =

    document.querySelectorAll(

      "#dashboard " +
      ".summary-grid " +
      ".summary-label"

    );


  if(labels[0]) {

    labels[0]
      .textContent =
      "已掃描幣種";

  }


  if(labels[1]) {

    labels[1]
      .textContent =
      "即時異動";

  }


  if(labels[2]) {

    labels[2]
      .textContent =
      "做多候選";

  }


  if(labels[3]) {

    labels[3]
      .textContent =
      "做空候選";

  }

}



/* =====================================================
TABLE
===================================================== */

function renderScannerTable(
  rows
) {

  const body =
    document.getElementById(
      "marketScannerBody"
    );


  if(!body) {

    return;

  }


  body.innerHTML =

    rows

      .map(
        row => {

          const biasClass =

            row.bias === "LONG"

              ?

              "positive"

              :

              row.bias === "SHORT"

                ?

                "negative"

                :

                "scanner-neutral";


          const score =

            row.bias === "SHORT"

              ?

              row.shortScore

              :

              row.longScore;


          return `

            <tr class="${row.isStale ? "scanner-row-stale" : ""}">


              <td>

                <strong>
                  ${
                    escapeHTML(
                      row.symbol
                    )
                  }
                </strong>

              </td>


              <td>

                ${
                  formatPrice(
                    row.price
                  )
                }

              </td>


              <td
                class="${
                  numberClass(
                    row.change24h
                  )
                }"
              >

                ${
                  formatSignedPercent(
                    row.change24h,
                    2
                  )
                }

              </td>


              <td>

                ${
                  formatCompact(
                    row.volume24h
                  )
                }

              </td>


              <td>

                ${
                  formatCompactUSD(
                    row.oiUsd
                  )
                }

              </td>


              <td
                class="${
                  numberClass(
                    row.oiChangePct
                  )
                }"
              >

                ${
                  formatSignedPercent(
                    row.oiChangePct,
                    2
                  )
                }

              </td>


              <td
                class="${
                  fundingClass(
                    row.fundingRate
                  )
                }"
              >

                ${
                  formatFunding(
                    row.fundingRate
                  )
                }

              </td>


              <td>

                <span
                  class="
                    scanner-bias
                    ${biasClass}
                  "
                >

                  ${
                    escapeHTML(
                      row.bias
                    )
                  }

                </span>

              </td>


              <td>

                <strong>

                  ${
                    Number.isFinite(
                      Number(score)
                    )

                      ?

                      score

                      :

                      "--"
                  }

                </strong>

              </td>


            </tr>

          `;

        }
      )

      .join("");

}



/* =====================================================
SUMMARY
===================================================== */

function renderScannerSummary(
  scanner
) {

  const values =

    document.querySelectorAll(

      "#dashboard " +
      ".summary-grid " +
      ".summary-number"

    );


  if(values[0]) {

    values[0].textContent =
      scanner.scannedCount;

  }


  if(values[1]) {

    values[1].textContent =
      scanner.anomalyCount;

  }


  if(values[2]) {

    values[2].textContent =
      scanner.bullishCount;

  }


  if(values[3]) {

    values[3].textContent =
      scanner.bearishCount;

  }

}



/* =====================================================
DATA COVERAGE
===================================================== */

function renderScannerCoverage(
  state
) {

  const element =
    document.getElementById(
      "scannerCoverage"
    );


  if(!element) {

    return;

  }


  const exchange = state.exchange;
  const total = Object.keys(state.scanner.rows).length;
  const stale = state.scanner.staleCount || 0;
  const error = state.universe.errors[exchange];
  const source = exchange === "OKX"
    ? "Price / Volume / OI / Funding = WebSocket"
    : "Price / Volume = WebSocket · OI / Funding = same-origin REST proxy";

  element.textContent = error
    ? `${exchange} · Universe 載入失敗：${error}`
    : `${exchange} · ${total} USDT 永續 · stale ${stale} · ${source}`;

}



/* =====================================================
RANKING
===================================================== */

function renderScannerRankings(
  scanner
) {

  renderRanking(

    "longRanking",

    scanner.longRanking,

    "LONG"

  );


  renderRanking(

    "shortRanking",

    scanner.shortRanking,

    "SHORT"

  );

}



function renderRanking(
  id,
  data,
  side
) {

  const container =
    document.getElementById(
      id
    );


  if(!container) {

    return;

  }


  if(
    !data.length
  ) {

    container.innerHTML = `

      <div class="scanner-empty">

        等待即時市場資料...

      </div>

    `;


    return;

  }


  container.innerHTML =

    data

      .map(
        (
          item,
          index
        ) => `

          <div class="ranking-row">


            <div class="rank-number">

              ${index + 1}

            </div>


            <div>

              <div class="rank-symbol">

                ${
                  escapeHTML(
                    item.symbol
                  )
                }

              </div>


              <div class="rank-price">

                ${
                  formatPrice(
                    item.price
                  )
                }

              </div>

            </div>


            <div>

              <div class="strength-bar">

                <div

                  class="
                    strength-progress
                    ${
                      side === "LONG"

                        ?

                        "long"

                        :

                        "short"
                    }
                  "

                  style="
                    width:
                    ${
                      clamp(
                        item.strength,
                        0,
                        100
                      )
                    }%
                  "

                >
                </div>

              </div>


              <div class="strength-text">

                Score
                ${item.strength}

              </div>

            </div>


            <div
              class="
                change
                ${
                  numberClass(
                    item.change
                  )
                }
              "
            >

              ${
                formatSignedPercent(
                  item.change,
                  2
                )
              }

            </div>


          </div>

        `
      )

      .join("");

}



/* =====================================================
HERO METRICS
===================================================== */

function renderHeroScannerMetrics(
  btc
) {

  if(!btc) {

    return;

  }


  /*
  Funding
  */

  const funding =
    document.getElementById(
      "marketFunding"
    );


  if(funding) {

    funding.textContent =
      formatFunding(
        btc.fundingRate
      );


    funding.className =

      `metric-value ${
        fundingClass(
          btc.fundingRate
        )
      }`;

  }


  /*
  Scanner Bias
  */

  const structure =
    document.getElementById(
      "marketStructure"
    );


  if(structure) {

    structure.textContent =
      btc.bias ||
      "WAIT";


    structure.className =

      "metric-value "

      +

      (
        btc.bias === "LONG"

          ?

          "positive"

          :

          btc.bias === "SHORT"

            ?

            "negative"

            :

            ""
      );

  }


  /*
  不再顯示假的 CVD。

  等 v0.4 真正做。
  */

  const cvd =
    document.getElementById(
      "marketCVD"
    );


  if(cvd) {

    cvd.textContent =
      "--";


    cvd.className =
      "metric-value";


    const hint =

      cvd
        .parentElement
        ?.querySelector(
          ".metric-hint"
        );


    if(hint) {

      hint.textContent =
        "v0.4 CVD Engine";

    }

  }

}



/* =====================================================
FORMAT
===================================================== */

function formatPrice(
  value
) {

  const number =
    Number(
      value
    );


  if(
    !Number.isFinite(
      number
    )
    ||
    number <= 0
  ) {

    return "--";

  }


  if(
    number >= 1000
  ) {

    return (

      "$"

      +

      number.toLocaleString(

        undefined,

        {
          maximumFractionDigits:
            2
        }

      )

    );

  }


  if(
    number >= 1
  ) {

    return (

      "$"

      +

      number.toFixed(
        3
      )

    );

  }


  return (

    "$"

    +

    number.toFixed(
      6
    )

  );

}



function formatCompact(
  value
) {

  const number =
    Number(
      value
    );


  if(
    !Number.isFinite(
      number
    )
  ) {

    return "--";

  }


  return Intl.NumberFormat(

    undefined,

    {
      notation:
        "compact",

      maximumFractionDigits:
        2
    }

  )
  .format(
    number
  );

}



function formatCompactUSD(
  value
) {

  const number =
    Number(
      value
    );


  if(
    !Number.isFinite(
      number
    )
    ||
    number <= 0
  ) {

    return "--";

  }


  return (

    "$"

    +

    Intl.NumberFormat(

      undefined,

      {
        notation:
          "compact",

        maximumFractionDigits:
          2
      }

    )
    .format(
      number
    )

  );

}



function formatSignedPercent(
  value,
  digits
) {

  const number =
    Number(
      value
    );


  if(
    !Number.isFinite(
      number
    )
  ) {

    return "--";

  }


  return (

    (
      number > 0
        ?
        "+"
        :
        ""
    )

    +

    number.toFixed(
      digits
    )

    +

    "%"

  );

}



function formatFunding(
  value
) {

  const number =
    Number(
      value
    );


  if(
    !Number.isFinite(
      number
    )
  ) {

    return "--";

  }


  const percent =
    number *
    100;


  return (

    (
      percent > 0
        ?
        "+"
        :
        ""
    )

    +

    percent.toFixed(
      4
    )

    +

    "%"

  );

}



function fundingClass(
  value
) {

  const number =
    Number(
      value
    );


  if(
    !Number.isFinite(
      number
    )
    ||
    number === 0
  ) {

    return "scanner-neutral";

  }


  return (

    number > 0

      ?

      "positive"

      :

      "negative"

  );

}



function numberClass(
  value
) {

  const number =
    Number(
      value
    );


  if(
    !Number.isFinite(
      number
    )
    ||
    number === 0
  ) {

    return "scanner-neutral";

  }


  return (

    number > 0

      ?

      "positive"

      :

      "negative"

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

      Number(value)
      ||
      0

    )

  );

}



function escapeHTML(
  value
) {

  return String(
    value ?? ""
  )

    .replace(
      /&/g,
      "&amp;"
    )

    .replace(
      /</g,
      "&lt;"
    )

    .replace(
      />/g,
      "&gt;"
    )

    .replace(
      /"/g,
      "&quot;"
    )

    .replace(
      /'/g,
      "&#039;"
    );

}
