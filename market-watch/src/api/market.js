// 所有資料統一走 Yahoo Finance（透過 CF Worker 解決 CORS）
// 支援：台股、美股、ETF、指數、外匯、加密貨幣

import { WORKER_URL } from './config'

const IS_PROD = import.meta.env.PROD
const YAHOO_DIRECT = 'https://query1.finance.yahoo.com'
const YAHOO_DEV = '/api/yahoo'

function yahooUrl(path) {
  if (!IS_PROD) return `${YAHOO_DEV}${path}`
  return `${WORKER_URL}/proxy?url=${encodeURIComponent(`${YAHOO_DIRECT}${path}`)}`
}

async function fetchWithRetry(url, maxRetries = 2) {
  let res
  for (let i = 0; i <= maxRetries; i++) {
    if (i > 0) await new Promise(r => setTimeout(r, 1500 * i))
    res = await fetch(url)
    if (res.status !== 429) return res
  }
  return res
}

// ── Quote cache ──
const quoteCache = new Map()
const QUOTE_TTL = 30 * 1000

export async function fetchQuote(symbol) {
  const cached = quoteCache.get(symbol)
  if (cached && Date.now() - cached.ts < QUOTE_TTL) return cached.data

  const path = `/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`
  const r = await fetchWithRetry(yahooUrl(path))
  if (!r.ok) throw new Error(`Yahoo ${r.status}`)
  const json = await r.json()
  const meta = json?.chart?.result?.[0]?.meta
  if (!meta) throw new Error('No data')

  const prev = meta.chartPreviousClose ?? meta.previousClose ?? meta.regularMarketPrice
  const price = meta.regularMarketPrice
  const change = price - prev
  const changePct = prev ? (change / prev) * 100 : 0

  const data = {
    price, change, changePct,
    open: meta.regularMarketOpen,
    high: meta.regularMarketDayHigh,
    low: meta.regularMarketDayLow,
    prev,
    volume: meta.regularMarketVolume,
    currency: meta.currency,
    ts: meta.regularMarketTime,
  }
  quoteCache.set(symbol, { data, ts: Date.now() })
  return data
}

// ── OHLC cache ──
const ohlcCache = new Map()
const OHLC_TTL = 5 * 60 * 1000

const RANGE_MAP = {
  '1mo': { interval: '1d',  range: '1mo' },
  '3mo': { interval: '1d',  range: '3mo' },
  '6mo': { interval: '1d',  range: '6mo' },
  '1y':  { interval: '1wk', range: '1y' },
  '2y':  { interval: '1wk', range: '2y' },
  '5y':  { interval: '1mo', range: '5y' },
}

export async function fetchOHLC(symbol, range = '3mo') {
  const cacheKey = `${symbol}|${range}`
  const cached = ohlcCache.get(cacheKey)
  if (cached && Date.now() - cached.ts < OHLC_TTL) return cached.data

  const { interval, range: r } = RANGE_MAP[range] ?? RANGE_MAP['3mo']
  const path = `/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${r}`
  const res = await fetchWithRetry(yahooUrl(path))
  if (!res.ok) throw new Error(`Yahoo OHLC ${res.status}`)
  const json = await res.json()
  const result = json?.chart?.result?.[0]
  if (!result?.timestamp?.length) throw new Error('無歷史資料')

  const { timestamp, indicators } = result
  const q = indicators.quote[0]
  const adj = indicators.adjclose?.[0]?.adjclose

  const data = timestamp.map((t, i) => {
    const raw = q.close[i]
    if (raw == null || q.open[i] == null) return null
    // 用 adjclose 等比例縮放，修正股票分割造成的歷史價格跳空
    const factor = (adj && adj[i] != null && raw !== 0) ? adj[i] / raw : 1
    return {
      time: t,
      open:   q.open[i]   * factor,
      high:   q.high[i]   * factor,
      low:    q.low[i]    * factor,
      close:  raw         * factor,
      volume: q.volume[i],
    }
  }).filter(Boolean)

  ohlcCache.set(cacheKey, { data, ts: Date.now() })
  return data
}

// ── Intraday cache ──
const intradayCache = new Map()
const INTRADAY_TTL = 5 * 60 * 1000

export async function fetchIntraday(symbol, interval = '15m', days = 5) {
  const key = `${symbol}|${interval}|${days}`
  const cached = intradayCache.get(key)
  if (cached && Date.now() - cached.ts < INTRADAY_TTL) return cached.data

  const path = `/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${days}d&includePrePost=false`
  const r = await fetchWithRetry(yahooUrl(path))
  if (!r.ok) throw new Error(`盤中資料錯誤 ${r.status}`)
  const json = await r.json()
  const result = json.chart?.result?.[0]
  if (!result?.timestamp?.length) throw new Error('無盤中資料（可能非交易時間）')

  const ts = result.timestamp
  const q = result.indicators?.quote?.[0] ?? {}
  const data = ts.map((t, i) => ({
    time: t,
    open: q.open?.[i], high: q.high?.[i], low: q.low?.[i], close: q.close?.[i], volume: q.volume?.[i],
  })).filter(c => c.open != null && c.close != null)

  intradayCache.set(key, { data, ts: Date.now() })
  return data
}
