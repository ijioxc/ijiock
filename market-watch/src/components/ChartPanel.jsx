import { useEffect, useRef, useState } from 'react'
import { createChart, CandlestickSeries, HistogramSeries, LineSeries, createSeriesMarkers } from 'lightweight-charts'
import { fetchOHLC } from '../api/market'
import { useWatchlistStore } from '../store/watchlistStore'
import { useTechIndicators } from '../hooks/useTechIndicators'
import TechSignal from './TechSignal'

const RANGES = ['1mo', '3mo', '6mo', '1y']

function calcSMA(closes, times, period) {
  const result = []
  for (let i = period - 1; i < closes.length; i++) {
    const slice = closes.slice(i - period + 1, i + 1)
    result.push({ time: times[i], value: slice.reduce((a, b) => a + b, 0) / period })
  }
  return result
}

function calcLinReg(closes, times) {
  const n = closes.length
  if (n < 10) return []
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0
  for (let i = 0; i < n; i++) {
    sumX += i; sumY += closes[i]
    sumXY += i * closes[i]; sumX2 += i * i
  }
  const denom = n * sumX2 - sumX * sumX
  if (denom === 0) return []
  const slope = (n * sumXY - sumX * sumY) / denom
  const intercept = (sumY - slope * sumX) / n
  const extend = Math.min(20, Math.round(n * 0.1))
  const avgInterval = n > 1 ? (times[n - 1] - times[0]) / (n - 1) : 86400
  const result = []
  for (let i = 0; i < n + extend; i++) {
    const t = i < n ? times[i] : Math.round(times[n - 1] + (i - n + 1) * avgInterval)
    result.push({ time: t, value: intercept + slope * i })
  }
  return result
}

function calcBB(closes, times, period = 20, mult = 2) {
  const result = []
  for (let i = period - 1; i < closes.length; i++) {
    const slice = closes.slice(i - period + 1, i + 1)
    const mean = slice.reduce((a, b) => a + b, 0) / period
    const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period
    const std = Math.sqrt(variance)
    result.push({ time: times[i], upper: mean + mult * std, mid: mean, lower: mean - mult * std })
  }
  return result
}

function calcRsiSeries(closes, period = 14) {
  const result = []
  if (closes.length < period + 1) return result
  let gains = 0, losses = 0
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1]
    if (d >= 0) gains += d; else losses -= d
  }
  let avgGain = gains / period, avgLoss = losses / period
  const rs0 = avgLoss === 0 ? 100 : avgGain / avgLoss
  result.push({ idx: period, value: 100 - 100 / (1 + rs0) })
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1]
    avgGain = (avgGain * (period - 1) + (d > 0 ? d : 0)) / period
    avgLoss = (avgLoss * (period - 1) + (d < 0 ? -d : 0)) / period
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
    result.push({ idx: i, value: 100 - 100 / (1 + rs) })
  }
  return result
}

function RsiSubChart({ rsiSeries, width = 600, height = 60 }) {
  if (!rsiSeries || rsiSeries.length < 2) return null
  const n = rsiSeries.length
  const pts = rsiSeries.map((p, i) => {
    const x = (i / (n - 1)) * (width - 4) + 2
    const y = (1 - p.value / 100) * (height - 12) + 6
    return `${x},${y}`
  }).join(' ')
  const lastV = rsiSeries[n - 1].value
  const color = lastV >= 70 ? 'var(--dn)' : lastV <= 30 ? 'var(--up)' : 'var(--accent)'
  const y70 = (1 - 0.70) * (height - 12) + 6
  const y30 = (1 - 0.30) * (height - 12) + 6
  const y50 = (1 - 0.50) * (height - 12) + 6
  return (
    <div className="rsi-subchart">
      <div className="rsi-sub-label">RSI(14)</div>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="rsi-sub-svg">
        <rect x="0" y={y70} width={width} height={y30 - y70} fill="rgba(99,102,241,.06)" />
        <line x1="0" y1={y70} x2={width} y2={y70} stroke="rgba(239,83,80,.25)" strokeWidth="1" strokeDasharray="3,3" />
        <line x1="0" y1={y50} x2={width} y2={y50} stroke="rgba(255,255,255,.08)" strokeWidth="1" />
        <line x1="0" y1={y30} x2={width} y2={y30} stroke="rgba(38,166,154,.25)" strokeWidth="1" strokeDasharray="3,3" />
        <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <text x={width - 4} y={y50} textAnchor="end" fontSize="8" fill="rgba(255,255,255,.3)">50</text>
        <text x={width - 4} y={y70 - 1} textAnchor="end" fontSize="8" fill="rgba(239,83,80,.5)">70</text>
        <text x={width - 4} y={y30 + 8} textAnchor="end" fontSize="8" fill="rgba(38,166,154,.5)">30</text>
        <text x="4" y="12" fontSize="9" fontWeight="800" fill={color}>{lastV.toFixed(1)}</text>
      </svg>
    </div>
  )
}

function VolumeProfile({ candles, height = 200 }) {
  if (!candles || candles.length < 10) return null
  const closes = candles.map(c => c.close)
  const allHigh = Math.max(...candles.map(c => c.high))
  const allLow = Math.min(...candles.map(c => c.low))
  const range = allHigh - allLow || 1
  const BUCKETS = 20
  const bucketSize = range / BUCKETS
  const bucketVols = new Array(BUCKETS).fill(0)
  candles.forEach(c => {
    const idx = Math.min(Math.floor((c.close - allLow) / bucketSize), BUCKETS - 1)
    bucketVols[idx] += (c.volume ?? 1)
  })
  const maxVol = Math.max(...bucketVols, 1)
  const lastClose = closes[closes.length - 1]
  const pocIdx = bucketVols.indexOf(maxVol)
  return (
    <div className="vol-profile">
      <div className="vol-profile-title">Volume Profile</div>
      <svg width="52" height={height} viewBox={`0 0 52 ${height}`}>
        {bucketVols.map((vol, i) => {
          const barW = (vol / maxVol) * 48
          const y = height - ((i + 1) / BUCKETS) * height
          const bh = height / BUCKETS - 1
          const price = allLow + (i + 0.5) * bucketSize
          const isAbove = price > lastClose
          const isPoc = i === pocIdx
          const color = isPoc ? 'rgba(245,158,11,.85)' : isAbove ? 'rgba(239,83,80,.45)' : 'rgba(38,166,154,.45)'
          return (
            <rect
              key={i}
              x="2" y={y} width={Math.max(barW, 1)} height={Math.max(bh, 1)}
              fill={color} rx="1"
            />
          )
        })}
        <line x1="2" y1={height - ((lastClose - allLow) / range) * height} x2="50" y2={height - ((lastClose - allLow) / range) * height} stroke="rgba(245,158,11,.6)" strokeWidth="1" strokeDasharray="2,2" />
      </svg>
    </div>
  )
}

