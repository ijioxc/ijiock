import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { fetchHistoricalData } from '../services/marketApi';
import { PORTFOLIO_LOGIC } from '../config/portfolioLogic';
import { API_BASE } from '../config/apiConfig';
import { useWatchlistStore } from './watchlistStore';
import { askGemini } from '../api/gemini';

export const useResearchStore = create((set, get) => ({
  timeframe: '日', // '15分', '日', '週', '月', '3mo', '1y'
  chartData: [],
  decisionObject: null,
  obsidianContent: '',
  chatHistory: [],
  isAILoading: false,
  isChartLoading: false,
  
  setCurrentTicker: (ticker) => {
    // 邊界防護：強制清空 Context 與先前的資料，避免 Context Bleed
    set({ 
      currentTicker: ticker,
      chatHistory: [], 
      obsidianContent: '', 
      decisionObject: null, 
      chartData: [] 
    });
    get().fetchData(ticker);
  },

  setTimeframe: (tf) => {
    set({ timeframe: tf });
  },

  fetchData: async (symbol) => {
    set({ isChartLoading: true });
    // 透過 Yahoo Finance Proxy 獲取真實的歷史日 K 線
    const data = await fetchHistoricalData(symbol, get().timeframe);
    
    // 同步抓取 Obsidian 筆記
    try {
      const res = await fetch(`/api/obsidian?s=${symbol}`);
      if (res.ok) {
        const text = await res.text();
        set({ obsidianContent: text });
      } else {
        set({ obsidianContent: '> 本地知識庫尚未建立此標的之筆記。' });
      }
    } catch (e) {
      set({ obsidianContent: '> 無法連線至本地知識庫。' });
    }

    if (data.length === 0) {
      set({ isChartLoading: false });
      return;
    }

    const closes = data.map(d => d.close);
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);
    const volumes = data.map(d => d.volume);

    // 獲取 Decision Compressor JSON
    try {
      const decisionRes = await fetch(`${API_BASE}/api/decision/${symbol}`);
      if (decisionRes.ok) {
        const decisionData = await decisionRes.json();
        set({ decisionObject: decisionData });
      } else {
        set({ decisionObject: null });
      }
    } catch (e) {
      console.error("Decision API error:", e);
      set({ decisionObject: null });
    }

    set({ chartData: data, isChartLoading: false });
  },

  askAI: async (message, currentTicker) => {
    const { decisionObject, obsidianContent, chatHistory } = get();
    
    // 將使用者的訊息先加入畫面
    const newChat = [...chatHistory, { role: 'user', content: message }];
    set({ isAILoading: true, chatHistory: newChat });

    // 邊界防護：避免 Token Bloat，最多截斷 1500 字元
    const safeObsidian = obsidianContent.length > 1500 
      ? obsidianContent.substring(0, 1500) + '\n...[內容已截斷]' 
      : obsidianContent;

    const logicData = PORTFOLIO_LOGIC.METRICS[currentTicker] || { pivot: '未知', trigger: '未知' };

    const systemPrompt = `
      你是頂尖的量化與基本面 AI 顧問，且被要求扮演「紅軍（Red Team）」的角色。
      當前分析標的: ${currentTicker}
      核心變數 (Pivot): ${logicData.pivot}
      證偽條件 (Trigger): ${logicData.trigger}
      
      【最新技術面訊號 (Decision Compressor)】
      狀態: ${decisionObject?.signal?.state} (Score: ${decisionObject?.signal?.score})
      Factors:
      - Trend: ${decisionObject?.factors?.trend}
      - Quality: ${decisionObject?.factors?.quality}
      - Flow: ${decisionObject?.factors?.flow}
      - Valuation: ${decisionObject?.factors?.valuation}
      風險警示: ${decisionObject?.risk?.join(' | ')}
      
      【本地知識庫情報 (Obsidian)】
      ${safeObsidian}
      
      【任務要求】
      1. 絕對不可給出「建議買進/賣出」的直接結論，決策權在使用者。
      2. 請提出與使用者既有想法相反的「空方論點」或點出「潛在風險」。
      3. 幫忙設定「證偽條件」（例如：如果跌破什麼支撐，代表原來假設錯誤）。
      4. 結尾必須用一個關鍵問題「反問」使用者，刺激獨立思考。
    `;

    console.log("=== AI Context Aggregation ===");
    console.log(systemPrompt);

    // 取得 API Key
    const { geminiKey } = useWatchlistStore.getState();
    if (!geminiKey) {
      set((state) => ({ 
        chatHistory: [...state.chatHistory, { role: 'assistant', content: '⚠️ 尚未設定 Gemini API Key，請先在左下角設定中輸入。' }],
        isAILoading: false 
      }));
      return;
    }

    try {
      // 轉換成 gemini.js 需要的格式 { role, text }
      const messagesForAPI = newChat.map(m => ({
        role: m.role === 'assistant' ? 'ai' : 'user',
        text: m.content
      }));

      const reply = await askGemini({
        apiKey: geminiKey,
        messages: messagesForAPI,
        system: systemPrompt
      });

      set((state) => ({ 
        chatHistory: [...state.chatHistory, { role: 'assistant', content: reply }],
        isAILoading: false 
      }));
    } catch (err) {
      set((state) => ({ 
        chatHistory: [...state.chatHistory, { role: 'assistant', content: `❌ AI 推演失敗: ${err.message}` }],
        isAILoading: false 
      }));
    }
  }
}));

export const useNotesStore = create(
  persist(
    (set) => ({
      notes: {}, // { '2330.TW': { text: 'My note here #tech #hold', lastEdited: 1680000000 } }
      setNote: (symbol, text) => set((state) => ({
        notes: { 
          ...state.notes, 
          [symbol]: { text, lastEdited: Date.now() } 
        }
      })),
    }),
    { name: 'market-watch-notes' }
  )
);
