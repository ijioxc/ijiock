// 分類僅保留視覺資訊（label, color, logic 說明）
// 實際分類由 watchlistStore.classifySymbol() 動態決定，符號池不再寫死
export const PORTFOLIO_LOGIC = {
  CATEGORIES: {
    TW: {
      label: '台股',
      logic: '台灣上市櫃個股 (.TW / .TWO)',
      color: '#5b8dee',
    },
    ETF: {
      label: 'ETF',
      logic: '台灣掛牌 ETF（代碼以 00 開頭）',
      color: '#a78bfa',
    },
    US: {
      label: '美股',
      logic: '美國上市個股',
      color: '#38bdf8',
    },
    CRYPTO: {
      label: '加密貨幣',
      logic: '加密貨幣（-USD / CG:）',
      color: '#fb923c',
    },
    IDX: {
      label: '指數',
      logic: '主要市場指數（^ 開頭）',
      color: '#facc15',
    },
    FX: {
      label: '外匯',
      logic: '匯率（=X / .NYB）',
      color: '#34d399',
    },
    OTHER: {
      label: '其他',
      logic: '未分類標的',
      color: '#94a3b8',
    },
  },

  // 決策儀表板的英文 pivot/trigger 標籤（僅元資料，不影響分類）
  METRICS: {
    '2330.TW': { pivot: 'CoWoS產能', trigger: '營收佔比變化' },
    '2412.TW': { pivot: '資本支出', trigger: '股息發放率' },
    '2303.TW': { pivot: '成熟製程產能利用率', trigger: '報價調整' },
    '2882.TW': { pivot: '淨值與美債殖利率', trigger: '避險成本變化' },
    '2891.TW': { pivot: '淨利息收益率 (NIM)', trigger: '放款成長率' },
  },
}
