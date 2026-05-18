import { useEffect, useRef } from 'react'
import { fetchQuote, fetchOHLC } from '../api/market'
import { useWatchlistStore } from '../store/watchlistStore'

const INTERVAL_MS = 30_000

export function useQuotes() {
  const symbols = useWatchlistStore(s => s.symbols)
  const alerts = useWatchlistStore(s => s.alerts)
  const quotes = useWatchlistStore(s => s.quotes)
  const setQuote = useWatchlistStore(s => s.setQuote)
  const seedPriceHistory = useWatchlistStore(s => s.seedPriceHistory)
  const priceHistory = useWatchlistStore(s => s.priceHistory)
  const pushTriggered = useWatchlistStore(s => s.pushTriggered)
  const forceRefresh = useWatchlistStore(s => s.forceRefresh)
  const prevQuotesRef = useRef({})
  const seededRef = useRef(new Set())

  async function poll() {
    await Promise.allSettled(
      symbols.map(async ({ symbol }, i) => {
        await new Promise(r => setTimeout(r, i * 300))
        try {
          const q = await fetchQuote(symbol)
          const prev = prevQuotesRef.current[symbol]
          setQuote(symbol, q)
          prevQuotesRef.current[symbol] = q

          const alert = alerts[symbol]
          if (alert && prev) {
            if (alert.target && prev.price < alert.target && q.price >= alert.target) {
              const entry = { symbol, type: 'target', price: q.price, ts: Date.now() }
              pushTriggered(entry)
              notify(`📈 ${symbol} 突破目標價 ${alert.target}！現價 ${q.price.toFixed(2)}`)
              beep(1046, 0.12); setTimeout(() => beep(1318, 0.12), 130); setTimeout(() => beep(1568, 0.2), 260)
            }
            if (alert.stop && prev.price > alert.stop && q.price <= alert.stop) {
              const entry = { symbol, type: 'stop', price: q.price, ts: Date.now() }
              pushTriggered(entry)
              notify(`📉 ${symbol} 跌破停損價 ${alert.stop}！現價 ${q.price.toFixed(2)}`)
              beep(440, 0.18); setTimeout(() => beep(330, 0.25), 200)
            }
            // % move alert — triggers once when threshold first crossed
            if (alert.pctMove && Math.abs(prev.changePct ?? 0) < alert.pctMove && Math.abs(q.changePct ?? 0) >= alert.pctMove) {
              const dir = q.changePct >= 0 ? '上漲' : '下跌'
              const entry = { symbol, type: 'pct', price: q.price, ts: Date.now() }
              pushTriggered(entry)
              notify(`📊 ${symbol} ${dir} ${Math.abs(q.changePct).toFixed(2)}%！超過設定 ${alert.pctMove}%`)
              beep(880, 0.1); setTimeout(() => beep(1100, 0.12), 120)
            }
          }
        } catch (_) { /* ignore per-symbol errors */ }
      })
    )
  }

  async function seedHistory(symbol) {
    if (seededRef.current.has(symbol)) return
    seededRef.current.add(symbol)
    try {
      const rows = await fetchOHLC(symbol, '1mo')
      if (rows.length >= 5) {
        const closes = rows.slice(-25).map(r => r.close)
        seedPriceHistory(symbol, closes)
      }
    } catch (_) {}
  }

  useEffect(() => {
    symbols.forEach(({ symbol }) => {
      const hist = priceHistory[symbol]
      if (!hist || hist.length < 5) seedHistory(symbol)
    })
    poll()
    const id = setInterval(poll, INTERVAL_MS)
    return () => clearInterval(id)
  }, [symbols.map(s => s.symbol).join(','), forceRefresh])
}

function notify(msg) {
  if (typeof Notification === 'undefined') return
  if (Notification.permission === 'granted') {
    new Notification('市場警示', { body: msg, icon: '/favicon.ico' })
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(p => {
      if (p === 'granted') new Notification('市場警示', { body: msg })
    })
  }
}

function beep(freq = 880, duration = 0.18, type = 'sine') {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = freq
    osc.type = type
    gain.gain.setValueAtTime(0.18, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + duration)
    osc.onended = () => ctx.close()
  } catch (_) {}
}
