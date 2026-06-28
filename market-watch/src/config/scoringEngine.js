export function extractFeatures(stockRaw) {
  // 從真實 API 取得的資料
  const pe = parseFloat(stockRaw.PEratio) || 0;
  const pb = parseFloat(stockRaw.PBratio) || 0;
  const yieldPct = parseFloat(stockRaw.DividendYield) || 0;

  // Transform to 0-100 scales for basic sorting
  // Yield: 0% -> 0, 10% -> 100
  let yield_score = Math.min(100, yieldPct * 10);
  
  // PE: 10~15 is optimal (100). PE < 10 (value trap risk), PE > 30 (expensive)
  let pe_score = 50;
  if (pe > 0 && pe <= 15) pe_score = 100 - (15 - pe) * 2; // 10 -> 90, 15 -> 100
  else if (pe > 15 && pe <= 30) pe_score = 100 - (pe - 15) * 3; // 30 -> 55
  else if (pe > 30) pe_score = Math.max(0, 55 - (pe - 30));
  else if (pe === 0) pe_score = 0; // 虧損

  // PB: < 1.5 is good
  let pb_score = 50;
  if (pb > 0 && pb <= 1.5) pb_score = 100;
  else if (pb > 1.5) pb_score = Math.max(0, 100 - (pb - 1.5) * 20);

  return {
    pe_score,
    pb_score,
    yield_score
  };
}

export const STYLES = {
  QUALITY: {
    label: 'Quality'
  },
  GROWTH: {
    label: 'Growth'
  },
  CYCLICAL: {
    label: 'Cyclical'
  },
  ETF: {
    label: 'ETF'
  }
};

// 第一階段基礎計分器 (供前端過濾海選使用)
export function calculateScore(features, styleId, regime) {
  let score = 50;

  if (styleId === 'QUALITY') {
    // Quality 喜歡適當本益比、低淨值比、有殖利率
    score = features.pe_score * 0.4 + features.pb_score * 0.3 + features.yield_score * 0.3;
  } else if (styleId === 'GROWTH') {
    // Growth 的本益比通常較高，我們稍微反轉 PE 的偏好 (高 PE 視為市場有成長期待)
    const growth_pe = Math.max(0, 100 - features.pe_score); 
    score = growth_pe * 0.5 + features.pb_score * 0.5;
  } else if (styleId === 'CYCLICAL') {
    // 景氣循環看重淨值比乖離
    score = features.pb_score * 0.8 + features.yield_score * 0.2;
  } else if (styleId === 'ETF') {
    // ETF 通常看重高殖利率與配息穩健
    score = features.yield_score * 0.8 + features.pb_score * 0.2;
  }

  // Regime Bias (熊市時更看重殖利率防禦性)
  if (regime === 'bear') {
    score = score * 0.8 + features.yield_score * 0.3; 
  } else {
    // 牛市稍微放大分數
    score = score * 1.1;
  }

  return Math.min(100, Math.max(0, score));
}
