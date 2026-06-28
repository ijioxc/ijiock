import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PORTFOLIO_LOGIC } from '../config/portfolioLogic';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5005';

const DEFAULT_WATCHLIST_TICKERS = [
  { symbol: '2330.TW', name: '台積電' },
  { symbol: '2412.TW', name: '中華電' },
  { symbol: '2303.TW', name: '聯電' },
  { symbol: '2882.TW', name: '國泰金' },
  { symbol: '2891.TW', name: '中信金' },
];

export const useDecisionStore = create(
  persist(
    (set, get) => ({
      holdings: [],
      watchlist: [],
      shoppingBasket: [],
      selectedTicker: '2330.TW',
      isPulseSyncing: false,

      currentAnalysis: {
        indicators: null,
        rawOHLC: []
      },

      decisionLogs: [],

      // --- ACTIONS ---
      selectTicker: (ticker) => set({ selectedTicker: ticker, currentAnalysis: { indicators: null, rawOHLC: [] } }),

      updateAnalysis: (data) => set({ currentAnalysis: data }),

      addStock: (ticker) => {
        const uppercaseTicker = ticker.toUpperCase();
        set((state) => {
          if (state.watchlist.some(t => t.symbol === uppercaseTicker)) return state;
          const newStock = {
            symbol: uppercaseTicker,
            name: 'Loading...',
            price: 0,
            change: 0,
            signal: 'neutral',
            priceHistory: []
          };
          return { watchlist: [newStock, ...state.watchlist] };
        });
        get().triggerPulse();
      },

      removeStock: (ticker) => set((state) => ({
        watchlist: state.watchlist.filter(t => t.symbol !== ticker)
      })),

      addToBasket: (stock) => set((state) => {
        if (state.shoppingBasket.some(t => t.symbol === stock.symbol)) return state;
        return { shoppingBasket: [stock, ...state.shoppingBasket] };
      }),

      removeFromBasket: (symbol) => set((state) => ({
        shoppingBasket: state.shoppingBasket.filter(t => t.symbol !== symbol)
      })),

      addLog: (action, reason, targetTicker = null) => set((state) => {
        const ticker = targetTicker || state.selectedTicker;
        const logicData = PORTFOLIO_LOGIC.METRICS[ticker] || null;
        return {
          decisionLogs: [
            {
              id: Date.now(),
              ticker,
              action,
              reason,
              timestamp: new Date().toISOString(),
              snapshot: {
                ...state.currentAnalysis.indicators,
                pivot: logicData ? logicData.pivot : '無',
                trigger: logicData ? logicData.trigger : '無'
              }
            },
            ...state.decisionLogs
          ]
        };
      }),

      initWatchlist: () => {
        const currentList = get().watchlist;
        if (currentList.length === 0) {
          const initList = DEFAULT_WATCHLIST_TICKERS.map(t => ({
            symbol: t.symbol, name: t.name, price: 0, change: 0, signal: 'neutral', priceHistory: []
          }));
          set({ watchlist: initList });
        }
        get().triggerPulse();
      },

      triggerPulse: async () => {
        const { watchlist } = get();
        if (watchlist.length === 0) return;

        set({ isPulseSyncing: true });
        try {
          const tickers = watchlist.map(w => w.symbol);
          const res = await fetch(`${API_BASE}/api/market/quotes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tickers })
          });

          if (!res.ok) throw new Error('API fetch failed');
          const data = await res.json();

          const updatedWatchlist = watchlist.map(item => {
            const apiData = data.find(d => d.symbol === item.symbol);
            if (apiData) {
              return {
                ...item,
                name: apiData.name || item.name,
                price: parseFloat(apiData.price.toFixed(2)),
                change: parseFloat(apiData.change.toFixed(2)),
                signal: apiData.change >= 0 ? 'up' : 'dn',
                priceHistory: apiData.priceHistory || []
              };
            }
            return item;
          });

          set({ watchlist: updatedWatchlist });
        } catch (error) {
          console.error('Failed to sync pulse:', error);
        } finally {
          set({ isPulseSyncing: false });
        }
      }
    }),
    {
      name: 'market-watch-decisions',
      partialize: (state) => ({
        decisionLogs: state.decisionLogs,
        holdings: state.holdings,
        watchlist: state.watchlist
      })
    }
  )
);
