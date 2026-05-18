// Symbol type detection & mapping
// Yahoo Finance format → Stooq / TWSE

// In production (GitHub Pages), use CORS proxy since there's no server-side proxy
const IS_PROD = import.meta.env.PROD
const CORS_PROXY = 'https://corsproxy.io/?'

function px(url) {
  return IS_PROD ? CORS_PROXY + encodeURIComponent(url) : url
}

const STOOQ_DIRECT = 'https://stooq.com'
const TWSE_DIRECT  = 'https://openapi.twse.com.tw'
const TWSE_HIST_DIRECT = 'https://www.twse.com.tw'
const MKTDATA_DIRECT = 'https://api.marketdata.app'

// Dev mode paths (Vite proxy)
const STOOQ_DEV  = '/api/stooq'
const TWSE_DEV   = '/api/twse'
const TWSE_HIST_DEV = '/api/twse-hist'
const MKTDATA_DEV = '/api/mktdata'

function stooqUrl(path) {
  return IS_PROD ? px(`${STOOQ_DIRECT}${path}`) : `${STOOQ_DEV}${path}`
}
function twseUrl(path) {
  return IS_PROD ? px(`${TWSE_DIRECT}${path}`) : `${TWSE_DEV}${path}`
}
function twseHistUrl(path) {
  return IS_PROD ? px(`${TWSE_HIST_DIRECT}${path}`) : `${TWSE_HIST_DEV}${path}`
}
function mktdataUrl(path) {
  return IS_PROD ? px(`${MKTDATA_DIRECT}${path}`) : `${MKTDATA_DEV}${path}`
}

// Map Yahoo Finance index symbols → Stooq
const INDEX_MAP = {
  '^GSPC': '^spx',
  '^IXIC': '^ndx',
  '^DJI':  '^dji',
  '^N225': '^nk225',
  '^HSI':  '^hsi',
  '^VIX':  '^vix',
  '^TNX':  '^tnx',
}

// Map Yahoo Finance FX → Stooq
const FX_MAP = {
  'TWDUSD=X': 'twdusd',
  'USDTWD=X': 'usdtwd',
  'USDJPY=X': 'usdjpy',
  'EURUSD=X': 'eurusd',
  'GC=F':     'gc.f',
  'CL=F':     'cl.f',
  'DX-Y.NYB': 'dx.f',
}

function detectType(symbol) {
  if (/^\d{4,5}\.TW$/i.test(symbol)) return 'twse'
  if (INDEX_MAP[symbol]) return 'index'
  if (FX_MAP[symbol]) return 'fx'
  return 'us'
}

function toStooqSym(symbol) {
  if (INDEX_MAP[symbol]) return INDEX_MAP[symbol]
  if (FX_MAP[symbol]) return FX_MAP[symbol]
  return symbol.toLowerCase() + '.us'
}

// ── TWSE cache ──
let twseCache = { data: null, ts: 0 }
const TWSE_TTL = 3 * 60 * 1000

async function fetchTwseAll() {
  if (twseCache.data && Date.now() - twseCache.ts < TWSE_TTL) return twseCache.data
  const r = await fetch(twseUrl('/v1/exchangeReport/STOCK_DAY_ALL'))
  if (!r.ok) throw new Error(`TWSE error ${r.status}`)
  const data = await r.json()
  twseCache = { data, ts: Date.now() }
  return data
}

// ── Stooq quote ──
async function fetchStooqQuote(stooqSym) {
  const path = `/q/l/?s=${encodeURIComponent(stooqSym)}&f=sd2t2ohlcv&h&e=csv`
  const r = await fetch(stooqUrl(path))
  if (!r.ok) throw new Error(`Stooq error ${r.status}`)
  const csv = await r.text()
  const lines = csv.trim().split('\n')
  if (lines.length < 2) throw new Error('No Stooq data')
  const [, date, , open, high, low, close, volume] = lines[1].split(',')
  if (!close || close === 'N/D') throw new Error('Market closed or no data')
  return { date, open: +open, high: +high, low: +low, close: +close, volume: +volume || 0 }
}

// ── OHLC history cache ──
const ohlcCache = new Map()
const OHLC_TTL = 5 * 60 * 1000

