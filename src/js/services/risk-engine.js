const DEFAULT_STOP_PERCENT = {
    "5m": 0.008,
    "15m": 0.012,
    "30m": 0.015,
    "1H": 0.02
};


const DEFAULT_RR = {
    tp1: 2,
    tp2: 3,
    tp3: 4
};



export function buildTradePlan(
    signal,
    options = {}
) {

    if(
        !signal ||
        !signal.side
    ) {

        throw new Error(
            "buildTradePlan: signal.side is required"
        );

    }


    const side =
        String(signal.side)
            .toUpperCase();


    const entry =
        toPositiveNumber(
            signal.trigger
        );


    if(!entry) {

        throw new Error(
            "buildTradePlan: signal.trigger must be a positive number"
        );

    }


    if(
        side !== "LONG" &&
        side !== "SHORT"
    ) {

        throw new Error(
            "buildTradePlan: signal.side must be LONG or SHORT"
        );

    }


    const stopPercent =

        toPositiveNumber(
            options.stopPercent
        )

        ||

        DEFAULT_STOP_PERCENT[
            signal.timeframe
        ]

        ||

        DEFAULT_STOP_PERCENT[
            "15m"
        ];


    const rr = {

        ...DEFAULT_RR,

        ...(options.rr || {})

    };


    const riskDistance =
        entry *
        stopPercent;


    const stopLoss =

        side === "LONG"

            ?

            entry -
            riskDistance

            :

            entry +
            riskDistance;


    const tp1 =

        side === "LONG"

            ?

            entry +
            riskDistance *
            rr.tp1

            :

            entry -
            riskDistance *
            rr.tp1;


    const tp2 =

        side === "LONG"

            ?

            entry +
            riskDistance *
            rr.tp2

            :

            entry -
            riskDistance *
            rr.tp2;


    const tp3 =

        side === "LONG"

            ?

            entry +
            riskDistance *
            rr.tp3

            :

            entry -
            riskDistance *
            rr.tp3;


    return {

        side,

        entry:
            normalizePrice(
                entry
            ),

        stopLoss:
            normalizePrice(
                stopLoss
            ),

        tp1:
            normalizePrice(
                tp1
            ),

        tp2:
            normalizePrice(
                tp2
            ),

        tp3:
            normalizePrice(
                tp3
            ),

        stopPercent,

        rr

    };

}



export function calculateRisk({

    side,

    entry,

    stopLoss,

    tp1,

    tp2,

    tp3 = null,

    margin,

    leverage

}) {

    const normalizedSide =
        String(
            side || ""
        )
        .toUpperCase();


    const numericEntry =
        toPositiveNumber(
            entry
        );


    const numericStop =
        toPositiveNumber(
            stopLoss
        );


    const numericTp1 =
        toPositiveNumber(
            tp1
        );


    const numericTp2 =
        toPositiveNumber(
            tp2
        );


    const numericTp3 =

        tp3 === null

            ?

            null

            :

            toPositiveNumber(
                tp3
            );


    const numericMargin =
        toPositiveNumber(
            margin
        );


    const numericLeverage =
        toPositiveNumber(
            leverage
        );


    if(
        !numericEntry ||
        !numericStop ||
        !numericMargin ||
        !numericLeverage
    ) {

        return null;

    }


    const errors =
        validateTradeLevels({

            side:
                normalizedSide,

            entry:
                numericEntry,

            stopLoss:
                numericStop,

            tp1:
                numericTp1,

            tp2:
                numericTp2,

            tp3:
                numericTp3

        });


    const positionValue =
        numericMargin *
        numericLeverage;


    const quantity =
        positionValue /
        numericEntry;


    const riskDistance =
        Math.abs(
            numericEntry -
            numericStop
        );


    const riskPercent =
        riskDistance /
        numericEntry;


    const estimatedLoss =
        quantity *
        riskDistance;


    const rr1 =
        calculateRR(

            numericEntry,

            numericStop,

            numericTp1

        );


    const rr2 =
        calculateRR(

            numericEntry,

            numericStop,

            numericTp2

        );


    const rr3 =

        numericTp3

            ?

            calculateRR(

                numericEntry,

                numericStop,

                numericTp3

            )

            :

            null;


    return {

        isValid:
            errors.length === 0,

        errors,

        positionValue,

        quantity,

        riskDistance,

        riskPercent,

        estimatedLoss,

        rr1,

        rr2,

        rr3

    };

}



export function validateTradeLevels({

    side,

    entry,

    stopLoss,

    tp1,

    tp2,

    tp3 = null

}) {

    const errors = [];


    if(
        side !== "LONG" &&
        side !== "SHORT"
    ) {

        errors.push(
            "交易方向必須是 LONG 或 SHORT"
        );

        return errors;

    }


    if(!tp1) {

        errors.push(
            "TP1 必須是有效價格"
        );

    }


    if(!tp2) {

        errors.push(
            "TP2 必須是有效價格"
        );

    }


    if(
        side === "LONG"
    ) {

        if(
            stopLoss >= entry
        ) {

            errors.push(
                "LONG 的 SL 必須低於 Entry"
            );

        }


        if(
            tp1 &&
            tp1 <= entry
        ) {

            errors.push(
                "LONG 的 TP1 必須高於 Entry"
            );

        }


        if(
            tp2 &&
            tp2 <= entry
        ) {

            errors.push(
                "LONG 的 TP2 必須高於 Entry"
            );

        }


        if(
            tp3 &&
            tp3 <= entry
        ) {

            errors.push(
                "LONG 的 TP3 必須高於 Entry"
            );

        }

    }


    if(
        side === "SHORT"
    ) {

        if(
            stopLoss <= entry
        ) {

            errors.push(
                "SHORT 的 SL 必須高於 Entry"
            );

        }


        if(
            tp1 &&
            tp1 >= entry
        ) {

            errors.push(
                "SHORT 的 TP1 必須低於 Entry"
            );

        }


        if(
            tp2 &&
            tp2 >= entry
        ) {

            errors.push(
                "SHORT 的 TP2 必須低於 Entry"
            );

        }


        if(
            tp3 &&
            tp3 >= entry
        ) {

            errors.push(
                "SHORT 的 TP3 必須低於 Entry"
            );

        }

    }


    return errors;

}



function calculateRR(

    entry,

    stopLoss,

    target

) {

    if(!target) {

        return 0;

    }


    const risk =
        Math.abs(
            entry -
            stopLoss
        );


    if(!risk) {

        return 0;

    }


    return (

        Math.abs(
            target -
            entry
        )

        /

        risk

    );

}



function toPositiveNumber(
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

        return null;

    }


    return number;

}



function normalizePrice(
    value
) {

    if(
        value >= 1000
    ) {

        return Number(
            value.toFixed(2)
        );

    }


    if(
        value >= 1
    ) {

        return Number(
            value.toFixed(3)
        );

    }


    return Number(
        value.toFixed(6)
    );

}
