import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const DEFAULT_SYMBOLS = [
  { symbol: '2330.TW', name: '台積電', category: 'TW' },
  { symbol: '2317.TW', name: '鴻海', category: 'TW' },
  { symbol: '2454.TW', name: '聯發科', category: 'TW' },
  { symbol: '2603.TW', name: '長榮', category: 'TW' },
  { symbol: 'AAPL', name: '蘋果', category: 'US' },
  { symbol: 'NVDA', name: '輝達', category: 'US' },
  { symbol: 'MSFT', name: '微軟', category: 'US' },
  { symbol: 'TSLA', name: '特斯拉', category: 'US' },
  { symbol: '0050.TW', name: '元大台灣50', category: 'ETF' },
  { symbol: '0056.TW', name: '元大高股息', category: 'ETF' },
  { symbol: 'QQQ', name: 'NASDAQ 100 ETF', category: 'ETF' },
  { symbol: 'SPY', name: 'S&P500 ETF', category: 'ETF' },
  { symbol: '^TWII', name: '台股加權指數', category: 'IDX' },
  { symbol: '^GSPC', name: 'S&P 500', category: 'IDX' },
  { symbol: '^IXIC', name: 'NASDAQ', category: 'IDX' },
  { symbol: '^VIX', name: '恐慌指數', category: 'IDX' },
]

export const useWatchlistStore = create(
  persist(
    (set, get) => ({
      symbols: DEFAULT_SYMBOLS,
      selected: '2330.TW',
      quotes: {},         // { symbol: { price, change, changePct, open, high, low, prev, ts } }
      priceHistory: {},   // { symbol: number[] } — last 30 prices for sparkline
      alerts: {},         // { symbol: { target: null, stop: null } }
      triggeredAlerts: [],
      apiKey: '',
      geminiKey: '',
      aiProvider: 'gemini',
      forceRefresh: 0,
      pinnedSymbols: [],  // symbols pinned to top of watchlist
      symbolTags: {},     // { symbol: 'red'|'yellow'|'green'|null }
      symbolNotes: {},    // { symbol: string }

      setSelected: (symbol) => set({ selected: symbol }),
      setApiKey: (key) => set({ apiKey: key }),
      setGeminiKey: (key) => set({ geminiKey: key }),
      setAiProvider: (p) => set({ aiProvider: p }),
      doRefresh: () => set(s => ({ forceRefresh: s.forceRefresh + 1 })),
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

      addSymbol: (symbol, name, category) =>
        set(s => ({
          symbols: s.symbols.find(x => x.symbol === symbol)
            ? s.symbols
            : [...s.symbols, { symbol, name, category }],
        })),

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
    { name: 'market-watch-store', partialize: s => ({ symbols: s.symbols, alerts: s.alerts, apiKey: s.apiKey, geminiKey: s.geminiKey, aiProvider: s.aiProvider, pinnedSymbols: s.pinnedSymbols, symbolTags: s.symbolTags, symbolNotes: s.symbolNotes }) }
  )
)
