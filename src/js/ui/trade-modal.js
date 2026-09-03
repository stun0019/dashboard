import {

    buildTradePlan,
    calculateRisk

}
from "../services/risk-engine.js";


let currentSignal =
    null;


export function initTradeModal() {

    const modal =
        document.getElementById(
            "tradeModal"
        );


    document
        .getElementById(
            "tradeClose"
        )
        ?.addEventListener(
            "click",
            closeTradeModal
        );


    document
        .getElementById(
            "tradeCancel"
        )
        ?.addEventListener(
            "click",
            closeTradeModal
        );


    document
        .getElementById(
            "tradeSubmit"
        )
        ?.addEventListener(
            "click",
            () => {

                alert(

                    "目前為交易參數 Prototype。\n\n" +
                    "尚未送出任何 BingX / OKX 真實訂單。"

                );

            }
        );


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

            document
                .getElementById(id)
                ?.addEventListener(
                    "input",
                    recalculate
                );

            document
                .getElementById(id)
                ?.addEventListener(
                    "change",
                    recalculate
                );

        }
    );


    modal
        ?.addEventListener(
            "click",
            event => {

                if(
                    event.target === modal
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


    const plan =
        buildTradePlan(
            signal
        );


    const symbol =
        document.getElementById(
            "tradeSymbol"
        );


    const side =
        document.getElementById(
            "tradeSide"
        );


    symbol.textContent =
        `${signal.symbol}USDT`;


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


    setValue(
        "tradeExchange",
        exchange
    );


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


    recalculate();


    document
        .getElementById(
            "tradeModal"
        )
        .classList.add(
            "show"
        );

}



function closeTradeModal() {

    document
        .getElementById(
            "tradeModal"
        )
        ?.classList.remove(
            "show"
        );

}



function recalculate() {

    if(!currentSignal) {

        return;

    }


    const result =
        calculateRisk({

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


    if(!result) {

        return;

    }


    setText(

        "tradePosition",

        `${
            result.positionValue
            .toFixed(2)
        } U`

    );


    setText(

        "tradeLoss",

        `-${
            result.estimatedLoss
            .toFixed(2)
        } U`

    );


    setText(

        "tradeRR1",

        `${
            result.rr1
            .toFixed(2)
        }R`

    );


    setText(

        "tradeRR2",

        `${
            result.rr2
            .toFixed(2)
        }R`

    );

}



function value(id) {

    return Number(
        document
            .getElementById(id)
            ?.value
    );

}



function setValue(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if(element) {

        element.value =
            value;

    }

}



function setText(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if(element) {

        element.textContent =
            value;

    }

}
