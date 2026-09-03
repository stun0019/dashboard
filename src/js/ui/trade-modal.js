import {

    buildTradePlan,

    calculateRisk

}
from "../services/risk-engine.js";



let currentSignal =
    null;


let lastRiskResult =
    null;



export function initTradeModal() {

    const modal =
        document.getElementById(
            "tradeModal"
        );


    /*
    Close
    */

    document

        .getElementById(
            "tradeClose"
        )

        ?.addEventListener(
            "click",
            closeTradeModal
        );


    /*
    Cancel
    */

    document

        .getElementById(
            "tradeCancel"
        )

        ?.addEventListener(
            "click",
            closeTradeModal
        );


    /*
    Submit
    */

    document

        .getElementById(
            "tradeSubmit"
        )

        ?.addEventListener(
            "click",
            submitTradeParameters
        );


    /*
    Live Calculation
    */

    [

        "tradeEntry",

        "tradeSL",

        "tradeTP1",

        "tradeTP2",

        "tradeMargin",

        "tradeLeverage"

    ]

    .forEach(
        id => {

            const element =
                document.getElementById(
                    id
                );


            element
                ?.addEventListener(
                    "input",
                    recalculate
                );


            element
                ?.addEventListener(
                    "change",
                    recalculate
                );

        }
    );


    /*
    Click Background Close
    */

    modal

        ?.addEventListener(
            "click",
            event => {

                if(
                    event.target ===
                    modal
                ) {

                    closeTradeModal();

                }

            }
        );

}



export function openTradeModal(

    signal,

    exchange

) {

    currentSignal =
        signal;


    let plan;


    try {

        plan =
            buildTradePlan(
                signal
            );

    }
    catch(error) {

        console.error(
            error
        );


        alert(
            "無法建立交易參數，請檢查 Signal 資料。"
        );


        return;

    }


    /*
    Symbol
    */

    const symbol =
        document.getElementById(
            "tradeSymbol"
        );


    if(symbol) {

        symbol.textContent =
            `${signal.symbol}USDT`;

    }


    /*
    Direction
    */

    const side =
        document.getElementById(
            "tradeSide"
        );


    if(side) {

        side.textContent =
            signal.side;


        side.className =

            `side-badge ${

                signal.side === "LONG"

                    ?

                    "long"

                    :

                    "short"

            }`;

    }


    /*
    Exchange
    */

    setValue(

        "tradeExchange",

        exchange

    );


    /*
    Auto Trade Plan
    */

    setValue(

        "tradeEntry",

        plan.entry

    );


    setValue(

        "tradeSL",

        plan.stopLoss

    );


    setValue(

        "tradeTP1",

        plan.tp1

    );


    setValue(

        "tradeTP2",

        plan.tp2

    );


    /*
    Calculate Risk
    */

    recalculate();


    /*
    Open
    */

    document

        .getElementById(
            "tradeModal"
        )

        ?.classList.add(
            "show"
        );

}



function closeTradeModal() {

    currentSignal =
        null;


    lastRiskResult =
        null;


    document

        .getElementById(
            "tradeModal"
        )

        ?.classList.remove(
            "show"
        );

}



function recalculate() {

    if(
        !currentSignal
    ) {

        return;

    }


    const result =
        calculateRisk({

            side:
                currentSignal.side,


            entry:
                value(
                    "tradeEntry"
                ),


            stopLoss:
                value(
                    "tradeSL"
                ),


            tp1:
                value(
                    "tradeTP1"
                ),


            tp2:
                value(
                    "tradeTP2"
                ),


            margin:
                value(
                    "tradeMargin"
                ),


            leverage:
                value(
                    "tradeLeverage"
                )

        });


    lastRiskResult =
        result;


    /*
    Invalid numeric data
    */

    if(!result) {

        setText(
            "tradePosition",
            "--"
        );


        setText(
            "tradeLoss",
            "--"
        );


        setText(
            "tradeRR1",
            "--"
        );


        setText(
            "tradeRR2",
            "--"
        );


        return;

    }


    /*
    Position Value
    */

    setText(

        "tradePosition",

        `${
            result
                .positionValue
                .toFixed(2)
        } U`

    );


    /*
    Estimated Loss
    */

    setText(

        "tradeLoss",

        `-${
            result
                .estimatedLoss
                .toFixed(2)
        } U`

    );


    /*
    RR1
    */

    setText(

        "tradeRR1",

        `${
            result
                .rr1
                .toFixed(2)
        }R`

    );


    /*
    RR2
    */

    setText(

        "tradeRR2",

        `${
            result
                .rr2
                .toFixed(2)
        }R`

    );


    /*
    Error Hint
    */

    const lossElement =
        document.getElementById(
            "tradeLoss"
        );


    if(
        lossElement
    ) {

        lossElement.title =
            result.errors
                .join(
                    "\n"
                );

    }

}



function submitTradeParameters() {

    if(
        !currentSignal
        ||
        !lastRiskResult
    ) {

        alert(
            "交易參數尚未完整。"
        );

        return;

    }


    /*
    Stop invalid trade
    */

    if(
        !lastRiskResult.isValid
    ) {

        alert(

            "交易參數無效：\n\n"

            +

            lastRiskResult
                .errors
                .join(
                    "\n"
                )

        );


        return;

    }


    const exchange =

        document

            .getElementById(
                "tradeExchange"
            )

            ?.value

        ||

        "--";


    /*
    v0.2.1

    真實交易 API 仍禁止送單。
    */

    alert(

        `${exchange} 真實下單 API 尚未啟用。\n\n`

        +

        "目前只驗證與計算交易參數，不會送出任何訂單。"

    );

}



/* =====================================================
HELPERS
===================================================== */

function value(
    id
) {

    return Number(

        document

            .getElementById(
                id
            )

            ?.value

    );

}



function setValue(

    id,

    nextValue

) {

    const element =
        document.getElementById(
            id
        );


    if(element) {

        element.value =
            nextValue;

    }

}



function setText(

    id,

    nextValue

) {

    const element =
        document.getElementById(
            id
        );


    if(element) {

        element.textContent =
            nextValue;

    }

}
