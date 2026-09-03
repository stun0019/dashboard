let lastState =
    null;


let signalFilter =
    "ALL";


let signalStatus =
    "active";


let callbacks = {

    onTrade:
        null,

    onAI:
        null

};



export function initRenderer(
    options
) {

    callbacks = {

        ...callbacks,

        ...options

    };


    bindNavigation();

    bindSignalFilters();

}



export function renderApp(
    state
) {

    lastState =
        state;


    renderMarket(
        state
    );


    renderRankings(
        state
    );


    renderSignals(
        state
    );


    renderAnomalies(
        state
    );

}



function renderMarket(
    state
) {

    const market =
        state.market;


    setText(
        "marketExchange",
        state.exchange
    );


    setText(
        "connectionSource",
        state.exchange
    );


    setText(
        "connectionStatus",
        market.connectionStatus
    );


    const dot =
        document.getElementById(
            "connectionDot"
        );


    if(dot) {

        dot.style.background =
            market.connected
                ?
                "var(--green)"
                :
                "var(--red)";

    }


    setText(
        "marketPrice",
        market.price
            ?
            formatUSD(
                market.price
            )
            :
            "--"
    );


    const changeElement =
        document.getElementById(
            "marketChange"
        );


    if(
        changeElement &&
        market.change24h !== null
    ) {

        const value =
            market.change24h;


        changeElement.textContent =
            `${
                value >= 0
                    ?
                    "▲"
                    :
                    "▼"
            } ${
                Math.abs(value)
                .toFixed(2)
            }% · 24H`;


        changeElement.className =
            "market-change " +
            (
                value >= 0
                    ?
                    "positive"
                    :
                    "negative"
            );

    }


    setText(
        "marketOI",

        market.oiUsd
            ?
            formatCompactUSD(
                market.oiUsd
            )
            :
            "--"
    );


    if(
        market.lastUpdate
    ) {

        setText(

            "marketUpdate",

            `${state.exchange} · ${
                new Date(
                    market.lastUpdate
                )
                .toLocaleTimeString()
            }`

        );

    }


    renderSparkline(
        market.priceHistory
    );

}



function renderRankings(
    state
) {

    renderRanking(

        "longRanking",

        state.recommendations.long,

        "LONG"

    );


    renderRanking(

        "shortRanking",

        state.recommendations.short,

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


    container.innerHTML =
        data
        .map(
            (
                item,
                index
            ) => {

                const positive =
                    item.change >= 0;


                return `

                    <div class="ranking-row">

                        <div class="rank-number">
                            ${index + 1}
                        </div>


                        <div>

                            <div class="rank-symbol">
                                ${item.symbol}
                            </div>

                            <div class="rank-price">
                                ${formatUSD(item.price)}
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
                                        ${item.strength}%
                                    "
                                >
                                </div>

                            </div>

                            <div class="strength-text">
                                Score ${item.strength}
                            </div>

                        </div>


                        <div
                            class="
                                change
                                ${
                                    positive
                                        ?
                                        "positive"
                                        :
                                        "negative"
                                }
                            "
                        >

                            ${
                                positive
                                    ?
                                    "+"
                                    :
                                    ""
                            }

                            ${
                                item.change.toFixed(2)
                            }%

                        </div>

                    </div>

                `;

            }
        )
        .join("");

}



function renderSignals(
    state
) {

    const source =
        signalStatus === "active"
            ?
            state.signals.active
            :
            state.signals.closed;


    const filtered =
        source.filter(
            signal => {

                if(
                    signalFilter ===
                    "ALL"
                ) {

                    return true;

                }


                if(
                    signalFilter ===
                    "LONG" ||
                    signalFilter ===
                    "SHORT"
                ) {

                    return signal.side ===
                        signalFilter;

                }


                return signal.timeframe ===
                    signalFilter;

            }
        );


    const grid =
        document.getElementById(
            "signalGrid"
        );


    if(!grid) {

        return;

    }


    grid.innerHTML =
        filtered
        .map(
            signal =>
                createSignalHTML(
                    signal
                )
        )
        .join("");


    grid
        .querySelectorAll(
            "[data-trade]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const id =
                            button.dataset.trade;


                        const signal =
                            source.find(
                                item =>
                                    item.id === id
                            );


                        if(signal) {

                            callbacks.onTrade?.(
                                signal
                            );

                        }

                    }
                );

            }
        );


    grid
        .querySelectorAll(
            "[data-ai-signal]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        callbacks.onAI?.(
                            button.dataset.aiSignal
                        );

                    }
                );

            }
        );

}



function createSignalHTML(
    signal
) {

    const isLong =
        signal.side ===
        "LONG";


    const result =
        signal.result
            ?
            signal.result
            :
            `${
                signal.performance >= 0
                    ?
                    "+"
                    :
                    ""
            }${signal.performance.toFixed(2)}%`;


    return `

        <div class="signal-card">


            <div class="signal-card-header">

                <div>

                    <div class="signal-symbol">
                        ${signal.symbol}
                    </div>

                    <div class="signal-time">
                        ${signal.time}
                    </div>

                </div>


                <span
                    class="
                        side-badge
                        ${
                            isLong
                                ?
                                "long"
                                :
                                "short"
                        }
                    "
                >

                    ${signal.side}

                </span>

            </div>


            <div class="signal-body">


                <div class="signal-field">

                    <span>
                        Timeframe
                    </span>

                    <strong>
                        ${signal.timeframe}
                    </strong>

                </div>


                <div class="signal-field">

                    <span>
                        Trigger
                    </span>

                    <strong>
                        ${formatUSD(signal.trigger)}
                    </strong>

                </div>


                <div class="signal-field">

                    <span>
                        Status
                    </span>

                    <strong
                        class="
                            ${
                                signal.performance >= 0
                                    ?
                                    "positive"
                                    :
                                    "negative"
                            }
                        "
                    >

                        ${result}

                    </strong>

                </div>


            </div>


            <div class="signal-actions">

                <button
                    class="card-button"
                    data-ai-signal="${signal.symbol}"
                >
                    AI聊
                </button>


                <button
                    class="card-button"
                    data-trade="${signal.id}"

                    ${
                        signalStatus ===
                        "closed"
                            ?
                            "disabled"
                            :
                            ""
                    }
                >
                    快速下單
                </button>

            </div>


        </div>

    `;

}



