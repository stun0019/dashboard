export function selectCandidates(rows, limit = 12) {
  return Object.values(rows)
    .filter(row => isPositive(row.price) && isPositive(row.volume24h))
    .map(row => ({
      ...row,
      attentionScore: calculateAttentionScore(row)
    }))
    .sort((a, b) => b.attentionScore - a.attentionScore)
    .slice(0, limit);
}

export function analyzeCandidate(row) {
  const candleMomentum = calculateCandleMomentum(row.candles);
  const change24h = finite(row.change24h);
  const oiChangePct = finite(row.oiChangePct);
  const fundingPercent = finite(row.fundingRate) * 100;

  const score = clamp(
    50 +
      clamp(candleMomentum / 1.5, -1, 1) * 25 +
      clamp(change24h / 6, -1, 1) * 15 +
      clamp(oiChangePct / 2, -1, 1) * 10 -
      clamp(fundingPercent / 0.05, -1, 1) * 5,
    0,
    100
  );

  const side = score >= 58 ? "LONG" : score <= 42 ? "SHORT" : "WAIT";
  const completeness = [
    Array.isArray(row.candles) && row.candles.length >= 3,
    isPositive(row.oiUsd),
    row.fundingRate !== null && row.fundingRate !== undefined
  ].filter(Boolean).length;

  return {
    ...row,
    side,
    score: Math.round(score),
    confidence: Math.round(Math.abs(score - 50) * 2),
    candleMomentum,
    candleTrend: candleMomentum > 0.2 ? "UP" : candleMomentum < -0.2 ? "DOWN" : "FLAT",
    completeness,
    explanation: explain({ row, side, candleMomentum, change24h, oiChangePct, fundingPercent, completeness })
  };
}

export function calculateAttentionScore(row) {
  const move = Math.abs(finite(row.change24h));
  const liquidity = Math.log10(Math.max(1, finite(row.volume24h)));
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

function explain({ row, side, candleMomentum, change24h, oiChangePct, fundingPercent, completeness }) {
  const reasons = [
    `15m K 線 ${candleMomentum > 0.2 ? "偏多" : candleMomentum < -0.2 ? "偏空" : "尚未形成方向"}（${signed(candleMomentum)}%）`,
    `24h 動能 ${change24h >= 0 ? "上漲" : "下跌"} ${signed(change24h)}%`,
    isPositive(row.oiUsd)
      ? `OI 自本次連線基準變化 ${signed(oiChangePct)}%`
      : "OI 尚未取得，不納入主要判斷",
    row.fundingRate !== null && row.fundingRate !== undefined
      ? `Funding ${signed(fundingPercent, 4)}%，${Math.abs(fundingPercent) >= 0.03 ? "部位較擁擠" : "未見明顯擁擠"}`
      : "Funding 尚未取得"
  ];

  const conclusion = side === "LONG"
    ? "K 線與動能偏多，風險區間成立。"
    : side === "SHORT"
      ? "K 線與動能偏空，風險區間成立。"
      : "條件尚未同向，等待比進場更合理。";

  return {
    reasons,
    conclusion,
    completeness: `${completeness}/3`
  };
}

function signed(value, digits = 2) {
  const number = finite(value);
  return `${number > 0 ? "+" : ""}${number.toFixed(digits)}`;
}

function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function isPositive(value) {
  return finite(value) > 0;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
