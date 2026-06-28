// src/utils/indicators.js

export function calcSMA(closes, period) {
  if (closes.length < period) return null;
  const slice = closes.slice(-period);
  const sum = slice.reduce((a, b) => a + b, 0);
  return sum / period;
}

export function calcKD(highs, lows, closes, period = 9) {
  if (closes.length < period) return null;
  
  // 簡易版 KD 計算 (最後一天的值)
  const recentHighs = highs.slice(-period);
  const recentLows = lows.slice(-period);
  const currentClose = closes[closes.length - 1];
  
  const maxH = Math.max(...recentHighs);
  const minL = Math.min(...recentLows);
  
  if (maxH === minL) return { k: 50, d: 50, rsv: 50 };
  
  const rsv = ((currentClose - minL) / (maxH - minL)) * 100;
  
  // 假設前一天 K=50, D=50 (此處為極度簡化，實際應使用 EMA 平滑計算歷史 K/D)
  const k = (2/3) * 50 + (1/3) * rsv;
  const d = (2/3) * 50 + (1/3) * k;
  
  return { k, d, rsv };
}

export function calcMACD(closes) {
  if (closes.length < 26) return null;
  
  // 簡易版 MACD (僅取近期 EMA 計算 DIF，未計算歷史 Signal)
  const k12 = 2 / 13;
  const k26 = 2 / 27;
  
  let ema12 = closes[0];
  let ema26 = closes[0];
  
  for (let i = 1; i < closes.length; i++) {
    ema12 = closes[i] * k12 + ema12 * (1 - k12);
    ema26 = closes[i] * k26 + ema26 * (1 - k26);
  }
  
  const dif = ema12 - ema26;
  // 假設 Signal 為前一天的 DIF (簡化)
  const signal = dif * 0.9; 
  const hist = dif - signal;
  
  return { dif, signal, hist };
}

export function calcBB(closes, period = 20, mult = 2) {
  if (closes.length < period) return null;
  
  const slice = closes.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
  const std = Math.sqrt(variance);
  
  return {
    upper: mean + mult * std,
    mid: mean,
    lower: mean - mult * std
  };
}

// TR (True Range)
function calcTR(high, low, prevClose) {
  if (prevClose === undefined) return high - low;
  return Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
}

export function calcATR(highs, lows, closes, period = 14) {
  if (closes.length < period) return null;
  const trs = [];
  for (let i = 0; i < closes.length; i++) {
    trs.push(calcTR(highs[i], lows[i], i > 0 ? closes[i - 1] : undefined));
  }
  
  let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < trs.length; i++) {
    atr = (atr * (period - 1) + trs[i]) / period;
  }
  return atr;
}

export function calcADX(highs, lows, closes, period = 14) {
  if (closes.length < period * 2) return null;
  let trs = [], pDms = [], nDms = [];
  
  for (let i = 1; i < closes.length; i++) {
    trs.push(calcTR(highs[i], lows[i], closes[i - 1]));
    let upMove = highs[i] - highs[i - 1];
    let downMove = lows[i - 1] - lows[i];
    
    if (upMove > downMove && upMove > 0) {
      pDms.push(upMove);
      nDms.push(0);
    } else if (downMove > upMove && downMove > 0) {
      pDms.push(0);
      nDms.push(downMove);
    } else {
      pDms.push(0);
      nDms.push(0);
    }
  }
  
  // Wilder Smoothing
  const smooth = (val, prev, p) => prev - (prev / p) + val;
  
  let trSum = trs.slice(0, period).reduce((a, b) => a + b, 0);
  let pDmSum = pDms.slice(0, period).reduce((a, b) => a + b, 0);
  let nDmSum = nDms.slice(0, period).reduce((a, b) => a + b, 0);
  
  let dxs = [];
  for (let i = period; i < trs.length; i++) {
    trSum = smooth(trs[i], trSum, period);
    pDmSum = smooth(pDms[i], pDmSum, period);
    nDmSum = smooth(nDms[i], nDmSum, period);
    
    let pDi = (pDmSum / trSum) * 100;
    let nDi = (nDmSum / trSum) * 100;
    let dx = Math.abs(pDi - nDi) / (pDi + nDi) * 100;
    dxs.push(dx);
  }
  
  let adx = dxs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < dxs.length; i++) {
    adx = (adx * (period - 1) + dxs[i]) / period;
  }
  return adx;
}

export function calcOBV(closes, volumes) {
  if (closes.length === 0) return null;
  let obv = [0];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i] > closes[i - 1]) {
      obv.push(obv[i - 1] + volumes[i]);
    } else if (closes[i] < closes[i - 1]) {
      obv.push(obv[i - 1] - volumes[i]);
    } else {
      obv.push(obv[i - 1]);
    }
  }
  return obv;
}

// ==========================================
// User Requested Refactored Interface
// ==========================================

export function calculateMA(data, period) {
  if (data.length < period) return { value: null, signal: 'neutral', desc: '資料不足' };
  const closes = data.map(d => d.close);
  const currentClose = closes[closes.length - 1];
  const maValue = calcSMA(closes, period);
  return {
    value: maValue,
    signal: currentClose > maValue ? 'up' : 'dn',
    desc: currentClose > maValue ? '站上均線' : '跌破均線'
  };
}

