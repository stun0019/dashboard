export function selectCandidates(
  rows,
  limit = 12,
  { now = Date.now(), staleAfterMs = 15_000 } = {}
) {
  return Object.values(rows)
    .filter(row => (
      isPositive(row.price) &&
      isPositive(row.volumeNotional24h) &&
      freshness(row.tickerUpdatedAt, staleAfterMs, now) === "fresh"
    ))
    .map(row => ({
      ...row,
      attentionScore: calculateAttentionScore(row)
    }))
    .sort((a, b) => b.attentionScore - a.attentionScore)
    .slice(0, limit);
}

export function analyzeCandidate(row, options = {}) {
  const now = options.now ?? Date.now();
  const states = {
    ticker: freshness(row.tickerUpdatedAt, options.tickerStaleAfterMs ?? 15_000, now),
    candle: dataFreshness(
      row.candleUpdatedAt,
      Array.isArray(row.candles) && row.candles.length >= 3,
      options.candleStaleAfterMs ?? 90_000,
      now
    ),
    oi: dataFreshness(row.oiUpdatedAt, isPositive(row.oiUsd), options.oiStaleAfterMs ?? 30_000, now),
    funding: dataFreshness(
      row.fundingUpdatedAt,
      hasFiniteValue(row.fundingRate),
      options.fundingStaleAfterMs ?? 90_000,
      now
    )
  };

  const candleMomentum = states.candle === "fresh"
    ? calculateCandleMomentum(row.candles)
    : 0;
  const change24h = states.ticker === "fresh" ? finite(row.change24h) : 0;
  const oiChangePct = states.oi === "fresh" ? finite(row.oiChangePct) : 0;
  const fundingPercent = states.funding === "fresh" ? finite(row.fundingRate) * 100 : 0;

  const score = clamp(
    50 +
      clamp(candleMomentum / 1.5, -1, 1) * 25 +
      clamp(change24h / 6, -1, 1) * 15 +
      clamp(oiChangePct / 2, -1, 1) * 10 -
      clamp(fundingPercent / 0.05, -1, 1) * 5,
    0,
    100
  );

  const completeness = [states.candle, states.oi, states.funding]
    .filter(state => state === "fresh").length;
  const hasEnoughData = states.ticker === "fresh" && completeness >= 2;
  const side = !hasEnoughData
    ? "WAIT"
    : score >= 58
      ? "LONG"
      : score <= 42
        ? "SHORT"
        : "WAIT";
  const directionStrength = calculateDirectionStrength(score);
  const setupRating = calculateSetupRating(score, side);

  return {
    ...row,
    side,
    score: Math.round(score),
    confidence: hasEnoughData ? Math.round(directionStrength) : 0,
    directionStrength: Math.round(directionStrength),
    setupRating,
    candleMomentum,
    candleTrend: states.candle !== "fresh"
      ? "WAIT"
      : candleMomentum > 0.2
        ? "UP"
        : candleMomentum < -0.2
          ? "DOWN"
          : "FLAT",
    completeness,
    freshness: states,
    explanation: explain({
      row,
      side,
      states,
      candleMomentum,
      change24h,
      oiChangePct,
      fundingPercent,
      completeness
    })
  };
}

export function calculateSetupRating(score, side) {
  const strength = calculateDirectionStrength(score);
  const rating = Math.min(5, Math.floor(strength / 20) + 1);
  return String(side || "").toUpperCase() === "WAIT"
    ? Math.min(3, rating)
    : rating;
}

export function calculateDirectionStrength(score) {
  return clamp(Math.abs(finite(score) - 50) * 2, 0, 100);
}

export function calculateAttentionScore(row) {
  const move = Math.abs(finite(row.change24h));
  const liquidity = Math.log10(Math.max(1, finite(row.volumeNotional24h)));
  return move * 4 + liquidity;
}

function calculateCandleMomentum(candles = []) {
  const usable = candles.filter(candle => isPositive(candle.close)).slice(-20);
  if (usable.length < 3) return 0;
  const recent = usable.slice(-3).reduce((sum, candle) => sum + candle.close, 0) / 3;
  const baselineRows = usable.slice(0, Math.min(5, usable.length));
  const baseline = baselineRows.reduce((sum, candle) => sum + candle.close, 0) / baselineRows.length;
  return baseline > 0 ? ((recent - baseline) / baseline) * 100 : 0;
}

function explain({ row, side, states, candleMomentum, change24h, oiChangePct, fundingPercent, completeness }) {
  const reasons = [
    states.candle === "fresh"
      ? `15m K 線 ${candleMomentum > 0.2 ? "偏多" : candleMomentum < -0.2 ? "偏空" : "尚未形成方向"}（${signed(candleMomentum)}%）`
      : `15m K 線${unavailable(states.candle)}，不納入判斷`,
    states.ticker === "fresh"
      ? `24h 動能 ${change24h >= 0 ? "上漲" : "下跌"} ${signed(change24h)}%`
      : "Ticker 已過期，停止建立交易判斷",
    states.oi === "fresh"
      ? `OI 自本次連線基準變化 ${signed(oiChangePct)}%`
      : `OI${unavailable(states.oi)}，不納入判斷`,
    states.funding === "fresh"
      ? `Funding ${signed(fundingPercent, 4)}%，${Math.abs(fundingPercent) >= 0.03 ? "部位較擁擠" : "未見明顯擁擠"}`
      : `Funding${unavailable(states.funding)}，不納入判斷`
  ];

  const conclusion = side === "LONG"
    ? "有效資料偏多，風險區間成立。"
    : side === "SHORT"
      ? "有效資料偏空，風險區間成立。"
      : completeness < 2 || states.ticker !== "fresh"
        ? "有效資料不足，維持 WAIT。"
        : "條件尚未同向，維持 WAIT。";

  return { reasons, conclusion, completeness: `${completeness}/3` };
}

function dataFreshness(updatedAt, hasValue, staleAfterMs, now) {
  return hasValue ? freshness(updatedAt, staleAfterMs, now) : "missing";
}

function freshness(updatedAt, staleAfterMs, now) {
  const timestamp = Number(updatedAt);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return "missing";
  return now - timestamp > staleAfterMs ? "stale" : "fresh";
}

function unavailable(state) {
  return state === "stale" ? "已過期" : "尚未取得";
}

function signed(value, digits = 2) {
  const number = finite(value);
  return `${number > 0 ? "+" : ""}${number.toFixed(digits)}`;
}

function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function hasFiniteValue(value) {
  return value !== "" && value !== null && value !== undefined && Number.isFinite(Number(value));
}

function isPositive(value) {
  return finite(value) > 0;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
