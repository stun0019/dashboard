let stateGetter =
    null;


export function initAIPanel(
    getState
) {

    stateGetter =
        getState;


    document
        .getElementById(
            "openAiTop"
        )
        ?.addEventListener(
            "click",
            openAI
        );


    document
        .getElementById(
            "openAiSidebar"
        )
        ?.addEventListener(
            "click",
            openAI
        );


    document
        .getElementById(
            "closeAi"
        )
        ?.addEventListener(
            "click",
            closeAI
        );


    document
        .getElementById(
            "aiOverlay"
        )
        ?.addEventListener(
            "click",
            closeAI
        );


    document
        .getElementById(
            "aiSend"
        )
        ?.addEventListener(
            "click",
            sendInput
        );


    document
        .getElementById(
            "aiInput"
        )
        ?.addEventListener(
            "keydown",
            event => {

                if(
                    event.key ===
                    "Enter"
                ) {

                    sendInput();

                }

            }
        );


    document
        .querySelectorAll(
            "[data-ai-prompt]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        askAI(
                            button.dataset.aiPrompt
                        );

                    }
                );

            }
        );


    addMessage(
        "assistant",
        "AI Copilot Prototype 已啟動。"
    );

}



export function openAI() {

    document
        .getElementById(
            "aiPanel"
        )
        ?.classList.add(
            "show"
        );


    document
        .getElementById(
            "aiOverlay"
        )
        ?.classList.add(
            "show"
        );

}



export function closeAI() {

    document
        .getElementById(
            "aiPanel"
        )
        ?.classList.remove(
            "show"
        );


    document
        .getElementById(
            "aiOverlay"
        )
        ?.classList.remove(
            "show"
        );

}



export function askAI(
    question
) {

    openAI();


    addMessage(
        "user",
        question
    );


    const state =
        stateGetter?.();


    const market =
        state?.market;


    let response =
        "AI API 尚未串接。";


    if(
        market?.price
    ) {

        response =

            `目前資料來源：${state.exchange}\n\n` +

            `BTC 即時價格：${market.price.toLocaleString()}\n` +

            `24H：${
                market.change24h !== null
                    ?
                    market.change24h.toFixed(2) +
                    "%"
                    :
                    "--"
            }\n` +

            `OI：${
                market.oiUsd
                    ?
                    "$" +
                    (
                        market.oiUsd /
                        1e9
                    ).toFixed(2) +
                    "B"
                    :
                    "--"
            }\n\n` +

            "下一階段將把 Signal、OI、CVD、Funding、Anomaly Radar 一起送入 AI Context。";

    }


    setTimeout(
        () => {

            addMessage(
                "assistant",
                response
            );

        },
        250
    );

}



function sendInput() {

    const input =
        document.getElementById(
            "aiInput"
        );


    const value =
        input.value.trim();


    if(!value) {

        return;

    }


    input.value =
        "";


    askAI(
        value
    );

}



function addMessage(
    role,
    content
) {

    const container =
        document.getElementById(
            "aiMessages"
        );


    const div =
        document.createElement(
            "div"
        );


    div.className =
        `ai-message ${role}`;


    div.innerHTML = `

        <strong>
            ${
                role === "user"
                    ?
                    "YOU"
                    :
                    "TICK AI"
            }
        </strong>

        <br>

        ${
            escapeHTML(content)
            .replace(
                /\n/g,
                "<br>"
            )
        }

    `;


    container.appendChild(
        div
    );


    container.scrollTop =
        container.scrollHeight;

}



function escapeHTML(
    text
) {

    return String(text)

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