export async function fetchOHLC(symbol, range = '3mo') {
  const cacheKey = `${symbol}|${range}`
  const cached = ohlcCache.get(cacheKey)
  if (cached && Date.now() - cached.ts < OHLC_TTL) return cached.data

  const type = detectType(symbol)

  if (type === 'twse') {
    const code = symbol.split('.')[0]
    const months = rangeToMonths(range)
    const rows = []
    const now = new Date()
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const yyyymmdd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}01`
      try {
        const path = `/rwd/zh/afterTrading/STOCK_DAY?stockNo=${code}&date=${yyyymmdd}&response=json`
        const r = await fetch(twseHistUrl(path))
        if (!r.ok) continue
        const json = await r.json()
        if (json.stat !== 'OK' || !Array.isArray(json.data)) continue
        for (const row of json.data) {
          const time = mingouSlashToUnix(row[0])
          if (!time) continue
          rows.push({
            time,
            open:   parseTwseNum(row[3]),
            high:   parseTwseNum(row[4]),
            low:    parseTwseNum(row[5]),
            close:  parseTwseNum(row[6]),
            volume: parseTwseNum(row[1]),
          })
        }
      } catch (_) {}
    }
    if (!rows.length) throw new Error('無法取得台股歷史資料（休市或資料尚未更新）')
    const data = rows.sort((a, b) => a.time - b.time)
    ohlcCache.set(cacheKey, { data, ts: Date.now() })
    return data
  }

  if (type === 'us') {
    const from = rangeToFromDate(range)
    const to = todayStr()
    const path = `/v1/stocks/candles/D/${encodeURIComponent(symbol)}/?from=${from}&to=${to}`
    const r = await fetch(mktdataUrl(path))
    if (!r.ok) throw new Error(`marketdata.app error ${r.status}`)
    const json = await r.json()
    if (json.s !== 'ok' || !json.t?.length) throw new Error('無美股歷史資料')
    const data = json.t.map((t, i) => ({
      time: t,
      open: json.o[i], high: json.h[i], low: json.l[i], close: json.c[i], volume: json.v[i],
    })).sort((a, b) => a.time - b.time)
    ohlcCache.set(cacheKey, { data, ts: Date.now() })
    return data
  }

  // index / fx: use Stooq CSV history
  const stooqSym = toStooqSym(symbol)
  const from = rangeToFromDate(range)
  const to = todayStr()
  const path = `/q/d/l/?s=${encodeURIComponent(stooqSym)}&d1=${from.replace(/-/g,'')}&d2=${to.replace(/-/g,'')}&i=d`
  const r = await fetch(stooqUrl(path))
  if (!r.ok) throw new Error(`Stooq history error ${r.status}`)
  const csv = await r.text()
  const lines = csv.trim().split('\n').slice(1)
  const data = lines.map(line => {
    const [date, open, high, low, close, volume] = line.split(',')
    if (!date || !close || close === 'N/D') return null
    const [y, m, d] = date.split('-').map(Number)
    return {
      time: Math.floor(new Date(y, m - 1, d).getTime() / 1000),
      open: +open, high: +high, low: +low, close: +close, volume: +(volume || 0),
    }
  }).filter(Boolean).sort((a, b) => a.time - b.time)
  if (!data.length) throw new Error('此標的暫無歷史圖表')
  ohlcCache.set(cacheKey, { data, ts: Date.now() })
  return data
}

// ── Main quote fetcher ──
export async function fetchQuote(symbol) {
  const type = detectType(symbol)

  if (type === 'twse') {
    const code = symbol.split('.')[0]
    const all = await fetchTwseAll()
    const row = all.find(x => x.Code === code)
    if (!row) throw new Error(`TWSE: ${code} not found`)
    const price = parseTwseNum(row.ClosingPrice)
    const change = parseTwseNum(row.Change)
    const prev = price - change
    return {
      price, change,
      changePct: prev ? (change / prev) * 100 : 0,
      open:   parseTwseNum(row.OpeningPrice),
      high:   parseTwseNum(row.HighestPrice),
      low:    parseTwseNum(row.LowestPrice),
      prev, volume: parseTwseNum(row.TradeVolume),
      currency: 'TWD', ts: Date.now(),
    }
  }

  const stooqSym = toStooqSym(symbol)
  const q = await fetchStooqQuote(stooqSym)
  const change = q.close - q.open
  const changePct = q.open ? (change / q.open) * 100 : 0
  return {
    price: q.close, change, changePct,
    open: q.open, high: q.high, low: q.low,
    prev: q.open, volume: q.volume,
    currency: type === 'fx' ? '' : 'USD',
    ts: Date.now(),
  }
}

// ── Helpers ──
function parseTwseNum(s) {
  return parseFloat(String(s).replace(/,/g, '')) || 0
}

function mingouSlashToUnix(dateStr) {
  if (!dateStr) return null
  const parts = dateStr.split('/')
  if (parts.length !== 3) return null
  const y = parseInt(parts[0]) + 1911
  const m = parseInt(parts[1]) - 1
  const d = parseInt(parts[2])
  return Math.floor(new Date(y, m, d).getTime() / 1000)
}

function rangeToMonths(range) {
  return { '1mo': 1, '3mo': 3, '6mo': 6, '1y': 12, '2y': 24, '5y': 60 }[range] ?? 3
}

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function rangeToFromDate(range) {
  const months = rangeToMonths(range)
  const d = new Date()
  d.setMonth(d.getMonth() - months)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

const intradayCache = new Map()
const INTRADAY_TTL = 5 * 60 * 1000

export async function fetchIntraday(symbol, interval = '15m', days = 5) {
  const key = `${symbol}|${interval}|${days}`
  const cached = intradayCache.get(key)
  if (cached && Date.now() - cached.ts < INTRADAY_TTL) return cached.data

  // Yahoo Finance v8 chart endpoint — works for TW, US, indices, FX
  const yhSym = encodeURIComponent(symbol)
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yhSym}?interval=${interval}&range=${days}d&includePrePost=false`
  const r = await fetch(px(url))
  if (!r.ok) throw new Error(`盤中資料錯誤 ${r.status}`)
  const json = await r.json()
  const result = json.chart?.result?.[0]
  if (!result?.timestamp?.length) throw new Error('無盤中資料（可能非交易時間）')

  const ts = result.timestamp
  const q  = result.indicators?.quote?.[0] ?? {}
  const data = ts.map((t, i) => ({
    time: t,
    open: q.open?.[i], high: q.high?.[i], low: q.low?.[i], close: q.close?.[i], volume: q.volume?.[i],
  })).filter(c => c.open != null && c.close != null)

  intradayCache.set(key, { data, ts: Date.now() })
  return data
}
