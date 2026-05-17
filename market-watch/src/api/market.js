// Symbol type detection & mapping
// Yahoo Finance format → Stooq / TWSE

const STOOQ_BASE = '/api/stooq'
const TWSE_BASE = '/api/twse'
const TWSE_HIST = '/api/twse-hist'
const MKTDATA_BASE = '/api/mktdata'

// Map Yahoo Finance index symbols → Stooq
const INDEX_MAP = {
  '^GSPC': '^spx',
  '^IXIC': '^ndx',
  '^DJI':  '^dji',
  '^N225': '^nk225',
  '^HSI':  '^hsi',
}

// Map Yahoo Finance FX → Stooq
const FX_MAP = {
  'TWDUSD=X': 'twdusd',
  'USDTWD=X': 'usdtwd',
  'USDJPY=X': 'usdjpy',
  'EURUSD=X': 'eurusd',
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
  // US stock: AAPL → aapl.us
  return symbol.toLowerCase() + '.us'
}

// ── TWSE cache (shared across all TW quote calls) ──
let twseCache = { data: null, ts: 0 }
const TWSE_TTL = 3 * 60 * 1000  // 3 min

async function fetchTwseAll() {
  if (twseCache.data && Date.now() - twseCache.ts < TWSE_TTL) return twseCache.data
  const r = await fetch(`${TWSE_BASE}/v1/exchangeReport/STOCK_DAY_ALL`)
  if (!r.ok) throw new Error(`TWSE error ${r.status}`)
  const data = await r.json()
  twseCache = { data, ts: Date.now() }
  return data
}

// ── Stooq quote ──
async function fetchStooqQuote(stooqSym) {
  const url = `${STOOQ_BASE}/q/l/?s=${encodeURIComponent(stooqSym)}&f=sd2t2ohlcv&h&e=csv`
  const r = await fetch(url)
  if (!r.ok) throw new Error(`Stooq error ${r.status}`)
  const csv = await r.text()
  const lines = csv.trim().split('\n')
  if (lines.length < 2) throw new Error('No Stooq data')
  const [, date, , open, high, low, close, volume] = lines[1].split(',')
  if (!close || close === 'N/D') throw new Error('Market closed or no data')
  return { date, open: +open, high: +high, low: +low, close: +close, volume: +volume || 0 }
}

// ── Stooq OHLC history ──
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
        const r = await fetch(`${TWSE_HIST}/rwd/zh/afterTrading/STOCK_DAY?stockNo=${code}&date=${yyyymmdd}&response=json`)
        if (!r.ok) continue
        const json = await r.json()
        if (json.stat !== 'OK' || !Array.isArray(json.data)) continue
        for (const row of json.data) {
          // row: ["115/05/04","44,458,732","99,944,198,300","2,200.00","2,285.00","2,195.00","2,275.00","+140.00","129,173",""]
          const time = mingouSlashToUnix(row[0])
          if (!time) continue
          rows.push({
            time,
            open:  parseTwseNum(row[3]),
            high:  parseTwseNum(row[4]),
            low:   parseTwseNum(row[5]),
            close: parseTwseNum(row[6]),
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

  // US stocks via marketdata.app (free, no key needed)
  if (type === 'us') {
    const from = rangeToFromDate(range)
    const to = todayStr()
    const url = `${MKTDATA_BASE}/v1/stocks/candles/D/${encodeURIComponent(symbol)}/?from=${from}&to=${to}`
    const r = await fetch(url)
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

  throw new Error('此標的暫不支援歷史圖表')
}

// ── Main quote fetcher (used by useQuotes) ──
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
      price,
      change,
      changePct: prev ? (change / prev) * 100 : 0,
      open:   parseTwseNum(row.OpeningPrice),
      high:   parseTwseNum(row.HighestPrice),
      low:    parseTwseNum(row.LowestPrice),
      prev,
      volume: parseTwseNum(row.TradeVolume),
      currency: 'TWD',
      ts: Date.now(),
    }
  }

  // Stooq (US stocks, indices, FX)
  const stooqSym = toStooqSym(symbol)
  const q = await fetchStooqQuote(stooqSym)

  // prev = open (Stooq doesn't give previous close in quote endpoint)
  const change = q.close - q.open
  const changePct = q.open ? (change / q.open) * 100 : 0
  return {
    price: q.close,
    change,
    changePct,
    open:   q.open,
    high:   q.high,
    low:    q.low,
    prev:   q.open,
    volume: q.volume,
    currency: type === 'fx' ? '' : 'USD',
    ts: Date.now(),
  }
}

// ── Helpers ──
function parseTwseNum(s) {
  return parseFloat(String(s).replace(/,/g, '')) || 0
}

function mingouToUnix(dateStr) {
  // "1150515" → year 115 of Minguo = 2026, month 05, day 15
  if (!dateStr || dateStr === 'N/D') return null
  const s = String(dateStr)
  const y = parseInt(s.slice(0, -4)) + 1911
  const m = parseInt(s.slice(-4, -2)) - 1
  const d = parseInt(s.slice(-2))
  return Math.floor(new Date(y, m, d).getTime() / 1000)
}

function mingouSlashToUnix(dateStr) {
  // "115/05/04" → 2026-05-04
  if (!dateStr) return null
  const parts = dateStr.split('/')
  if (parts.length !== 3) return null
  const y = parseInt(parts[0]) + 1911
  const m = parseInt(parts[1]) - 1
  const d = parseInt(parts[2])
  return Math.floor(new Date(y, m, d).getTime() / 1000)
}

function rangeToMonths(range) {
  return { '1mo': 1, '3mo': 3, '6mo': 6, '1y': 12 }[range] ?? 3
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