function calcMacdSeries(closes) {
  const k12 = 2 / 13, k26 = 2 / 27, k9 = 2 / 10
  const result = []
  if (closes.length < 35) return result
  let ema12 = closes[0], ema26 = closes[0]
  let macdArr = []
  for (let i = 1; i < closes.length; i++) {
    ema12 = closes[i] * k12 + ema12 * (1 - k12)
    ema26 = closes[i] * k26 + ema26 * (1 - k26)
    if (i >= 25) macdArr.push({ idx: i, macd: ema12 - ema26 })
  }
  if (macdArr.length === 0) return result
  let signal = macdArr[0].macd
  for (const p of macdArr) {
    signal = p.macd * k9 + signal * (1 - k9)
    result.push({ idx: p.idx, macd: p.macd, signal, hist: p.macd - signal })
  }
  return result
}

function ReturnDistChart({ candles, width = 600, height = 60 }) {
  if (!candles || candles.length < 20) return null
  const closes = candles.map(c => c.close)
  const returns = closes.slice(1).map((v, i) => ((v - closes[i]) / closes[i]) * 100)
  const BUCKETS = 20
  const minR = Math.min(...returns), maxR = Math.max(...returns)
  const range = maxR - minR || 1
  const bucketSize = range / BUCKETS
  const counts = new Array(BUCKETS).fill(0)
  returns.forEach(r => {
    const idx = Math.min(Math.floor((r - minR) / bucketSize), BUCKETS - 1)
    counts[idx]++
  })
  const maxCount = Math.max(...counts, 1)
  const zeroIdx = Math.max(0, Math.min(BUCKETS - 1, Math.floor((0 - minR) / bucketSize)))
  const bw = (width - 8) / BUCKETS
  return (
    <div className="rsi-subchart">
      <div className="rsi-sub-label">報酬分布 Return Distribution</div>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="rsi-sub-svg">
        <line x1={(zeroIdx / BUCKETS) * (width - 8) + 4} y1="0" x2={(zeroIdx / BUCKETS) * (width - 8) + 4} y2={height} stroke="rgba(255,255,255,.15)" strokeWidth="1" />
        {counts.map((cnt, i) => {
          const barH = (cnt / maxCount) * (height - 10)
          const x = (i / BUCKETS) * (width - 8) + 4
          const isPos = (minR + (i + 0.5) * bucketSize) >= 0
          return (
            <rect key={i} x={x} y={height - barH - 5} width={Math.max(bw - 1, 1)} height={barH}
              fill={isPos ? 'rgba(38,166,154,.65)' : 'rgba(239,83,80,.65)'} rx="1" />
          )
        })}
        <text x="4" y={height - 1} fontSize="8" fill="rgba(255,255,255,.3)">{minR.toFixed(1)}%</text>
        <text x={width - 4} y={height - 1} fontSize="8" textAnchor="end" fill="rgba(255,255,255,.3)">{maxR.toFixed(1)}%</text>
        <text x={width / 2} y="12" fontSize="8" textAnchor="middle" fill="rgba(255,255,255,.4)">n={returns.length}</text>
      </svg>
    </div>
  )
}

function MacdSubChart({ macdSeries, width = 600, height = 60 }) {
  if (!macdSeries || macdSeries.length < 2) return null
  const n = macdSeries.length
  const histMax = Math.max(...macdSeries.map(p => Math.abs(p.hist)), 0.001)
  const macdExtreme = Math.max(...macdSeries.map(p => Math.abs(p.macd)), Math.abs(macdSeries[n - 1].signal), 0.001)
  const scaleY = v => (1 - (v + macdExtreme) / (2 * macdExtreme)) * (height - 14) + 7
  const zero = scaleY(0)

  const macdPts = macdSeries.map((p, i) => `${(i / (n - 1)) * (width - 4) + 2},${scaleY(p.macd)}`).join(' ')
  const sigPts  = macdSeries.map((p, i) => `${(i / (n - 1)) * (width - 4) + 2},${scaleY(p.signal)}`).join(' ')

  const bw = Math.max(1, (width - 4) / n - 1)
  const lastMacd = macdSeries[n - 1]

  return (
    <div className="rsi-subchart">
      <div className="rsi-sub-label">MACD(12,26,9)</div>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="rsi-sub-svg">
        <line x1="0" y1={zero} x2={width} y2={zero} stroke="rgba(255,255,255,.1)" strokeWidth="1" />
        {macdSeries.map((p, i) => {
          const x = (i / (n - 1)) * (width - 4) + 2
          const isPos = p.hist >= 0
          const barH = Math.abs((p.hist / histMax) * (height / 3))
          return (
            <rect
              key={i}
              x={x - bw / 2} y={isPos ? zero - barH : zero}
              width={bw} height={barH}
              fill={isPos ? 'rgba(38,166,154,.55)' : 'rgba(239,83,80,.55)'}
            />
          )
        })}
        <polyline points={macdPts} fill="none" stroke="rgba(99,102,241,.85)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={sigPts}  fill="none" stroke="rgba(245,158,11,.75)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
        <text x="4" y="12" fontSize="9" fontWeight="800"
          fill={lastMacd.macd > lastMacd.signal ? 'var(--up)' : 'var(--dn)'}>
          {lastMacd.macd.toFixed(3)}
        </text>
        <text x="4" y="22" fontSize="8" fill="rgba(245,158,11,.8)">S:{lastMacd.signal.toFixed(3)}</text>
      </svg>
    </div>
  )
}

function calcObvSeries(candles) {
  if (!candles || candles.length < 2) return []
  const result = []
  let obv = 0
  for (let i = 1; i < candles.length; i++) {
    const d = candles[i].close - candles[i - 1].close
    if (d > 0) obv += (candles[i].volume ?? 0)
    else if (d < 0) obv -= (candles[i].volume ?? 0)
    result.push({ idx: i, value: obv })
  }
  return result
}

