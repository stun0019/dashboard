let toggleHandler = null;

export function initFocusDashboard({ onToggle }) {
  toggleHandler = onToggle;
  document.getElementById("candidateList")?.addEventListener("click", event => {
    const card = event.target.closest("[data-candidate-card]");
    if (card) toggleHandler?.(card.dataset.symbol);
  });
}

export function toggleExpandedSymbol(currentSymbol, clickedSymbol) {
  return currentSymbol === clickedSymbol ? null : clickedSymbol;
}

export function renderFocusDashboard(state) {
  setText("connectionStatus", state.connectionStatus);
  document.getElementById("connectionDot")?.classList.toggle("live", state.connected);
  document.getElementById("connectionDot")?.classList.toggle("error", state.connectionStatus.includes("ERROR"));
  setText("scannedCount", state.scannedCount.toLocaleString());
  setText("candidateCount", state.candidates.length);
  setText("lastUpdate", state.lastUpdate ? formatTime(state.lastUpdate) : "--");
  renderCandidates(state.candidates, state.expandedSymbol);
}

function renderCandidates(candidates, expandedSymbol) {
  const container = document.getElementById("candidateList");
  if (!container) return;
  if (!candidates.length) {
    container.innerHTML = '<div class="empty-state">正在掃描全市場並建立候選清單…</div>';
    return;
  }
  container.innerHTML = candidates.map(row => renderCandidateCard(row, row.symbol === expandedSymbol)).join("");
}

function renderCandidateCard(row, expanded) {
  const symbol = escapeHTML(row.symbol);
  const detailId = `candidate-detail-${safeId(row.symbol)}`;
  const rating = Math.max(1, Math.min(5, Number(row.setupRating) || 1));
  const plan = row.tradePlan;

  return `
    <article class="candidate-card ${expanded ? "expanded" : ""}" data-candidate-card data-symbol="${symbol}">
      <button class="candidate-card-summary" type="button" aria-expanded="${expanded}" aria-controls="${detailId}">
        <span class="candidate-identity">
          <strong>${symbol}<small>/ USDT</small></strong>
          <span class="current-price" data-role="current-price">${formatPrice(row.currentPrice)}</span>
          <span class="${numberClass(row.change24h)}">${formatPercent(row.change24h)} 24H</span>
        </span>
        <span class="candidate-metrics">
          ${metric("成交額", formatUSD(row.volumeNotional24h))}
          ${metric("OI 變化", formatSignedPercent(row.oiChangePct), row.freshness?.oi)}
          ${metric("Funding", formatFunding(row.fundingRate), row.freshness?.funding)}
        </span>
        <span class="candidate-decision">
          <b class="side-badge ${String(row.side).toLowerCase()}">${escapeHTML(row.side)}</b>
          ${renderRating(rating)}
          <i class="expand-icon" aria-hidden="true">⌄</i>
        </span>
      </button>
      <div id="${detailId}" class="candidate-card-detail" aria-hidden="${!expanded}">
        <div class="candidate-card-detail-inner">
          <div class="evidence-grid">
            ${evidence("15M K 線", row.candleTrend, freshnessLabel(row.freshness?.candle))}
            ${evidence("OPEN INTEREST", formatUSD(row.oiUsd), freshnessLabel(row.freshness?.oi))}
            ${evidence("FUNDING", formatFunding(row.fundingRate), freshnessLabel(row.freshness?.funding))}
          </div>

          <section class="plan">
            <div class="plan-title">
              <h3>交易計畫</h3>
              <small>${plan ? `建立 ${formatTime(row.tradePlanCreatedAt)} · 同方向期間固定` : "WAIT · 尚未形成交易計畫"}</small>
            </div>
            <div class="plan-grid">
              ${planItem("CURRENT", row.currentPrice, "current", "current")}
              ${planItem("ENTRY", plan?.entry, "entry", "entry")}
              ${planItem("STOP LOSS", plan?.stopLoss, "sl", "stop-loss")}
              ${planItem("TP 1", plan?.tp1, "tp", "tp1")}
              ${planItem("TP 2", plan?.tp2, "tp", "tp2")}
              ${planItem("TP 3", plan?.tp3, "tp", "tp3")}
            </div>
          </section>

          <section class="reason-block">
            <div class="reason-title"><h3>判斷原因</h3><small>SETUP ANALYSIS · DATA ${escapeHTML(row.explanation?.completeness || "0/3")}</small></div>
            <ul>${(row.explanation?.reasons || []).map(reason => `<li>${escapeHTML(reason)}</li>`).join("")}</ul>
            <p class="conclusion">${escapeHTML(row.explanation?.conclusion || "資料準備中。")}</p>
          </section>
        </div>
      </div>
    </article>
  `;
}

function renderRating(rating) {
  const numbers = [1, 2, 3, 4, 5]
    .map(value => `<span class="rating-number ${value === rating ? "active" : ""}" aria-hidden="true">${value}</span>`)
    .join("");
  return `<span class="setup-rating" aria-label="Setup rating ${rating} of 5"><small>RATING</small><span>${numbers}</span></span>`;
}

function metric(label, value, freshnessState) {
  const status = freshnessState ? freshnessLabel(freshnessState) : null;
  return `<span class="metric"><small>${label}</small><strong>${value}</strong>${status ? `<em class="freshness ${status.className}">${status.shortLabel}</em>` : ""}</span>`;
}

function evidence(label, value, state) {
  return `<div class="evidence"><small>${label}</small><strong>${value}</strong><div class="freshness ${state.className}">${state.label}</div></div>`;
}

function planItem(label, value, className, role) {
  return `<div class="plan-item ${className}" data-role="${role}"><small>${label}</small><strong>${value ? formatPrice(value) : "--"}</strong></div>`;
}

function freshnessLabel(state) {
  if (state === "fresh") return { label: "LIVE", shortLabel: "LIVE", className: "live" };
  if (state === "stale") return { label: "STALE · EXCLUDED", shortLabel: "STALE", className: "stale" };
  return { label: "WAITING · EXCLUDED", shortLabel: "WAIT", className: "" };
}

function formatPrice(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return "--";
  const digits = number >= 1000 ? 2 : number >= 1 ? 3 : 6;
  return `$${number.toLocaleString(undefined, { maximumFractionDigits: digits })}`;
}

function formatUSD(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return "--";
  return `$${Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 2 }).format(number)}`;
}

function formatFunding(value) {
  if (value === null || value === undefined) return "--";
  const number = Number(value) * 100;
  return Number.isFinite(number) ? `${number > 0 ? "+" : ""}${number.toFixed(4)}%` : "--";
}

function formatSignedPercent(value) {
  if (value === null || value === undefined) return "--";
  const number = Number(value);
  return Number.isFinite(number) ? `${number > 0 ? "+" : ""}${number.toFixed(2)}%` : "--";
}

function formatPercent(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `${number > 0 ? "+" : ""}${number.toFixed(2)}%` : "--";
}

function numberClass(value) {
  const number = Number(value);
  return number > 0 ? "positive" : number < 0 ? "negative" : "neutral";
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  return Number.isFinite(date.getTime())
    ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "--";
}

function safeId(value) {
  return String(value || "").replace(/[^a-zA-Z0-9_-]/g, "-");
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
