import { useMemo } from 'react'

function ema(arr, period) {
  const k = 2 / (period + 1)
  const result = []
  let prev = null
  for (const v of arr) {
    if (v == null) { result.push(null); continue }
    if (prev === null) { prev = v; result.push(v); continue }
    prev = v * k + prev * (1 - k)
    result.push(prev)
  }
  return result
}

function rsi(closes, period = 14) {
  if (closes.length < period + 1) return null
  let gains = 0, losses = 0
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1]
    if (diff >= 0) gains += diff; else losses -= diff
  }
  let avgGain = gains / period
  let avgLoss = losses / period
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1]
    avgGain = (avgGain * (period - 1) + (diff > 0 ? diff : 0)) / period
    avgLoss = (avgLoss * (period - 1) + (diff < 0 ? -diff : 0)) / period
  }
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
  return 100 - 100 / (1 + rs)
}

function sma(arr, period) {
  return arr.map((_, i) => {
    if (i < period - 1) return null
    const slice = arr.slice(i - period + 1, i + 1)
    if (slice.some(v => v == null)) return null
    return slice.reduce((a, b) => a + b, 0) / period
  })
}

export function useTechIndicators(candles) {
  return useMemo(() => {
    if (!candles || candles.length < 26) return null
    const closes = candles.map(c => c.close)
    const highs = candles.map(c => c.high)
    const lows = candles.map(c => c.low)

    // MACD
    const ema12 = ema(closes, 12)
    const ema26 = ema(closes, 26)
    const macdLine = ema12.map((v, i) => (v != null && ema26[i] != null) ? v - ema26[i] : null)
    const signalLine = ema(macdLine.filter(v => v != null), 9)
    const lastMacd = macdLine.filter(v => v != null).slice(-1)[0] ?? 0
    const lastSignal = signalLine.slice(-1)[0] ?? 0
    const macdSignal = lastMacd > lastSignal ? '金叉（看多）' : lastMacd < lastSignal ? '死叉（看空）' : '中立'

    // KD (9-day)
    const period = 9
    const rsvArr = closes.map((_, i) => {
      if (i < period - 1) return 50
      const sliceH = highs.slice(i - period + 1, i + 1)
      const sliceL = lows.slice(i - period + 1, i + 1)
      const hh = Math.max(...sliceH)
      const ll = Math.min(...sliceL)
      return hh === ll ? 50 : ((closes[i] - ll) / (hh - ll)) * 100
    })
    let K = 50, D = 50
    const Ks = [], Ds = []
    for (const rsv of rsvArr) {
      K = (2 / 3) * K + (1 / 3) * rsv
      D = (2 / 3) * D + (1 / 3) * K
      Ks.push(K)
      Ds.push(D)
    }
    const lastK = Ks[Ks.length - 1]
    const lastD = Ds[Ds.length - 1]
    const prevK = Ks[Ks.length - 2]
    const prevD = Ds[Ds.length - 2]
    let kdSignal = '中立'
    if (prevK <= prevD && lastK > lastD && lastK < 50) kdSignal = '低檔金叉（買訊）'
    else if (prevK >= prevD && lastK < lastD && lastK > 50) kdSignal = '高檔死叉（賣訊）'
    else if (lastK > lastD) kdSignal = 'K>D（偏多）'
    else kdSignal = 'K<D（偏空）'

    // MA
    const ma5 = sma(closes, 5).slice(-1)[0]
    const ma20 = sma(closes, 20).slice(-1)[0]
    const ma60  = closes.length >= 60  ? sma(closes, 60).slice(-1)[0]  : null
    const ma120 = closes.length >= 120 ? sma(closes, 120).slice(-1)[0] : null
    const ma240 = closes.length >= 240 ? sma(closes, 240).slice(-1)[0] : null
    const lastClose = closes[closes.length - 1]
    let maStatus = '均線多頭排列'
    if (ma5 && ma20) {
      if (lastClose > ma5 && ma5 > ma20) maStatus = '多頭排列（均線支撐）'
      else if (lastClose < ma5 && ma5 < ma20) maStatus = '空頭排列（均線壓力）'
      else maStatus = '均線糾結（盤整）'
    }

    const trend = lastClose > (ma20 ?? lastClose) ? '中期上升趨勢' : '中期下降趨勢'

    // Candle pattern (last 2 candles)
    const n = candles.length
    const last = candles[n - 1], prev = candles[n - 2]
    let candlePattern = null
    if (last && prev) {
      const body = Math.abs(last.close - last.open)
      const range = last.high - last.low || 0.0001
      const upperWick = last.high - Math.max(last.close, last.open)
      const lowerWick = Math.min(last.close, last.open) - last.low
      const prevBody = Math.abs(prev.close - prev.open)

      if (body / range < 0.1) {
        candlePattern = { name: '十字線 Doji', hint: '多空拉鋸，行情可能轉折', bull: null }
      } else if (lowerWick > body * 2 && upperWick < body && last.close > last.open) {
        candlePattern = { name: '錘子線 Hammer', hint: '低檔長下影，潛在看漲訊號', bull: true }
      } else if (upperWick > body * 2 && lowerWick < body && last.close < last.open) {
        candlePattern = { name: '流星線 Shooting Star', hint: '高檔長上影，潛在看跌訊號', bull: false }
      } else if (
        prev.close < prev.open && last.close > last.open &&
        last.open < prev.close && last.close > prev.open
      ) {
        candlePattern = { name: '看漲吞噬 Bull Engulfing', hint: '陽線吞噬前日陰線，強力做多訊號', bull: true }
      } else if (
        prev.close > prev.open && last.close < last.open &&
        last.open > prev.close && last.close < prev.open
      ) {
        candlePattern = { name: '看跌吞噬 Bear Engulfing', hint: '陰線吞噬前日陽線，強力做空訊號', bull: false }
      } else if (last.close > last.open && body > prevBody * 1.5) {
        candlePattern = { name: '大陽線 Bull Marubozu', hint: '多方強勢，上漲動能充足', bull: true }
      } else if (last.close < last.open && body > prevBody * 1.5) {
        candlePattern = { name: '大陰線 Bear Marubozu', hint: '空方強勢，下跌動能充足', bull: false }
      }
    }

    // ATR(14) — Average True Range
    const atrPeriod = 14
    let atr = null
    if (candles.length >= atrPeriod + 1) {
      const trArr = candles.slice(1).map((c, i) => {
        const prev = candles[i]
        return Math.max(c.high - c.low, Math.abs(c.high - prev.close), Math.abs(c.low - prev.close))
      })
      let avgTR = trArr.slice(0, atrPeriod).reduce((a, b) => a + b, 0) / atrPeriod
      for (let i = atrPeriod; i < trArr.length; i++) {
        avgTR = (avgTR * (atrPeriod - 1) + trArr[i]) / atrPeriod
      }
      atr = avgTR
    }
    const atrPct = atr && lastClose ? ((atr / lastClose) * 100) : null
    let volatility = '─'
    if (atrPct !== null) {
      if (atrPct > 3) volatility = '高波動（風險較大）'
      else if (atrPct > 1.5) volatility = '中波動（正常區間）'
      else volatility = '低波動（盤整走勢）'
    }

    // RSI(14)
    const lastRsi = rsi(closes, 14)
    let rsiSignal = '中立'
    if (lastRsi !== null) {
      if (lastRsi >= 70) rsiSignal = '超買區（注意回落）'
      else if (lastRsi <= 30) rsiSignal = '超賣區（留意反彈）'
      else if (lastRsi >= 55) rsiSignal = '偏強（多方主導）'
      else if (lastRsi <= 45) rsiSignal = '偏弱（空方主導）'
      else rsiSignal = '中性區間'
    }

    // MFI (Money Flow Index, 14-period)
    const volumes = candles.map(c => c.volume ?? 0)
    let lastMfi = null
    let mfiSignal = '中立'
    if (candles.length >= 15 && volumes.some(v => v > 0)) {
      const typicals = candles.map(c => (c.high + c.low + c.close) / 3)
      let posFlow = 0, negFlow = 0
      for (let i = 1; i <= 14; i++) {
        const mf = typicals[candles.length - 15 + i] * volumes[candles.length - 15 + i]
        if (typicals[candles.length - 15 + i] >= typicals[candles.length - 16 + i]) posFlow += mf
        else negFlow += mf
      }
      const mfr = negFlow === 0 ? 100 : posFlow / negFlow
      lastMfi = 100 - 100 / (1 + mfr)
      if (lastMfi >= 80) mfiSignal = '超買（資金過熱）'
      else if (lastMfi <= 20) mfiSignal = '超賣（資金撤退）'
      else if (lastMfi >= 60) mfiSignal = '偏強（資金流入）'
      else if (lastMfi <= 40) mfiSignal = '偏弱（資金流出）'
      else mfiSignal = '中性均衡'
    }

    // OBV trend (On-Balance Volume — rising / falling)
    let obvTrend = null
    if (volumes.some(v => v > 0) && candles.length >= 10) {
      let obv = 0
      const obvArr = [0]
      for (let i = 1; i < candles.length; i++) {
        if (closes[i] > closes[i - 1]) obv += volumes[i]
        else if (closes[i] < closes[i - 1]) obv -= volumes[i]
        obvArr.push(obv)
      }
      const obvSlice = obvArr.slice(-10)
      const obvFirst = obvSlice[0], obvLast = obvSlice[obvSlice.length - 1]
      const priceDiff = closes[closes.length - 1] - closes[closes.length - 10]
      if (priceDiff > 0 && obvLast > obvFirst) obvTrend = 'confirm-up'
      else if (priceDiff < 0 && obvLast < obvFirst) obvTrend = 'confirm-dn'
      else if (priceDiff > 0 && obvLast < obvFirst) obvTrend = 'diverge-dn'
      else if (priceDiff < 0 && obvLast > obvFirst) obvTrend = 'diverge-up'
    }

    // Stochastic RSI (14,14,3,3)
    let stochRsiK = null, stochRsiD = null, stochRsiSignal = '中立'
    if (closes.length >= 28) {
      const rsiArr = []
      for (let i = 14; i <= closes.length; i++) {
        rsiArr.push(rsi(closes.slice(0, i), 14))
      }
      const validRsi = rsiArr.filter(v => v !== null)
      if (validRsi.length >= 14) {
        const slice = validRsi.slice(-14)
        const minR = Math.min(...slice), maxR = Math.max(...slice)
        const lastRsiRaw = validRsi[validRsi.length - 1]
        const rawK = maxR === minR ? 50 : ((lastRsiRaw - minR) / (maxR - minR)) * 100
        const prevK = validRsi.length >= 15
          ? (() => {
              const s2 = validRsi.slice(-15, -1)
              const mn = Math.min(...s2), mx = Math.max(...s2)
              return mx === mn ? 50 : ((validRsi[validRsi.length - 2] - mn) / (mx - mn)) * 100
            })()
          : rawK
        stochRsiK = rawK
        stochRsiD = (rawK + prevK) / 2
        if (stochRsiK >= 80) stochRsiSignal = '超買（注意回落）'
        else if (stochRsiK <= 20) stochRsiSignal = '超賣（留意反彈）'
        else if (stochRsiK > stochRsiD) stochRsiSignal = 'K>D（偏多）'
        else stochRsiSignal = 'K<D（偏空）'
      }
    }

    // Williams %R (14-period)
    let williamsR = null, wrSignal = '中立'
    if (candles.length >= 14) {
      const sliceH = highs.slice(-14), sliceL = lows.slice(-14)
      const hh = Math.max(...sliceH), ll = Math.min(...sliceL)
      if (hh !== ll) {
        williamsR = ((hh - closes[closes.length - 1]) / (hh - ll)) * -100
        if (williamsR >= -20) wrSignal = '超買（高檔警示）'
        else if (williamsR <= -80) wrSignal = '超賣（低檔機會）'
        else if (williamsR >= -50) wrSignal = '偏多區間'
        else wrSignal = '偏空區間'
      }
    }

    // ADX (14-period) — Average Directional Index
    let adx = null, plusDI = null, minusDI = null, adxSignal = '─'
    if (candles.length >= 28) {
      const smaPeriod = 14
      let trSum = 0, pmSum = 0, nmSum = 0
      for (let i = 1; i <= smaPeriod; i++) {
        const c = candles[i], p = candles[i - 1]
        const tr = Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close))
        const pm = Math.max(c.high - p.high, 0)
        const nm = Math.max(p.low - c.low, 0)
        trSum += tr
        pmSum += (pm > nm ? pm : 0)
        nmSum += (nm > pm ? nm : 0)
      }
      let smoothTR = trSum, smoothPM = pmSum, smoothNM = nmSum
      let dxSum = 0
      const dxArr = []
      for (let i = smaPeriod + 1; i < candles.length; i++) {
        const c = candles[i], p = candles[i - 1]
        const tr = Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close))
        const pm = Math.max(c.high - p.high, 0)
        const nm = Math.max(p.low - c.low, 0)
        smoothTR = smoothTR - smoothTR / smaPeriod + tr
        smoothPM = smoothPM - smoothPM / smaPeriod + (pm > nm ? pm : 0)
        smoothNM = smoothNM - smoothNM / smaPeriod + (nm > pm ? nm : 0)
        const pdi = smoothTR > 0 ? (smoothPM / smoothTR) * 100 : 0
        const ndi = smoothTR > 0 ? (smoothNM / smoothTR) * 100 : 0
        const sum = pdi + ndi
        const dx = sum > 0 ? (Math.abs(pdi - ndi) / sum) * 100 : 0
        dxArr.push({ dx, pdi, ndi })
      }
      if (dxArr.length >= smaPeriod) {
        const lastN = dxArr.slice(-smaPeriod)
        adx = lastN.reduce((s, v) => s + v.dx, 0) / smaPeriod
        plusDI = dxArr[dxArr.length - 1].pdi
        minusDI = dxArr[dxArr.length - 1].ndi
        if (adx >= 40) adxSignal = plusDI > minusDI ? '強趨勢多頭' : '強趨勢空頭'
        else if (adx >= 25) adxSignal = plusDI > minusDI ? '趨勢偏多' : '趨勢偏空'
        else adxSignal = '盤整無方向（ADX 弱）'
      }
    }

    // Rate of Change (ROC) — 10-day momentum
    let roc10 = null, roc21 = null, rocSignal = '─'
    if (closes.length >= 22) {
      roc10 = ((closes[closes.length - 1] - closes[closes.length - 11]) / closes[closes.length - 11]) * 100
      roc21 = ((closes[closes.length - 1] - closes[closes.length - 22]) / closes[closes.length - 22]) * 100
      if (roc10 >= 5) rocSignal = '強勁上漲動能'
      else if (roc10 >= 2) rocSignal = '溫和上漲動能'
      else if (roc10 <= -5) rocSignal = '強勁下跌動能'
      else if (roc10 <= -2) rocSignal = '溫和下跌動能'
      else rocSignal = '動能中性'
    }

    // Multi-timeframe RSI (weekly and monthly from daily data)
    function resampleCandles(cands, n) {
      const result = []
      for (let i = 0; i + n <= cands.length; i += n) {
        const slice = cands.slice(i, i + n)
        result.push({
          open:  slice[0].open,
          high:  Math.max(...slice.map(c => c.high)),
          low:   Math.min(...slice.map(c => c.low)),
          close: slice[slice.length - 1].close,
          volume: slice.reduce((s, c) => s + (c.volume ?? 0), 0),
          time:  slice[slice.length - 1].time,
        })
      }
      return result
    }
    const weeklyCandles  = resampleCandles(candles, 5)
    const monthlyCandles = resampleCandles(candles, 21)
    const weeklyRsi  = weeklyCandles.length  >= 15 ? rsi(weeklyCandles.map(c => c.close),  14) : null
    const monthlyRsi = monthlyCandles.length >= 15 ? rsi(monthlyCandles.map(c => c.close), 14) : null
    const weeklyMacd  = (() => {
      if (weeklyCandles.length < 26) return null
      const cl = weeklyCandles.map(c => c.close)
      const k12 = 2/13, k26 = 2/27, k9 = 2/10
      let e12 = cl[0], e26 = cl[0]
      const ml = cl.map(v => { e12 = v*k12+e12*(1-k12); e26 = v*k26+e26*(1-k26); return e12-e26 })
      let sig = ml[0]; const sl = ml.map(v => { sig = v*k9+sig*(1-k9); return sig })
      return ml[ml.length-1] > sl[sl.length-1] ? '多' : '空'
    })()

    // RSI Divergence detection (last 30 bars)
    let rsiDivergence = null
    if (closes.length >= 30) {
      const rsiSeries = []
      for (let i = 14; i <= closes.length; i++) {
        const val = rsi(closes.slice(0, i), 14)
        if (val !== null) rsiSeries.push({ idx: i - 1, rsi: val })
      }
      const recent = 20
      const priceSlice = closes.slice(-recent)
      const rsiSlice = rsiSeries.slice(-recent)
      if (rsiSlice.length >= 8) {
        const findLocalHighs = arr => {
          const peaks = []
          for (let i = 1; i < arr.length - 1; i++) {
            if (arr[i] > arr[i - 1] && arr[i] > arr[i + 1]) peaks.push(i)
          }
          return peaks
        }
        const findLocalLows = arr => {
          const troughs = []
          for (let i = 1; i < arr.length - 1; i++) {
            if (arr[i] < arr[i - 1] && arr[i] < arr[i + 1]) troughs.push(i)
          }
          return troughs
        }
        const priceHighs = findLocalHighs(priceSlice)
        const priceLows  = findLocalLows(priceSlice)
        const rsiVals    = rsiSlice.map(p => p.rsi)
        if (priceHighs.length >= 2) {
          const h1 = priceHighs[priceHighs.length - 2], h2 = priceHighs[priceHighs.length - 1]
          if (priceSlice[h2] > priceSlice[h1] && rsiVals[h2] < rsiVals[h1]) {
            rsiDivergence = { type: 'bearish', desc: '頂背離（看空）', bull: false }
          }
        }
        if (priceLows.length >= 2 && !rsiDivergence) {
          const l1 = priceLows[priceLows.length - 2], l2 = priceLows[priceLows.length - 1]
          if (priceSlice[l2] < priceSlice[l1] && rsiVals[l2] > rsiVals[l1]) {
            rsiDivergence = { type: 'bullish', desc: '底背離（看多）', bull: true }
          }
        }
      }
    }

    // Parabolic SAR
    let psarBull = null, psarSignal = '─', lastSar = null
    if (candles.length >= 5) {
      let bull = true, af = 0.02, maxAf = 0.2
      let ep = highs[0], sar = lows[0]
      for (let i = 1; i < candles.length; i++) {
        const prevSar = sar
        if (bull) {
          sar = prevSar + af * (ep - prevSar)
          sar = Math.min(sar, lows[i - 1], i >= 2 ? lows[i - 2] : lows[i - 1])
          if (lows[i] < sar) { bull = false; sar = ep; ep = lows[i]; af = 0.02 }
          else { if (highs[i] > ep) { ep = highs[i]; af = Math.min(af + 0.02, maxAf) } }
        } else {
          sar = prevSar + af * (ep - prevSar)
          sar = Math.max(sar, highs[i - 1], i >= 2 ? highs[i - 2] : highs[i - 1])
          if (highs[i] > sar) { bull = true; sar = ep; ep = highs[i]; af = 0.02 }
          else { if (lows[i] < ep) { ep = lows[i]; af = Math.min(af + 0.02, maxAf) } }
        }
      }
      psarBull = bull
      lastSar = sar
      psarSignal = bull ? `多頭（SAR ${sar.toFixed(2)}）` : `空頭（SAR ${sar.toFixed(2)}）`
    }

    // True Strength Index (TSI) — double EMA of momentum
    let tsi = null, tsiSignal = '─'
    if (closes.length >= 35) {
      const momentum = closes.slice(1).map((v, i) => v - closes[i])
      const absMomentum = momentum.map(v => Math.abs(v))
      const ema25m = ema(momentum, 25)
      const ema25abs = ema(absMomentum, 25)
      const ema13m = ema(ema25m.filter(v => v != null), 13)
      const ema13abs = ema(ema25abs.filter(v => v != null), 13)
      const lastTsiNum = ema13m[ema13m.length - 1]
      const lastTsiDen = ema13abs[ema13abs.length - 1]
      if (lastTsiDen !== 0 && lastTsiDen != null && lastTsiNum != null) {
        tsi = 100 * (lastTsiNum / lastTsiDen)
        const prevTsiNum = ema13m[ema13m.length - 2]
        const prevTsiDen = ema13abs[ema13abs.length - 2]
        const prevTsi = (prevTsiNum != null && prevTsiDen !== 0 && prevTsiDen != null) ? 100 * (prevTsiNum / prevTsiDen) : null
        if (tsi > 25) tsiSignal = '強勢多頭動能'
        else if (tsi > 0 && prevTsi != null && tsi > prevTsi) tsiSignal = '多頭上行'
        else if (tsi < -25) tsiSignal = '強勢空頭動能'
        else if (tsi < 0 && prevTsi != null && tsi < prevTsi) tsiSignal = '空頭下行'
        else if (tsi > 0) tsiSignal = '偏多（中性）'
        else tsiSignal = '偏空（中性）'
      }
    }

    // Vortex Indicator (14) — VI+/VI-
    let viPlus = null, viMinus = null, vortexSignal = '─'
    if (candles.length >= 15) {
      const n = 14
      let sumVmPlus = 0, sumVmMinus = 0, sumTr = 0
      for (let i = candles.length - n; i < candles.length; i++) {
        const vm_plus = Math.abs(candles[i].high - candles[i - 1].low)
        const vm_minus = Math.abs(candles[i].low - candles[i - 1].high)
        const tr = Math.max(
          candles[i].high - candles[i].low,
          Math.abs(candles[i].high - candles[i - 1].close),
          Math.abs(candles[i].low - candles[i - 1].close)
        )
        sumVmPlus += vm_plus
        sumVmMinus += vm_minus
        sumTr += tr
      }
      if (sumTr > 0) {
        viPlus = sumVmPlus / sumTr
        viMinus = sumVmMinus / sumTr
        if (viPlus > viMinus && viPlus > 1.1) vortexSignal = '強多（VI+ 主導）'
        else if (viPlus > viMinus) vortexSignal = '偏多（VI+ > VI-）'
        else if (viMinus > viPlus && viMinus > 1.1) vortexSignal = '強空（VI- 主導）'
        else if (viMinus > viPlus) vortexSignal = '偏空（VI- > VI+）'
        else vortexSignal = '均勢（中立）'
      }
    }

    // Donchian Channel (20)
    let dcHigh = null, dcLow = null, dcMid = null
    if (candles.length >= 20) {
      const slice = candles.slice(-20)
      dcHigh = Math.max(...slice.map(c => c.high))
      dcLow  = Math.min(...slice.map(c => c.low))
      dcMid  = (dcHigh + dcLow) / 2
    }

    // CCI — Commodity Channel Index (20)
    let cci20 = null, cciSignal = '─'
    if (candles.length >= 20) {
      const tpArr = candles.map(c => (c.high + c.low + c.close) / 3)
      const slice20 = tpArr.slice(-20)
      const smaTP = slice20.reduce((a, b) => a + b, 0) / 20
      const meanDev = slice20.reduce((a, b) => a + Math.abs(b - smaTP), 0) / 20
      cci20 = meanDev === 0 ? 0 : (tpArr[tpArr.length - 1] - smaTP) / (0.015 * meanDev)
      if (cci20 > 200) cciSignal = '極度超買（看空）'
      else if (cci20 > 100) cciSignal = '超買（看空）'
      else if (cci20 < -200) cciSignal = '極度超賣（看多）'
      else if (cci20 < -100) cciSignal = '超賣（看多）'
      else if (cci20 > 50) cciSignal = '偏強（多頭動能）'
      else if (cci20 < -50) cciSignal = '偏弱（空頭動能）'
      else cciSignal = '震盪（中立）'
    }

    // CMF — Chaikin Money Flow (20)
    let cmf20 = null, cmfSignal = '─'
    if (candles.length >= 20) {
      const slice = candles.slice(-20)
      let sumMFV = 0, sumVol = 0
      for (const c of slice) {
        const hl = c.high - c.low
        const mfm = hl === 0 ? 0 : ((c.close - c.low) - (c.high - c.close)) / hl
        const vol = c.volume ?? 1
        sumMFV += mfm * vol
        sumVol += vol
      }
      cmf20 = sumVol === 0 ? 0 : sumMFV / sumVol
      if (cmf20 > 0.25) cmfSignal = '強勢買盤（資金流入）'
      else if (cmf20 > 0.1) cmfSignal = '買盤偏多（多頭）'
      else if (cmf20 < -0.25) cmfSignal = '強勢賣壓（資金流出）'
      else if (cmf20 < -0.1) cmfSignal = '賣壓偏重（空頭）'
      else cmfSignal = '資金中立（觀望）'
    }

    // Elder Ray — Bull/Bear Power using EMA(13)
    let bullPower = null, bearPower = null, elderSignal = '─'
    if (candles.length >= 13) {
      const ema13Arr = ema(closes, 13)
      const lastEma13 = ema13Arr[ema13Arr.length - 1]
      bullPower = highs[highs.length - 1] - lastEma13
      bearPower = lows[lows.length - 1] - lastEma13
      const bullTrend = ma20 != null && closes[closes.length - 1] > ma20
      if (bullTrend && bullPower > 0 && bearPower > 0) elderSignal = '強多（多頭加速）'
      else if (bullTrend && bearPower < 0 && bearPower > -atr * 0.5) elderSignal = '多頭（回調買點）'
      else if (!bullTrend && bearPower < 0 && bullPower < 0) elderSignal = '強空（空頭加速）'
      else if (!bullTrend && bullPower > 0 && bullPower < atr * 0.5) elderSignal = '空頭（反彈賣點）'
      else elderSignal = '混沌（觀望）'
    }

    // Bollinger Band Width (squeeze detection)
    let bbWidth = null, bbSqueezeSignal = '─'
    if (closes.length >= 20) {
      const recentBB = (() => {
        const slice = closes.slice(-20)
        const mean = slice.reduce((a, b) => a + b, 0) / 20
        const std = Math.sqrt(slice.reduce((a, b) => a + (b - mean) ** 2, 0) / 20)
        return { upper: mean + 2 * std, lower: mean - 2 * std, mid: mean, std }
      })()
      bbWidth = ((recentBB.upper - recentBB.lower) / recentBB.mid) * 100
      const lastClose = closes[closes.length - 1]
      if (bbWidth < 4) bbSqueezeSignal = '極度收縮（等待突破）'
      else if (bbWidth < 8) bbSqueezeSignal = '帶寬收窄（蓄勢中）'
      else if (lastClose > recentBB.upper) bbSqueezeSignal = '突破上軌（超強勢）'
      else if (lastClose < recentBB.lower) bbSqueezeSignal = '跌破下軌（超弱勢）'
      else bbSqueezeSignal = '帶寬正常'
    }

    return {
      trend,
      kdSignal,
      macdSignal,
      maStatus,
      lastK: lastK.toFixed(1),
      lastD: lastD.toFixed(1),
      lastMacd: lastMacd.toFixed(3),
      lastSignal: lastSignal.toFixed(3),
      ma5: ma5?.toFixed(2),
      ma20: ma20?.toFixed(2),
      ma60: ma60?.toFixed(2),
      ma120: ma120?.toFixed(2),
      ma240: ma240?.toFixed(2),
      lastRsi: lastRsi?.toFixed(1) ?? null,
      rsiSignal,
      candlePattern,
      atr: atr?.toFixed(2) ?? null,
      atrPct: atrPct?.toFixed(2) ?? null,
      volatility,
      lastMfi: lastMfi?.toFixed(1) ?? null,
      mfiSignal,
      obvTrend,
      stochRsiK: stochRsiK?.toFixed(1) ?? null,
      stochRsiD: stochRsiD?.toFixed(1) ?? null,
      stochRsiSignal,
      williamsR: williamsR?.toFixed(1) ?? null,
      wrSignal,
      bbWidth: bbWidth?.toFixed(1) ?? null,
      bbSqueezeSignal,
      psarBull,
      psarSignal,
      lastSar: lastSar?.toFixed(2) ?? null,
      rsiDivergence,
      adx: adx?.toFixed(1) ?? null,
      plusDI: plusDI?.toFixed(1) ?? null,
      minusDI: minusDI?.toFixed(1) ?? null,
      adxSignal,
      roc10: roc10?.toFixed(2) ?? null,
      roc21: roc21?.toFixed(2) ?? null,
      rocSignal,
      weeklyRsi: weeklyRsi?.toFixed(1) ?? null,
      monthlyRsi: monthlyRsi?.toFixed(1) ?? null,
      weeklyMacd,
      cci20: cci20?.toFixed(1) ?? null,
      cciSignal,
      cmf20: cmf20?.toFixed(3) ?? null,
      cmfSignal,
      bullPower: bullPower?.toFixed(2) ?? null,
      bearPower: bearPower?.toFixed(2) ?? null,
      elderSignal,
      tsi: tsi?.toFixed(2) ?? null,
      tsiSignal,
      viPlus: viPlus?.toFixed(3) ?? null,
      viMinus: viMinus?.toFixed(3) ?? null,
      vortexSignal,
      dcHigh: dcHigh?.toFixed(2) ?? null,
      dcLow: dcLow?.toFixed(2) ?? null,
      dcMid: dcMid?.toFixed(2) ?? null,
    }
  }, [candles])
}
