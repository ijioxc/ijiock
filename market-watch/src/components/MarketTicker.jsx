import { useEffect, useState } from 'react'
import { useWatchlistStore } from '../store/watchlistStore'
import { fetchQuote } from '../api/market'

const TICKER_ORDER = ['^GSPC', '^IXIC', '^DJI', '^VIX', '^TNX', '^N225', '^HSI', 'GC=F', 'CL=F', 'BTC-USD', 'TWDUSD=X', 'USDTWD=X', 'USDJPY=X', 'EURUSD=X', 'DX-Y.NYB']

const TICKER_LABELS = {
  '^GSPC': 'S&P 500',
  '^IXIC': 'NASDAQ',
  '^DJI': 'DOW',
  '^VIX': 'VIX 恐慌',
  '^TNX': '10Y 殖利率',
  '^N225': '日経225',
  '^HSI': '恒生',
  'GC=F': '黃金',
  'CL=F': 'WTI 原油',
  'BTC-USD': '比特幣',
  'TWDUSD=X': 'TWD/USD',
  'USDTWD=X': 'USD/TWD',
  'USDJPY=X': 'USD/JPY',
  'EURUSD=X': 'EUR/USD',
  'DX-Y.NYB': '美元指數',
}

const GLOBAL_SYMS = ['^VIX', '^TNX', 'GC=F', 'CL=F', 'DX-Y.NYB']

export default function MarketTicker() {
  const quotes = useWatchlistStore(s => s.quotes)
  const symbols = useWatchlistStore(s => s.symbols)
  const [extraQuotes, setExtraQuotes] = useState({})

  useEffect(() => {
    const missing = GLOBAL_SYMS.filter(s => !symbols.some(w => w.symbol === s))
    if (missing.length === 0) return
    Promise.allSettled(
      missing.map(async (sym, i) => {
        await new Promise(r => setTimeout(r, i * 400))
        const q = await fetchQuote(sym)
        return { sym, q }
      })
    ).then(results => {
      const next = {}
      results.forEach(r => { if (r.status === 'fulfilled') next[r.value.sym] = r.value.q })
      setExtraQuotes(next)
    })
  }, [])

  const idxFx = symbols.filter(s => s.category === 'IDX')
  if (idxFx.length === 0) return null

  const allQuotes = { ...quotes, ...extraQuotes }

  const symbolsSet = new Set([
    ...TICKER_ORDER,
    ...idxFx.map(s => s.symbol),
  ])

  const items = [...symbolsSet].map(sym => {
    const fromWatchlist = idxFx.find(s => s.symbol === sym)
    const label = TICKER_LABELS[sym] ?? fromWatchlist?.name ?? sym
    return { symbol: sym, label, q: allQuotes[sym] }
  }).filter(item => item.q != null)

  return (
    <div className="market-ticker">
      <div className="ticker-track">
        {[...items, ...items].map((item, i) => {
          const q = item.q
          const up = q && q.change >= 0
          return (
            <span key={i} className="ticker-item">
              <span className="ticker-label">{item.label}</span>
              {q ? (
                <>
                  <span className={`ticker-price mono ${up ? 'up' : 'dn'}`}>
                    {q.price < 100 ? q.price.toFixed(4) : q.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                  <span className={`ticker-chg ${up ? 'up' : 'dn'}`}>
                    {up ? '▲' : '▼'}{Math.abs(q.changePct).toFixed(2)}%
                  </span>
                </>
              ) : (
                <span className="ticker-loading">…</span>
              )}
              <span className="ticker-sep">·</span>
            </span>
          )
        })}
      </div>
    </div>
  )
}
