let selectHandler = null;

export function initFocusDashboard({ onSelect }) {
  selectHandler = onSelect;
  document.getElementById("candidateList")?.addEventListener("click", event => {
    const row = event.target.closest("[data-symbol]");
    if (row) selectHandler?.(row.dataset.symbol);
  });
}

export function renderFocusDashboard(state) {
  setText("connectionStatus", state.connectionStatus);
  document.getElementById("connectionDot")?.classList.toggle("live", state.connected);
  document.getElementById("connectionDot")?.classList.toggle("error", state.connectionStatus.includes("ERROR"));
  setText("scannedCount", state.scannedCount.toLocaleString());
  setText("candidateCount", state.candidates.length);
  setText("lastUpdate", state.lastUpdate ? formatTime(state.lastUpdate) : "--");

  renderCandidates(state.candidates, state.selectedSymbol);
  renderAnalysis(state.candidates.find(row => row.symbol === state.selectedSymbol));
}

function renderCandidates(candidates, selectedSymbol) {
  const container = document.getElementById("candidateList");
  if (!container) return;

  if (!candidates.length) {
    container.innerHTML = '<div class="empty-state">正在掃描全市場並建立候選清單…</div>';
    return;
  }

  container.innerHTML = candidates.map(row => `
    <button class="candidate-row ${row.symbol === selectedSymbol ? "selected" : ""}" data-symbol="${escapeHTML(row.symbol)}">
      <span class="symbol"><strong>${escapeHTML(row.symbol)}</strong><small>ATTN ${Math.round(row.attentionScore)}</small></span>
      <span class="numeric">${formatPrice(row.price)}</span>
      <span class="numeric ${numberClass(row.change24h)}">${formatPercent(row.change24h)}</span>
      <span><b class="side-badge ${row.side.toLowerCase()}">${row.side}</b></span>
    </button>
  `).join("");
}

function renderAnalysis(row) {
  const panel = document.getElementById("analysisPanel");
  if (!panel) return;

  if (!row) {
    panel.innerHTML = '<div class="empty-state">選出候選幣後，這裡會顯示交易判斷。</div>';
    return;
  }

  const plan = row.plan;
  panel.innerHTML = `
    <div class="analysis-top">
      <div>
        <p class="eyebrow">${escapeHTML(row.symbol)} · 15M SETUP</p>
        <h2 class="analysis-symbol">${escapeHTML(row.symbol)} / USDT</h2>
        <div class="analysis-price">${formatPrice(row.price)} · 24h ${formatPercent(row.change24h)}</div>
      </div>
      <div class="score-ring">
        <b class="side-badge ${row.side.toLowerCase()}">${row.side}</b>
        <strong>${row.score}</strong>
        <small>DECISION SCORE</small>
      </div>
    </div>

    <div class="evidence-grid">
      ${evidence("15M K 線", row.candleTrend, freshness(row.candleUpdatedAt))}
      ${evidence("OPEN INTEREST", formatUSD(row.oiUsd), freshness(row.oiUpdatedAt))}
      ${evidence("FUNDING", formatFunding(row.fundingRate), freshness(row.fundingUpdatedAt))}
    </div>

    <section class="plan">
      <div class="plan-title"><h3>Entry / SL / TP</h3><small>${plan ? "固定風險模型" : "WAIT 不建立交易計畫"}</small></div>
      <div class="plan-grid">
        ${planItem("ENTRY", plan?.entry, "entry")}
        ${planItem("STOP LOSS", plan?.stopLoss, "sl")}
        ${planItem("TP 1", plan?.tp1, "tp")}
        ${planItem("TP 2", plan?.tp2, "tp")}
        ${planItem("TP 3", plan?.tp3, "tp")}
      </div>
    </section>

    <section class="reason-block">
      <div class="reason-title"><h3>AI 解釋原因</h3><small>本機規則摘要 · DATA ${row.explanation.completeness}</small></div>
      <ul>${row.explanation.reasons.map(reason => `<li>${escapeHTML(reason)}</li>`).join("")}</ul>
      <p class="conclusion">${escapeHTML(row.explanation.conclusion)}</p>
    </section>
  `;
}

function evidence(label, value, state) {
  return `<div class="evidence"><small>${label}</small><strong>${value}</strong><div class="freshness ${state.className}">${state.label}</div></div>`;
}

function planItem(label, value, className) {
  return `<div class="plan-item ${className}"><small>${label}</small><strong>${value ? formatPrice(value) : "--"}</strong></div>`;
}

function freshness(timestamp) {
  const time = Number(timestamp);
  if (!Number.isFinite(time) || time <= 0) return { label: "WAITING", className: "" };
  const age = Date.now() - time;
  return age > 60_000
    ? { label: "STALE", className: "stale" }
    : { label: "LIVE", className: "live" };
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

function formatPercent(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `${number > 0 ? "+" : ""}${number.toFixed(2)}%` : "--";
}

function numberClass(value) {
  const number = Number(value);
  return number > 0 ? "positive" : number < 0 ? "negative" : "neutral";
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
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