function renderAnomalies(
    state
) {

    renderAnomaly(

        "bullishAnomaly",

        state.anomalies.bullish,

        true

    );


    renderAnomaly(

        "bearishAnomaly",

        state.anomalies.bearish,

        false

    );

}



function renderAnomaly(
    id,
    data,
    bullish
) {

    const container =
        document.getElementById(
            id
        );


    if(!container) {

        return;

    }


    container.innerHTML =
        data
        .map(
            item => `

                <div class="anomaly-card">

                    <div class="anomaly-top">

                        <div class="anomaly-symbol">
                            ⚡ ${item.symbol}
                        </div>

                        <div class="anomaly-meta">
                            ${item.count} alerts · ${item.ago}
                        </div>

                    </div>


                    <div class="anomaly-description">
                        ${item.description}
                    </div>


                    <div class="anomaly-stats">

                        <div class="anomaly-stat">

                            <span>
                                FIRST
                            </span>

                            <strong>
                                ${formatUSD(item.first)}
                            </strong>

                        </div>


                        <div class="anomaly-stat">

                            <span>
                                CURRENT
                            </span>

                            <strong>
                                ${formatUSD(item.current)}
                            </strong>

                        </div>


                        <div class="anomaly-stat">

                            <span>
                                AFTER ALERT
                            </span>

                            <strong
                                class="
                                    ${
                                        bullish
                                            ?
                                            "positive"
                                            :
                                            "negative"
                                    }
                                "
                            >

                                ${
                                    item.performance > 0
                                        ?
                                        "+"
                                        :
                                        ""
                                }

                                ${
                                    item.performance.toFixed(2)
                                }%

                            </strong>

                        </div>

                    </div>

                </div>

            `
        )
        .join("");

}



function renderSparkline(
    prices
) {

    const container =
        document.getElementById(
            "sparkline"
        );


    if(
        !container ||
        prices.length < 2
    ) {

        return;

    }


    const min =
        Math.min(
            ...prices
        );


    const max =
        Math.max(
            ...prices
        );


    const range =
        max -
        min ||
        1;


    const points =
        prices
        .map(
            (
                value,
                index
            ) => {

                const x =
                    (
                        index /
                        (
                            prices.length -
                            1
                        )
                    )
                    * 180;


                const y =
                    34 -
                    (
                        (
                            value -
                            min
                        )
                        /
                        range
                    )
                    * 30;


                return `${x},${y}`;

            }
        )
        .join(" ");


    const rising =
        prices[
            prices.length - 1
        ] >= prices[0];


    container.innerHTML = `

        <svg
            viewBox="0 0 180 38"
            preserveAspectRatio="none"
        >

            <polyline

                points="${points}"

                fill="none"

                stroke="${
                    rising
                        ?
                        "#26d798"
                        :
                        "#ff626c"
                }"

                stroke-width="1.5"

            />

        </svg>

    `;

}



function bindNavigation() {

    document
        .querySelectorAll(
            "[data-target]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        document
                            .querySelectorAll(
                                "[data-target]"
                            )
                            .forEach(
                                item =>
                                    item.classList.remove(
                                        "active"
                                    )
                            );


                        button.classList.add(
                            "active"
                        );


                        document
                            .getElementById(
                                button.dataset.target
                            )
                            ?.scrollIntoView({

                                behavior:
                                    "smooth"

                            });

                    }
                );

            }
        );

}



function bindSignalFilters() {

    document
        .querySelectorAll(
            "[data-signal-filter]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        signalFilter =
                            button.dataset.signalFilter;


                        document
                            .querySelectorAll(
                                "[data-signal-filter]"
                            )
                            .forEach(
                                item =>
                                    item.classList.remove(
                                        "active"
                                    )
                            );


                        button.classList.add(
                            "active"
                        );


                        if(lastState) {

                            renderSignals(
                                lastState
                            );

                        }

                    }
                );

            }
        );


    document
        .querySelectorAll(
            "[data-signal-status]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        signalStatus =
                            button.dataset.signalStatus;


                        document
                            .querySelectorAll(
                                "[data-signal-status]"
                            )
                            .forEach(
                                item =>
                                    item.classList.remove(
                                        "active"
                                    )
                            );


                        button.classList.add(
                            "active"
                        );


                        if(lastState) {

                            renderSignals(
                                lastState
                            );

                        }

                    }
                );

            }
        );

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



function formatUSD(
    value
) {

    const number =
        Number(value);


    if(
        number >= 1000
    ) {

        return "$" +
            number.toLocaleString(
                undefined,
                {
                    maximumFractionDigits:
                        2
                }
            );

    }


    if(
        number >= 1
    ) {

        return "$" +
            number.toFixed(3);

    }


    return "$" +
        number.toFixed(6);

}



function formatCompactUSD(
    value
) {

    if(
        value >= 1e9
    ) {

        return `$${(
            value /
            1e9
        ).toFixed(2)}B`;

    }


    if(
        value >= 1e6
    ) {

        return `$${(
            value /
            1e6
        ).toFixed(2)}M`;

    }


    return formatUSD(
        value
    );

}