function ObvSubChart({ obvSeries, width = 600, height = 50 }) {
  if (!obvSeries || obvSeries.length < 2) return null
  const n = obvSeries.length
  const values = obvSeries.map(p => p.value)
  const minV = Math.min(...values), maxV = Math.max(...values)
  const rangeV = maxV - minV || 1
  const scaleY = v => (1 - (v - minV) / rangeV) * (height - 10) + 5
  const pts = obvSeries.map((p, i) => `${(i / (n - 1)) * (width - 4) + 2},${scaleY(p.value)}`).join(' ')
  const lastV = values[n - 1]
  const firstV = values[0]
  const color = lastV >= firstV ? 'var(--up)' : 'var(--dn)'
  const zeroY = scaleY(0)
  return (
    <div className="rsi-subchart">
      <div className="rsi-sub-label">OBV</div>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="rsi-sub-svg">
        {zeroY > 5 && zeroY < height - 5 && (
          <line x1="0" y1={zeroY} x2={width} y2={zeroY} stroke="rgba(255,255,255,.08)" strokeWidth="1" />
        )}
        <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <text x="4" y="12" fontSize="9" fontWeight="800" fill={color}>
          {lastV >= 0 ? '+' : ''}{(lastV / 1e6).toFixed(1)}M
        </text>
      </svg>
    </div>
  )
}

function chartColors(dark) {
  return dark
    ? { text: '#9A9090', grid: 'rgba(255,255,255,.05)' }
    : { text: '#5F5F5F', grid: 'rgba(0,0,0,.06)' }
}

