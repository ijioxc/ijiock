import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5005'

// 依符號格式自動分類（無需寫死對照表）
export function classifySymbol(symbol) {
  if (!symbol) return 'OTHER'
  const s = symbol.toUpperCase()
  if (s.startsWith('^')) return 'IDX'
  if (s.endsWith('-USD') || s.startsWith('CG:')) return 'CRYPTO'
  if (s.includes('=X') || s.endsWith('.NYB')) return 'FX'
  if (/\.TW[O]?$/.test(s)) {
    const code = s.replace(/\.TW[O]?$/, '')
    if (/^00/.test(code)) return 'ETF'
    return 'TW'
  }
  return 'US'
}

// 預設清單只是「符號池」，名稱與分類都由後端/規則動態決定
const DEFAULT_TICKERS = [
  '2330.TW', '2317.TW', '2454.TW', '2382.TW', '2308.TW', '2303.TW',
  '2881.TW', '2882.TW', '2891.TW', '2886.TW', '2412.TW', '2002.TW', '1301.TW',
  '0050.TW', '0056.TW', '00878.TW', '00631L.TW', '00981A.TW',
  '00919.TW', '00929.TW', '00679B.TW',
  'AAPL', 'NVDA', 'MSFT',
  'BTC-USD', 'ETH-USD', '^GSPC', '^IXIC',
  'TWDUSD=X', 'DX-Y.NYB',
]

export const DEFAULT_SYMBOLS = DEFAULT_TICKERS.map(t => ({
  symbol: t,
  name: t,                       // 暫用 ticker；首次 doRefresh 會由後端填入真實名稱
  category: classifySymbol(t),
}))

export const useWatchlistStore = create(
  persist(
    (set, get) => ({
      symbols: DEFAULT_SYMBOLS,
      selected: '2330.TW',
      quotes: {},
      priceHistory: {},
      alerts: {},
      triggeredAlerts: [],
      apiKey: '',
      geminiKey: '',
      aiProvider: 'gemini',
      forceRefresh: 0,
      pinnedSymbols: [],
      symbolTags: {},
      symbolNotes: {},

      setSelected: (symbol) => set({ selected: symbol }),
      setApiKey: (key) => set({ apiKey: key }),
      setGeminiKey: (key) => set({ geminiKey: key }),
      setAiProvider: (p) => set({ aiProvider: p }),

      doRefresh: async () => {
        const { symbols } = get()
        if (!symbols || symbols.length === 0) return
        try {
          const res = await fetch(`${API_BASE}/api/market/quotes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tickers: symbols.map(s => s.symbol) })
          })
          if (!res.ok) return
          const data = await res.json()

          const byTicker = Object.fromEntries(data.map(d => [d.symbol, d]))
          const newQuotes = { ...get().quotes }
          const newHistory = { ...get().priceHistory }

          data.forEach(item => {
            newQuotes[item.symbol] = {
              price: item.price,
              changePct: item.change,
              name: item.name,
              ts: Date.now(),
            }
            if (item.priceHistory && item.priceHistory.length > 0) {
              newHistory[item.symbol] = item.priceHistory
            }
          })

          // 動態更新 symbol 的 name 與 category（若 backend 回傳）
          const newSymbols = symbols.map(s => {
            const fetched = byTicker[s.symbol]
            const fetchedName = fetched?.name && fetched.name !== s.symbol ? fetched.name : null
            return {
              ...s,
              name: fetchedName || s.name,
              category: classifySymbol(s.symbol),
            }
          })

          set({ quotes: newQuotes, priceHistory: newHistory, symbols: newSymbols })
        } catch (err) {
          console.error('doRefresh failed:', err)
        }
      },

      togglePin: (symbol) => set(s => ({
        pinnedSymbols: s.pinnedSymbols.includes(symbol)
          ? s.pinnedSymbols.filter(x => x !== symbol)
          : [...s.pinnedSymbols, symbol],
      })),
      setTag: (symbol, tag) => set(s => ({
        symbolTags: { ...s.symbolTags, [symbol]: tag },
      })),
      setNote: (symbol, note) => set(s => ({
        symbolNotes: { ...s.symbolNotes, [symbol]: note },
      })),

      addSymbol: (symbol, name, category) => {
        let finalSymbol = symbol
        if (category === 'CRYPTO' && !finalSymbol.startsWith('CG:')) {
          finalSymbol = 'CG:' + finalSymbol
        }
        const finalCategory = category || classifySymbol(finalSymbol)
        return set(s => ({
          symbols: s.symbols.find(x => x.symbol === finalSymbol)
            ? s.symbols
            : [...s.symbols, { symbol: finalSymbol, name: name || finalSymbol, category: finalCategory }],
        }))
      },

      removeSymbol: (symbol) =>
        set(s => ({
          symbols: s.symbols.filter(x => x.symbol !== symbol),
          selected: s.selected === symbol ? (s.symbols[0]?.symbol ?? '') : s.selected,
        })),

      setQuote: (symbol, data) =>
        set(s => {
          const prev = s.priceHistory[symbol] ?? []
          const next = data.price != null ? [...prev, data.price].slice(-30) : prev
          return {
            quotes: { ...s.quotes, [symbol]: data },
            priceHistory: { ...s.priceHistory, [symbol]: next },
          }
        }),

      seedPriceHistory: (symbol, prices) =>
        set(s => ({
          priceHistory: { ...s.priceHistory, [symbol]: prices },
        })),

      setAlert: (symbol, target, stop, pctMove = null, rsiThresh = null) =>
        set(s => ({ alerts: { ...s.alerts, [symbol]: { target, stop, pctMove, rsiThresh } } })),

      pushTriggered: (entry) =>
        set(s => ({ triggeredAlerts: [entry, ...s.triggeredAlerts].slice(0, 50) })),

      clearTriggered: () => set({ triggeredAlerts: [] }),
    }),
    {
      name: 'market-watch-store',
      partialize: s => ({
        symbols: s.symbols,
        alerts: s.alerts,
        apiKey: s.apiKey,
        geminiKey: s.geminiKey,
        aiProvider: s.aiProvider,
        pinnedSymbols: s.pinnedSymbols,
        symbolTags: s.symbolTags,
        symbolNotes: s.symbolNotes,
      }),
    }
  )
)
