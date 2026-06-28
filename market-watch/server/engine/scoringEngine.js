const STYLES = {
  QUALITY: {
    weights: { trend: 0.25, quality: 0.35, flow: 0.15, valuation: 0.15, risk: 0.10 }
  },
  GROWTH: {
    weights: { trend: 0.30, quality: 0.15, flow: 0.25, valuation: 0.10, risk: 0.20 }
  },
  CYCLICAL: {
    weights: { trend: 0.35, quality: 0.10, flow: 0.20, valuation: 0.25, risk: 0.10 }
  },
  ETF: {
    weights: { trend: 0.40, quality: 0.20, flow: 0.20, valuation: 0.10, risk: 0.10 }
  }
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function score(features, styleName) {
  const style = STYLES[styleName] || STYLES.QUALITY;
  const w = style.weights;

  let finalScore =
    features.trend * w.trend +
    features.quality * w.quality +
    features.flow * w.flow +
    features.valuation * w.valuation;

  // risk is penalty
  finalScore -= features.risk * w.risk;

  return clamp(Math.round(finalScore), 0, 100);
}

function mapSignal(score) {
  if (score >= 80) return "極強多頭";
  if (score >= 60) return "強勢偏多";
  if (score >= 40) return "區間震盪";
  return "弱勢空頭";
}

function generateExplanation(features, score, signal) {
  // A simplistic explanation generator
  return [
    { type: "trend", text: `趨勢結構得分: ${features.trend.toFixed(1)}` },
    { type: "quality", text: `基本面與成長得分: ${features.quality.toFixed(1)}` },
    { type: "flow", text: `資金與籌碼得分: ${features.flow.toFixed(1)}` },
    { type: "valuation", text: `估值水位得分: ${features.valuation.toFixed(1)}` }
  ];
}

function generateRiskAlerts(features) {
  const alerts = [];
  if (features.risk > 50) alerts.push("高風險警告：請注意近期負面新聞或劇烈波動");
  if (features.trend < 30) alerts.push("趨勢已遭破壞，股價跌破季線");
  if (features.latestNews && features.latestNews.length > 0) {
    const negativeKeywords = ['跌停', '衰退', '下修', '看壞', '崩', '重挫', '利空', '降評'];
    const hasNegativeNews = features.latestNews.some(n => negativeKeywords.some(kw => (n.title || '').includes(kw)));
    if (hasNegativeNews) alerts.push("新聞情緒警告：近期有偏空新聞傳出");
  }
  return alerts;
}

module.exports = {
  STYLES,
  score,
  mapSignal,
  generateExplanation,
  generateRiskAlerts
};