export default function ChartPanel({ darkMode = false }) {
  const selected = useWatchlistStore(s => s.selected)
  const symbols = useWatchlistStore(s => s.symbols)
  const info = symbols.find(s => s.symbol === selected)
  const chartRef = useRef(null)
  const containerRef = useRef(null)
  const seriesRef = useRef(null)
  const volSeriesRef = useRef(null)
  const bbUpperRef = useRef(null)
  const bbMidRef = useRef(null)
  const bbLowerRef = useRef(null)
  const ma5Ref = useRef(null)
  const ma20Ref = useRef(null)
  const ma60Ref = useRef(null)
  const ma120Ref = useRef(null)
  const ma240Ref = useRef(null)
  const fibLinesRef = useRef([])
  const kcUpperRef = useRef(null)
  const kcLowerRef = useRef(null)
  const compareSeriesRef = useRef(null)
  const vwapSeriesRef = useRef(null)
  const pivotLinesRef = useRef([])
  const drawnLinesRef = useRef([])
  const linRegRef = useRef(null)
  const ichimokuRefs = useRef({})  // tenkan, kijun, spanA, spanB, chikou
  const [showBB, setShowBB] = useState(true)
  const [showLinReg, setShowLinReg] = useState(false)
  const [showVwap, setShowVwap] = useState(true)
  const [showPivots, setShowPivots] = useState(false)
  const [drawMode, setDrawMode] = useState(false)
  const [drawnCount, setDrawnCount] = useState(0)
  const [showMA, setShowMA] = useState(true)
  const [showFib, setShowFib] = useState(false)
  const [showKC, setShowKC] = useState(false)
  const [showIchimoku, setShowIchimoku] = useState(false)
  const [showRetDist, setShowRetDist] = useState(false)
  const [showRsiSub, setShowRsiSub] = useState(false)
  const [showMacdSub, setShowMacdSub] = useState(false)
  const [showObvSub, setShowObvSub] = useState(false)
  const [showVolProfile, setShowVolProfile] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [compareMode, setCompareMode] = useState(false)
  const [compareInput, setCompareInput] = useState('')
  const [compareSymbol, setCompareSymbol] = useState(null)
  const [compareCandles, setCompareCandles] = useState([])
  const alerts = useWatchlistStore(s => s.alerts)
  const [range, setRange] = useState('3mo')
  const [candles, setCandles] = useState([])
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState(null)
  const [retryKey, setRetryKey] = useState(0)

  const quotes = useWatchlistStore(s => s.quotes)
  const tech = useTechIndicators(candles)

  useEffect(() => {
    if (!containerRef.current) return
    const c = chartColors(darkMode)
    const chart = createChart(containerRef.current, {
      layout: { background: { color: 'transparent' }, textColor: c.text, fontSize: 11 },
      grid: { vertLines: { color: c.grid }, horzLines: { color: c.grid } },
      crosshair: { mode: 1 },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: true },
      handleScroll: true,
      handleScale: true,
    })
    chartRef.current = chart

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#26A69A', downColor: '#EF5350',
      borderUpColor: '#26A69A', borderDownColor: '#EF5350',
      wickUpColor: '#26A69A', wickDownColor: '#EF5350',
      priceScaleId: 'right',
    })
    seriesRef.current = series

    const volSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'vol',
    })
    chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } })
    volSeriesRef.current = volSeries

    const lineOpts = { crosshairMarkerVisible: false, lastValueVisible: false, priceLineVisible: false }
    bbUpperRef.current = chart.addSeries(LineSeries, { ...lineOpts, color: 'rgba(249,115,22,.55)', lineWidth: 1, lineStyle: 1 })
    bbMidRef.current  = chart.addSeries(LineSeries, { ...lineOpts, color: 'rgba(99,102,241,.5)',  lineWidth: 1.5 })
    bbLowerRef.current = chart.addSeries(LineSeries, { ...lineOpts, color: 'rgba(6,182,212,.55)', lineWidth: 1, lineStyle: 1 })
    ma5Ref.current   = chart.addSeries(LineSeries, { ...lineOpts, color: 'rgba(249,115,22,.85)',  lineWidth: 1.5 })
    ma20Ref.current  = chart.addSeries(LineSeries, { ...lineOpts, color: 'rgba(99,102,241,.85)',  lineWidth: 1.5 })
    ma60Ref.current  = chart.addSeries(LineSeries, { ...lineOpts, color: 'rgba(239,83,80,.75)',   lineWidth: 1.5 })
    ma120Ref.current = chart.addSeries(LineSeries, { ...lineOpts, color: 'rgba(139,92,246,.65)',  lineWidth: 1, lineStyle: 2 })
    ma240Ref.current = chart.addSeries(LineSeries, { ...lineOpts, color: 'rgba(236,72,153,.60)',  lineWidth: 1, lineStyle: 2 })
    compareSeriesRef.current = chart.addSeries(LineSeries, {
      ...lineOpts, color: 'rgba(245,158,11,.9)', lineWidth: 2,
      priceScaleId: 'cmp', visible: false,
    })
    chart.priceScale('cmp').applyOptions({ visible: false })
    vwapSeriesRef.current = chart.addSeries(LineSeries, {
      ...lineOpts, color: 'rgba(139,92,246,.75)', lineWidth: 1.5, lineStyle: 3,
    })
    linRegRef.current = chart.addSeries(LineSeries, {
      ...lineOpts, color: 'rgba(245,158,11,.65)', lineWidth: 1.5, lineStyle: 3, visible: false,
    })

    // Keltner Channel
    kcUpperRef.current = chart.addSeries(LineSeries, { ...lineOpts, color: 'rgba(6,182,212,.5)', lineWidth: 1, lineStyle: 2, visible: false })
    kcLowerRef.current = chart.addSeries(LineSeries, { ...lineOpts, color: 'rgba(6,182,212,.5)', lineWidth: 1, lineStyle: 2, visible: false })

    // Ichimoku Cloud lines
    ichimokuRefs.current.tenkan = chart.addSeries(LineSeries, { ...lineOpts, color: 'rgba(245,158,11,.8)', lineWidth: 1.5, visible: false })
    ichimokuRefs.current.kijun  = chart.addSeries(LineSeries, { ...lineOpts, color: 'rgba(99,102,241,.8)', lineWidth: 1.5, visible: false })
    ichimokuRefs.current.spanA  = chart.addSeries(LineSeries, { ...lineOpts, color: 'rgba(38,166,154,.6)', lineWidth: 1, lineStyle: 2, visible: false })
    ichimokuRefs.current.spanB  = chart.addSeries(LineSeries, { ...lineOpts, color: 'rgba(239,83,80,.6)',  lineWidth: 1, lineStyle: 2, visible: false })
    ichimokuRefs.current.chikou = chart.addSeries(LineSeries, { ...lineOpts, color: 'rgba(139,92,246,.65)', lineWidth: 1, lineStyle: 3, visible: false })

    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        })
      }
    })
    ro.observe(containerRef.current)
    return () => { ro.disconnect(); chart.remove() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Update chart theme on dark mode change
  useEffect(() => {
    if (!chartRef.current) return
    const c = chartColors(darkMode)
    chartRef.current.applyOptions({
      layout: { textColor: c.text },
      grid: { vertLines: { color: c.grid }, horzLines: { color: c.grid } },
    })
  }, [darkMode])

  useEffect(() => {
    if (!selected) return
    let cancelled = false
    setLoading(true)
    setFetchError(null)
    fetchOHLC(selected, range)
      .then(data => {
        if (cancelled) return
        const sorted = data.sort((a, b) => a.time - b.time)
        setCandles(sorted)
        if (seriesRef.current) {
          seriesRef.current.setData(sorted)
          chartRef.current?.timeScale().fitContent()
        }
        if (volSeriesRef.current) {
          volSeriesRef.current.setData(sorted.map(c => ({
            time: c.time,
            value: c.volume ?? 0,
            color: c.close >= c.open ? 'rgba(38,166,154,.6)' : 'rgba(239,83,80,.6)',
          })))
        }
        const closes = sorted.map(c => c.close)
        const times = sorted.map(c => c.time)
        if (sorted.length >= 20) {
          const bb = calcBB(closes, times)
          bbUpperRef.current?.setData(bb.map(d => ({ time: d.time, value: d.upper })))
          bbMidRef.current?.setData(bb.map(d => ({ time: d.time, value: d.mid })))
          bbLowerRef.current?.setData(bb.map(d => ({ time: d.time, value: d.lower })))
        }
        if (sorted.length >= 5)   ma5Ref.current?.setData(calcSMA(closes, times, 5))
        if (sorted.length >= 20)  ma20Ref.current?.setData(calcSMA(closes, times, 20))
        if (sorted.length >= 60)  ma60Ref.current?.setData(calcSMA(closes, times, 60))
        if (sorted.length >= 120) ma120Ref.current?.setData(calcSMA(closes, times, 120))
        if (sorted.length >= 240) ma240Ref.current?.setData(calcSMA(closes, times, 240))

        // Keltner Channel: EMA(20) ± 1.5 × ATR(10)
        if (sorted.length >= 20) {
          const kcPeriod = 20, atrPeriod = 10, mult = 1.5
          const k = 2 / (kcPeriod + 1)
          const ka = 2 / (atrPeriod + 1)
          let ema = closes[0], atr = 0
          const kcUp = [], kcLo = []
          for (let i = 1; i < sorted.length; i++) {
            const tr = Math.max(
              sorted[i].high - sorted[i].low,
              Math.abs(sorted[i].high - sorted[i - 1].close),
              Math.abs(sorted[i].low  - sorted[i - 1].close)
            )
            atr = i === 1 ? tr : atr * (1 - ka) + tr * ka
            ema = closes[i] * k + ema * (1 - k)
            if (i >= kcPeriod - 1) {
              kcUp.push({ time: times[i], value: ema + mult * atr })
              kcLo.push({ time: times[i], value: ema - mult * atr })
            }
          }
          kcUpperRef.current?.setData(kcUp)
          kcLowerRef.current?.setData(kcLo)
        }

        // VWAP (cumulative)
        if (sorted.length >= 2) {
          let cumPV = 0, cumV = 0
          const vwapData = sorted.map(c => {
            const typical = (c.high + c.low + c.close) / 3
            const vol = c.volume ?? 1
            cumPV += typical * vol
            cumV += vol
            return { time: c.time, value: cumV > 0 ? cumPV / cumV : typical }
          })
          vwapSeriesRef.current?.setData(vwapData)
        }

        // Linear regression trendline
        if (sorted.length >= 10) {
          linRegRef.current?.setData(calcLinReg(closes, times))
        }

        // Ichimoku Cloud
        if (sorted.length >= 52) {
          const midpoint = (arr, i, p) => {
            const slice = arr.slice(Math.max(0, i - p + 1), i + 1)
            return (Math.max(...slice.map(c => c.high)) + Math.min(...slice.map(c => c.low))) / 2
          }
          const avgInterval = sorted.length > 1 ? (times[sorted.length - 1] - times[0]) / (sorted.length - 1) : 86400
          const tenkanData = [], kijunData = [], spanAData = [], spanBData = [], chikouData = []
          for (let i = 8; i < sorted.length; i++) {
            const t = midpoint(sorted, i, 9)
            const k = midpoint(sorted, i, 26)
            tenkanData.push({ time: times[i], value: t })
            kijunData.push({ time: times[i], value: k })
            const futureTime = Math.round(times[i] + 26 * avgInterval)
            spanAData.push({ time: futureTime, value: (t + k) / 2 })
          }
          for (let i = 51; i < sorted.length; i++) {
            const b = midpoint(sorted, i, 52)
            spanBData.push({ time: Math.round(times[i] + 26 * avgInterval), value: b })
          }
          for (let i = 0; i < sorted.length - 26; i++) {
            chikouData.push({ time: times[i], value: closes[i + 26] })
          }
          ichimokuRefs.current.tenkan?.setData(tenkanData)
          ichimokuRefs.current.kijun?.setData(kijunData)
          ichimokuRefs.current.spanA?.setData(spanAData)
          ichimokuRefs.current.spanB?.setData(spanBData)
          ichimokuRefs.current.chikou?.setData(chikouData)
        }

        // Combined chart markers: PSAR reversals + Volume spikes
        const allMarkers = []

        if (sorted.length >= 5) {
          let bull = true, af = 0.02, maxAf = 0.2
          let ep = sorted[0].high, sar = sorted[0].low
          let prevBull = true
          for (let i = 1; i < sorted.length; i++) {
            const prevSar = sar
            if (bull) {
              sar = prevSar + af * (ep - prevSar)
              sar = Math.min(sar, sorted[i - 1].low, i >= 2 ? sorted[i - 2].low : sorted[i - 1].low)
              if (sorted[i].low < sar) {
                bull = false; sar = ep; ep = sorted[i].low; af = 0.02
                if (prevBull) allMarkers.push({ time: sorted[i].time, position: 'aboveBar', color: 'rgba(239,83,80,.85)', shape: 'arrowDown', text: 'SAR', size: 1 })
              } else { if (sorted[i].high > ep) { ep = sorted[i].high; af = Math.min(af + 0.02, maxAf) } }
            } else {
              sar = prevSar + af * (ep - prevSar)
              sar = Math.max(sar, sorted[i - 1].high, i >= 2 ? sorted[i - 2].high : sorted[i - 1].high)
              if (sorted[i].high > sar) {
                bull = true; sar = ep; ep = sorted[i].high; af = 0.02
                if (!prevBull) allMarkers.push({ time: sorted[i].time, position: 'belowBar', color: 'rgba(38,166,154,.85)', shape: 'arrowUp', text: 'SAR', size: 1 })
              } else { if (sorted[i].low < ep) { ep = sorted[i].low; af = Math.min(af + 0.02, maxAf) } }
            }
            prevBull = bull
          }
        }

        if (sorted.length >= 20) {
          const vols = sorted.map(c => c.volume ?? 0)
          for (let i = 20; i < sorted.length; i++) {
            const avg20 = vols.slice(i - 20, i).reduce((a, b) => a + b, 0) / 20
            if (vols[i] > avg20 * 2.2) {
              allMarkers.push({ time: sorted[i].time, position: 'belowBar', color: 'rgba(99,102,241,.8)', shape: 'circle', text: 'V', size: 1 })
            }
          }
        }

        if (seriesRef.current && allMarkers.length > 0) {
          createSeriesMarkers(seriesRef.current, allMarkers.sort((a, b) => a.time - b.time))
        }
      })
      .catch(e => { if (!cancelled) setFetchError(e.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [selected, range, retryKey])

  // Fullscreen Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setFullscreen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Comparison mode: fetch compare symbol and render normalized % return
  useEffect(() => {
    if (!compareSeriesRef.current) return
    if (!compareMode || !compareSymbol) {
      compareSeriesRef.current.applyOptions({ visible: false })
      compareSeriesRef.current.setData([])
      setCompareCandles([])
      return
    }
    fetchOHLC(compareSymbol, range)
      .then(data => {
        const sorted = data.sort((a, b) => a.time - b.time)
        setCompareCandles(sorted)
        if (sorted.length < 2) return
        const base = sorted[0].close
        const normalized = sorted.map(c => ({
          time: c.time,
          value: ((c.close - base) / base) * 100,
        }))
        compareSeriesRef.current?.setData(normalized)
        compareSeriesRef.current?.applyOptions({ visible: true })
        chartRef.current?.priceScale('cmp').applyOptions({ visible: true, scaleMargins: { top: 0.1, bottom: 0.3 } })
      })
      .catch(() => {})
  }, [compareMode, compareSymbol, range])

  useEffect(() => {
    const show = showBB ? { visible: true } : { visible: false }
    bbUpperRef.current?.applyOptions(show)
    bbMidRef.current?.applyOptions(show)
    bbLowerRef.current?.applyOptions(show)
  }, [showBB])

  useEffect(() => {
    const show = showMA ? { visible: true } : { visible: false }
    ma5Ref.current?.applyOptions(show)
    ma20Ref.current?.applyOptions(show)
    ma60Ref.current?.applyOptions(show)
    ma120Ref.current?.applyOptions(show)
    ma240Ref.current?.applyOptions(show)
  }, [showMA])

  useEffect(() => {
    vwapSeriesRef.current?.applyOptions({ visible: showVwap })
  }, [showVwap])

  useEffect(() => {
    linRegRef.current?.applyOptions({ visible: showLinReg })
  }, [showLinReg])

  useEffect(() => {
    const v = { visible: showIchimoku }
    Object.values(ichimokuRefs.current).forEach(s => s?.applyOptions(v))
  }, [showIchimoku])

  useEffect(() => {
    kcUpperRef.current?.applyOptions({ visible: showKC })
    kcLowerRef.current?.applyOptions({ visible: showKC })
  }, [showKC])

  // Drawing mode: click to add horizontal price lines
  useEffect(() => {
    if (!chartRef.current || !seriesRef.current) return
    const handler = ({ point }) => {
      if (!drawMode || !point) return
      const price = seriesRef.current.coordinateToPrice(point.y)
      if (price == null) return
      const colors = ['rgba(245,158,11,.8)','rgba(139,92,246,.8)','rgba(6,182,212,.8)','rgba(236,72,153,.8)']
      const color = colors[drawnLinesRef.current.length % colors.length]
      const line = seriesRef.current.createPriceLine({
        price, color, lineWidth: 1.5, lineStyle: 0,
        axisLabelVisible: true, title: `✏ ${price.toFixed(2)}`,
      })
      drawnLinesRef.current.push(line)
      setDrawnCount(c => c + 1)
    }
    chartRef.current.subscribeClick(handler)
    return () => { try { chartRef.current?.unsubscribeClick(handler) } catch {} }
  }, [drawMode])

  function clearDrawnLines() {
    drawnLinesRef.current.forEach(l => { try { seriesRef.current?.removePriceLine(l) } catch {} })
    drawnLinesRef.current = []
    setDrawnCount(0)
  }

  // Pivot points from last completed candle
  useEffect(() => {
    pivotLinesRef.current.forEach(l => { try { seriesRef.current?.removePriceLine(l) } catch {} })
    pivotLinesRef.current = []
    if (!showPivots || !seriesRef.current || candles.length < 2) return
    const prev = candles[candles.length - 2]
    const { high: H, low: L, close: C } = prev
    const PP = (H + L + C) / 3
    const R1 = 2 * PP - L;  const R2 = PP + (H - L)
    const S1 = 2 * PP - H;  const S2 = PP - (H - L)
    const PIVOT_DEFS = [
      { price: R2, label: 'R2', color: 'rgba(239,83,80,.7)' },
      { price: R1, label: 'R1', color: 'rgba(249,115,22,.7)' },
      { price: PP, label: 'PP', color: 'rgba(99,102,241,.8)' },
      { price: S1, label: 'S1', color: 'rgba(38,166,154,.7)' },
      { price: S2, label: 'S2', color: 'rgba(6,182,212,.7)' },
    ]
    PIVOT_DEFS.forEach(({ price, label, color }) => {
      const line = seriesRef.current.createPriceLine({
        price, color, lineWidth: 1, lineStyle: 2,
        axisLabelVisible: true, title: label,
      })
      pivotLinesRef.current.push(line)
    })
  }, [showPivots, candles, selected])

  // Fibonacci retracement lines
  const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]
  const FIB_COLORS = ['rgba(239,83,80,.6)','rgba(249,115,22,.5)','rgba(245,158,11,.6)','rgba(99,102,241,.6)','rgba(38,166,154,.6)','rgba(6,182,212,.5)','rgba(38,166,154,.6)']
  useEffect(() => {
    fibLinesRef.current.forEach(l => { try { seriesRef.current?.removePriceLine(l) } catch {} })
    fibLinesRef.current = []
    if (!showFib || !seriesRef.current || candles.length < 2) return
    const highs = candles.map(c => c.high)
    const lows = candles.map(c => c.low)
    const swingHigh = Math.max(...highs)
    const swingLow = Math.min(...lows)
    const range = swingHigh - swingLow
    FIB_LEVELS.forEach((level, i) => {
      const price = swingHigh - level * range
      const line = seriesRef.current.createPriceLine({
        price, color: FIB_COLORS[i], lineWidth: 1, lineStyle: 2,
        axisLabelVisible: true, title: `Fib ${(level * 100).toFixed(1)}%`,
      })
      fibLinesRef.current.push(line)
    })
  }, [showFib, candles, selected])

  // Alert price lines
  useEffect(() => {
    if (!seriesRef.current || !selected) return
    const alert = alerts[selected]
    const lines = []
    if (alert?.target) lines.push(seriesRef.current.createPriceLine({
      price: parseFloat(alert.target), color: 'var(--up)', lineWidth: 1,
      lineStyle: 2, axisLabelVisible: true, title: '目標',
    }))
    if (alert?.stop) lines.push(seriesRef.current.createPriceLine({
      price: parseFloat(alert.stop), color: 'var(--dn)', lineWidth: 1,
      lineStyle: 2, axisLabelVisible: true, title: '停損',
    }))
    return () => { lines.forEach(l => { try { seriesRef.current?.removePriceLine(l) } catch {} }) }
  }, [selected, alerts])

  const q = quotes[selected]
  const up = q && q.change >= 0

  // 52-week (1yr) high/low from candles
  const yearCandles = candles.slice(-252)
  const yearHigh = yearCandles.length > 0 ? Math.max(...yearCandles.map(c => c.high)) : null
  const yearLow = yearCandles.length > 0 ? Math.min(...yearCandles.map(c => c.low)) : null
  const fromHigh = yearHigh && q?.price ? (((q.price - yearHigh) / yearHigh) * 100).toFixed(1) : null
  const fromLow = yearLow && q?.price ? (((q.price - yearLow) / yearLow) * 100).toFixed(1) : null

  // Statistical metrics from candle data
  const statMetrics = (() => {
    if (candles.length < 10) return null
    const closes = candles.map(c => c.close)
    const dailyReturns = closes.slice(1).map((v, i) => (v - closes[i]) / closes[i])
    const n = dailyReturns.length
    const mean = dailyReturns.reduce((a, b) => a + b, 0) / n
    const variance = dailyReturns.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(n - 1, 1)
    const std = Math.sqrt(variance)
    const annualVol = std * Math.sqrt(252) * 100
    const sharpe = std > 0 ? ((mean * 252) / (std * Math.sqrt(252))).toFixed(2) : '–'
    let peak = closes[0], maxDD = 0
    for (const v of closes) {
      if (v > peak) peak = v
      const dd = (v - peak) / peak
      if (dd < maxDD) maxDD = dd
    }
    const positiveDays = dailyReturns.filter(r => r > 0).length
    const winRate = ((positiveDays / n) * 100).toFixed(0)
    return {
      annualVol: annualVol.toFixed(1),
      sharpe,
      maxDD: (maxDD * 100).toFixed(1),
      winRate,
    }
  })()

  // Multi-period performance from candle data
  function periodReturn(nDays) {
    if (candles.length < nDays + 1) return null
    const old = candles[candles.length - nDays - 1]?.close
    const cur = candles[candles.length - 1]?.close
    if (!old || !cur) return null
    return ((cur - old) / old) * 100
  }
  const perf5d  = periodReturn(5)
  const perf1m  = periodReturn(21)
  const perf3m  = periodReturn(63)
  const perf1y  = periodReturn(252)

  // Last 30 daily returns for heatmap
  const returnCalendar = candles.slice(-30).map(c => {
    const pct = c.open ? ((c.close - c.open) / c.open) * 100 : 0
    const label = new Date(c.time * 1000).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })
    return { pct, label }
  })

  function copyStats() {
    if (!q) return
    const t = `${info?.name ?? selected} (${selected})\n現價: ${q.price?.toFixed(2)} ${up ? '▲' : '▼'} ${q.changePct?.toFixed(2)}%\nMA5: ${tech?.ma5 ?? '-'}  MA20: ${tech?.ma20 ?? '-'}  MA60: ${tech?.ma60 ?? '-'}\n布林上: ${candles.slice(-1)[0]?.high?.toFixed(2) ?? '-'}\n綜合訊號: ${tech ? (tech.trend) : '-'}`
    navigator.clipboard?.writeText(t).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) })
  }

  return (
    <div className={`chart-panel ${fullscreen ? 'fullscreen-panel' : ''}`}>
      <div className="chart-header">
        <div className="chart-name-block">
          <span className="chart-title">{info?.name ?? selected}</span>
          <span className="chart-symbol mono"> {selected}</span>
          {q && (
            <span className={`chart-price-pill ${up ? 'up-bg up' : 'dn-bg dn'}`}>
              {up ? '▲' : '▼'} {q.price?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              <span className="chart-pct"> {up ? '+' : ''}{q.changePct?.toFixed(2)}%</span>
            </span>
          )}
        </div>
        <div className="chart-header-right">
          <button
            className={`bb-toggle ${showLinReg ? 'on' : ''}`}
            onClick={() => setShowLinReg(v => !v)}
            title="線性迴歸趨勢線 (含預測延伸)"
          >LR</button>
          <button
            className={`bb-toggle ${showIchimoku ? 'on' : ''}`}
            onClick={() => setShowIchimoku(v => !v)}
            title="一目均衡表 Ichimoku Cloud"
          >ICH</button>
          <button
            className={`bb-toggle ${showKC ? 'on' : ''}`}
            onClick={() => setShowKC(v => !v)}
            title="Keltner Channel EMA(20) ± 1.5×ATR(10)"
          >KC</button>
          <button
            className={`bb-toggle ${showVwap ? 'on' : ''}`}
            onClick={() => setShowVwap(v => !v)}
            title="VWAP 成交量加權均價"
          >VWAP</button>
          <button
            className={`bb-toggle ${showMA ? 'on' : ''}`}
            onClick={() => setShowMA(v => !v)}
            title="切換均線 MA5/20/60"
          >MA</button>
          <button
            className={`bb-toggle ${showBB ? 'on' : ''}`}
            onClick={() => setShowBB(v => !v)}
            title="切換布林通道"
          >BB</button>
          <button
            className={`bb-toggle ${showFib ? 'on' : ''}`}
            onClick={() => setShowFib(v => !v)}
            title="切換費波那契回調"
          >Fib</button>
          <button
            className={`bb-toggle ${showPivots ? 'on' : ''}`}
            onClick={() => setShowPivots(v => !v)}
            title="樞紐點 PP/R1/R2/S1/S2"
          >PP</button>
          <button
            className={`bb-toggle ${drawMode ? 'on draw-active' : ''}`}
            onClick={() => setDrawMode(v => !v)}
            title={drawMode ? '點擊圖表畫水平線 (再按關閉)' : '開啟畫線模式'}
            style={{ fontFamily: 'inherit' }}
          >✏{drawnCount > 0 ? ` ${drawnCount}` : ''}</button>
          {drawnCount > 0 && (
            <button
              className="bb-toggle"
              onClick={clearDrawnLines}
              title="清除全部畫線"
              style={{ color: 'var(--dn)' }}
            >⊘</button>
          )}
          <button
            className="bb-toggle"
            onClick={copyStats}
            title="複製報告"
            style={{ fontSize: copied ? 11 : 12 }}
          >{copied ? '✓' : '⎘'}</button>
          <button
            className={`bb-toggle ${compareMode ? 'on' : ''}`}
            onClick={() => { setCompareMode(v => !v); if (compareMode) setCompareSymbol(null) }}
            title="比較模式"
          >vs</button>
          <button
            className={`bb-toggle ${showRsiSub ? 'on' : ''}`}
            onClick={() => setShowRsiSub(v => !v)}
            title="RSI 子圖"
          >RSI</button>
          <button
            className={`bb-toggle ${showMacdSub ? 'on' : ''}`}
            onClick={() => setShowMacdSub(v => !v)}
            title="MACD 子圖"
          >MCD</button>
          <button
            className={`bb-toggle ${showObvSub ? 'on' : ''}`}
            onClick={() => setShowObvSub(v => !v)}
            title="OBV 量能子圖"
          >OBV</button>
          <button
            className={`bb-toggle ${showRetDist ? 'on' : ''}`}
            onClick={() => setShowRetDist(v => !v)}
            title="報酬分布直方圖"
          >RD</button>
          <button
            className={`bb-toggle ${showVolProfile ? 'on' : ''}`}
            onClick={() => setShowVolProfile(v => !v)}
            title="成交量分布 Volume Profile"
          >VP</button>
          <button
            className={`bb-toggle ${fullscreen ? 'on' : ''}`}
            onClick={() => setFullscreen(v => !v)}
            title="全螢幕 (Esc 退出)"
          >⛶</button>
          <div className="range-tabs">
            {RANGES.map(r => (
              <button key={r} className={`range-tab ${range === r ? 'active' : ''}`} onClick={() => setRange(r)}>{r}</button>
            ))}
          </div>
        </div>
      </div>
      {q && (
        <div className="chart-ohlc-bar">
          <span className="ohlc-item"><span className="ohlc-k">開</span><span className="ohlc-v mono">{q.open?.toFixed(2)}</span></span>
          <span className="ohlc-item"><span className="ohlc-k">高</span><span className="ohlc-v mono up">{q.high?.toFixed(2)}</span></span>
          <span className="ohlc-item"><span className="ohlc-k">低</span><span className="ohlc-v mono dn">{q.low?.toFixed(2)}</span></span>
          <span className="ohlc-item"><span className="ohlc-k">收</span><span className={`ohlc-v mono ${up ? 'up' : 'dn'}`}>{q.price?.toFixed(2)}</span></span>
          {q.volume > 0 && (
            <span className="ohlc-item">
              <span className="ohlc-k">量</span>
              <span className="ohlc-v mono">
                {q.volume >= 1e8 ? (q.volume / 1e8).toFixed(1) + '億'
                  : q.volume >= 1e4 ? (q.volume / 1e4).toFixed(0) + '萬'
                  : q.volume.toLocaleString()}
              </span>
            </span>
          )}
          <span className="ohlc-item"><span className="ohlc-k">幣</span><span className="ohlc-v mono">{q.currency || 'USD'}</span></span>
          {tech?.ma5 && showMA && <span className="ohlc-item"><span className="ohlc-k" style={{color:'rgba(249,115,22,.9)'}}>MA5</span><span className="ohlc-v mono">{tech.ma5}</span></span>}
          {tech?.ma20 && showMA && <span className="ohlc-item"><span className="ohlc-k" style={{color:'rgba(99,102,241,.9)'}}>MA20</span><span className="ohlc-v mono">{tech.ma20}</span></span>}
          {tech?.ma60 && showMA && <span className="ohlc-item"><span className="ohlc-k" style={{color:'rgba(239,83,80,.9)'}}>MA60</span><span className="ohlc-v mono">{tech.ma60}</span></span>}
          {yearHigh && <span className="ohlc-item" title="近一年最高"><span className="ohlc-k up">年高</span><span className="ohlc-v mono up">{yearHigh.toFixed(2)}</span>{fromHigh && <span style={{fontSize:9,color:'var(--dn)',marginLeft:2}}>{fromHigh}%</span>}</span>}
          {yearLow && <span className="ohlc-item" title="近一年最低"><span className="ohlc-k dn">年低</span><span className="ohlc-v mono dn">{yearLow.toFixed(2)}</span>{fromLow && <span style={{fontSize:9,color:'var(--up)',marginLeft:2}}>+{fromLow}%</span>}</span>}
        </div>
      )}

      {/* Multi-period performance badges */}
      {(perf5d != null || perf1m != null || perf3m != null || perf1y != null) && (
        <div className="perf-row">
          {[['5D', perf5d], ['1M', perf1m], ['3M', perf3m], ['1Y', perf1y]].map(([label, val]) => {
            if (val == null) return null
            const isUp = val >= 0
            return (
              <span key={label} className={`perf-badge ${isUp ? 'up-bg up' : 'dn-bg dn'}`}>
                <span className="perf-period">{label}</span>
                <span className="perf-val">{isUp ? '+' : ''}{val.toFixed(1)}%</span>
              </span>
            )
          })}
          {compareSymbol && compareCandles.length > 1 && (
            <span className="perf-badge" style={{ background: 'rgba(245,158,11,.15)', color: 'rgb(245,158,11)', border: '1px solid rgba(245,158,11,.3)' }}>
              <span className="perf-period">{compareSymbol}</span>
              <span className="perf-val">
                {(() => {
                  const base = compareCandles[0].close
                  const cur = compareCandles[compareCandles.length - 1].close
                  const r = ((cur - base) / base) * 100
                  return `${r >= 0 ? '+' : ''}${r.toFixed(1)}%`
                })()}
              </span>
            </span>
          )}
        </div>
      )}

      {/* Compare input */}
      {compareMode && (
        <div className="compare-bar">
          <span className="compare-label">比較</span>
          <input
            className="compare-input"
            placeholder="輸入代號 e.g. NVDA"
            value={compareInput}
            onChange={e => setCompareInput(e.target.value.toUpperCase())}
            onKeyDown={e => { if (e.key === 'Enter' && compareInput.trim()) { setCompareSymbol(compareInput.trim()); e.currentTarget.blur() } }}
          />
          <button
            className="compare-go"
            onClick={() => { if (compareInput.trim()) setCompareSymbol(compareInput.trim()) }}
          >比較</button>
          {compareSymbol && (
            <span className="compare-chip">
              <span style={{ color: 'rgba(245,158,11,.9)', fontSize: 10, fontWeight: 700 }}>{compareSymbol}</span>
              <button className="compare-rm" onClick={() => { setCompareSymbol(null); setCompareInput('') }}>✕</button>
            </span>
          )}
        </div>
      )}

      {/* Stats metrics row */}
      {statMetrics && (
        <div className="stats-row">
          <div className="stat-item">
            <span className="stat-k">年化波動</span>
            <span className={`stat-v mono ${parseFloat(statMetrics.annualVol) > 30 ? 'dn' : parseFloat(statMetrics.annualVol) > 15 ? 'warn' : 'up'}`}>{statMetrics.annualVol}%</span>
          </div>
          <div className="stat-sep" />
          <div className="stat-item">
            <span className="stat-k">最大回撤</span>
            <span className="stat-v mono dn">{statMetrics.maxDD}%</span>
          </div>
          <div className="stat-sep" />
          <div className="stat-item">
            <span className="stat-k">夏普比率</span>
            <span className={`stat-v mono ${parseFloat(statMetrics.sharpe) > 1 ? 'up' : parseFloat(statMetrics.sharpe) < 0 ? 'dn' : ''}`}>{statMetrics.sharpe}</span>
          </div>
          <div className="stat-sep" />
          <div className="stat-item">
            <span className="stat-k">勝率</span>
            <span className={`stat-v mono ${parseInt(statMetrics.winRate) > 50 ? 'up' : 'dn'}`}>{statMetrics.winRate}%</span>
          </div>
          <div className="stat-sep" />
          <div className="stat-item">
            <span className="stat-k">樣本 K 棒</span>
            <span className="stat-v mono">{candles.length}</span>
          </div>
        </div>
      )}

      <div className="chart-area-wrap">
        <div ref={containerRef} className={`chart-container ${drawMode ? 'draw-mode' : ''}`}>
          {loading && <div className="chart-overlay">載入中…</div>}
          {!loading && fetchError && (
            <div className="chart-error-overlay">
              <div className="chart-error-msg">⚠ {fetchError}</div>
              <button className="retry-btn" onClick={() => setRetryKey(k => k + 1)}>重試</button>
            </div>
          )}
        </div>
        {showVolProfile && <VolumeProfile candles={candles} />}
      </div>
      {showRsiSub && candles.length > 14 && (
        <RsiSubChart rsiSeries={calcRsiSeries(candles.map(c => c.close))} />
      )}
      {showMacdSub && candles.length > 35 && (
        <MacdSubChart macdSeries={calcMacdSeries(candles.map(c => c.close))} />
      )}
      {showObvSub && candles.length > 2 && (
        <ObvSubChart obvSeries={calcObvSeries(candles)} />
      )}
      {showRetDist && <ReturnDistChart candles={candles} />}
      {returnCalendar.length > 0 && (
        <div className="return-calendar">
          {returnCalendar.map((d, i) => {
            const abs = Math.min(Math.abs(d.pct), 4)
            const alpha = 0.2 + (abs / 4) * 0.7
            const bg = d.pct >= 0
              ? `rgba(38,166,154,${alpha})`
              : `rgba(239,83,80,${alpha})`
            return (
              <div
                key={i}
                className="rc-cell"
                style={{ background: bg }}
                title={`${d.label} ${d.pct >= 0 ? '+' : ''}${d.pct.toFixed(2)}%`}
              />
            )
          })}
        </div>
      )}
      {tech && <TechSignal tech={tech} />}
    </div>
  )
}