export function calculateMACD(data, short = 12, long = 26, signal = 9) {
  if (data.length < long) return { dif: null, signal: 'neutral', desc: '資料不足' };
  const closes = data.map(d => d.close);
  const macd = calcMACD(closes); // Re-use old logic for now
  return {
    dif: macd.dif,
    signal: macd.hist > 0 ? 'up' : 'dn',
    desc: macd.hist > 0 ? '金叉 (看多)' : '死叉 (看空)'
  };
}

export function calculateBollinger(data, period = 20, multiplier = 2) {
  if (data.length < period) return { upper: null, signal: 'neutral', desc: '資料不足' };
  const closes = data.map(d => d.close);
  const currentClose = closes[closes.length - 1];
  const bb = calcBB(closes, period, multiplier);
  return {
    upper: bb.upper,
    lower: bb.lower,
    signal: currentClose > bb.upper ? 'up' : currentClose < bb.lower ? 'dn' : 'neutral',
    desc: currentClose > bb.upper ? '突破上軌' : currentClose < bb.lower ? '跌破下軌' : '通道內震盪'
  };
}

export function analyzeSignals(data) {
  if (!data || data.length === 0) return null;
  
  const currentClose = data[data.length - 1].close;
  const prevClose = data.length > 1 ? data[data.length - 2].close : currentClose;
  
  const highs = data.map(d => d.high);
  const lows = data.map(d => d.low);
  const closes = data.map(d => d.close);
  const volumes = data.map(d => d.volume);
  
  const currentVol = volumes[volumes.length - 1];
  const avgVol = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;

  // 1. Trend Engine (趨勢結構)
  const ma5 = calcSMA(closes, 5);
  const ma20 = calcSMA(closes, 20);
  const ma60 = calcSMA(closes, 60);
  const adx = calcADX(highs, lows, closes, 14);

  let trendState = 'neutral';
  let maAlignment = 'mixed';
  if (ma5 && ma20 && ma60) {
    if (ma5 > ma20 && ma20 > ma60) {
      maAlignment = 'bullish_alignment';
      trendState = adx > 25 ? 'strong_uptrend' : 'weak_uptrend';
    } else if (ma5 < ma20 && ma20 < ma60) {
      maAlignment = 'bearish_alignment';
      trendState = adx > 25 ? 'strong_downtrend' : 'weak_downtrend';
    } else {
      maAlignment = 'consolidation';
      trendState = 'ranging';
    }
  }

  // 2. Volume Engine (價量結構)
  const obvs = calcOBV(closes, volumes);
  let obvTrend = 'neutral';
  let divergence = false;
  
  if (obvs && closes.length >= 20) {
    const recentCloses = closes.slice(-20);
    const recentObvs = obvs.slice(-20);
    const maxClose = Math.max(...recentCloses);
    const maxObv = Math.max(...recentObvs);
    const currentObv = obvs[obvs.length - 1];
    
    // OBV 斜率簡易判斷 (最後一筆 vs 5天前)
    const pastObv = obvs[obvs.length - 5];
    if (currentObv > pastObv) obvTrend = 'up';
    else if (currentObv < pastObv) obvTrend = 'down';

    // 高檔背離
    if (currentClose >= maxClose * 0.98 && currentObv < maxObv * 0.95) {
      divergence = true;
    }
  }

  // 3. 結構性 R/R
  const atr = calcATR(highs, lows, closes, 14);
  let support = null;
  let resistance = null;
  let rrRatio = null;

  if (atr && closes.length >= 20) {
    const recentLows = lows.slice(-20);
    const recentHighs = highs.slice(-20);
    
    support = Math.min(...recentLows);
    if (currentClose <= support) {
        support = currentClose - (2 * atr);
    }
    
    resistance = Math.max(...recentHighs);
    if (currentClose >= resistance) {
        resistance = currentClose + (2 * atr);
    }

    if (resistance > currentClose && currentClose > support) {
      rrRatio = (resistance - currentClose) / (currentClose - support);
    } else {
      rrRatio = 1.0;
    }
  }

  // 4. Quality Engine (Mock)
  const mockSeed = Math.floor(currentClose);
  const roeStability = 0.6 + ((mockSeed % 40) / 100);
  const fcfQuality = 0.5 + ((mockSeed % 50) / 100);
  const marginTrend = mockSeed % 2 === 0 ? 'up' : 'stable';

  // 5. Risk / Invalidation
  const riskConditions = [];
  if (ma60 && currentClose < ma60) {
    riskConditions.push('價格跌破 MA60 (趨勢失效)');
  }
  if (support && currentClose < support * 1.01) {
    riskConditions.push('接近或跌破近期支撐 (結構破壞)');
  }
  if (obvTrend === 'down' && currentClose < prevClose && currentVol > avgVol * 1.2) {
    riskConditions.push('放量下跌且 OBV 下降 (資金撤出)');
  }
  
  if (riskConditions.length === 0) {
    riskConditions.push(`若跌破支撐 ${support ? support.toFixed(2) : '---'} 則交易邏輯失效`);
  }

  return {
    price: currentClose,
    changePercent: ((currentClose - prevClose) / prevClose) * 100,
    trend: {
      ma_state: maAlignment,
      adx: adx ? adx : 0,
      trend_state: trendState
    },
    volume: {
      obv_trend: obvTrend,
      divergence: divergence
    },
    rr: {
      support: support,
      resistance: resistance,
      rr_ratio: rrRatio
    },
    quality: {
      roe_stability: roeStability,
      fcf_quality: fcfQuality,
      margin_trend: marginTrend
    },
    risk: {
      conditions: riskConditions
    }
  };
}
