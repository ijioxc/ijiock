# ijiock 專案指引

## 專案概覽

這個 repo 有兩個子專案：

| 子專案 | 路徑 | 說明 |
|--------|------|------|
| 布林通道實驗室 | `ijiock.html` | 單頁 HTML，成熟的設計系統（暖沙色） |
| MarketWatch 盯盤 | `market-watch/` | React + Vite，自動盯盤 + AI 投資顧問 |

GitHub: https://github.com/ijioxc/ijiock

---

## MarketWatch — 目前狀態

### 啟動方式
```bash
cd market-watch
npm run dev        # http://localhost:5173
```

### 技術棧
- **框架**：React + Vite（無 StrictMode，避免 useEffect 雙重觸發）
- **狀態**：Zustand + localStorage persist（`src/store/watchlistStore.js`）
- **圖表**：lightweight-charts **v5**（`chart.addSeries(CandlestickSeries, ...)` — v4 API 已不適用）
- **行情**：Yahoo Finance 非官方 API，透過 Vite proxy 繞 CORS
- **AI**：Claude `claude-sonnet-4-6`，API Key 由用戶在 UI 輸入存 localStorage

### 檔案結構
```
market-watch/src/
├── App.jsx                    # 主佈局：NavBar + WatchList + ChartPanel + 右側面板
├── App.css                    # 所有元件樣式（ijiock.html 設計系統移植版）
├── index.css                  # CSS 變數 + 字型（Plus Jakarta Sans）
├── api/
│   ├── yahoo.js               # fetchQuote(), fetchOHLC() — 含 5min cache + retry
│   └── claude.js              # askAdvisor() — 呼叫 Claude API
├── components/
│   ├── NavBar.jsx             # 毛玻璃 Navbar、API Key 設定 modal
│   ├── WatchList.jsx          # 自選清單，ALL 模式有台股/美股/指數/外匯分組
│   ├── ChartPanel.jsx         # K 線圖，1mo/3mo/6mo/1y，含 retry 按鈕
│   ├── TechSignal.jsx         # 三張 sig-card（KD / MACD / 均線）
│   ├── AdvisorChat.jsx        # AI 顧問聊天，「分析當前標的」+ 自訂問題
│   └── AlertPanel.jsx         # 目標價/停損價設定，觸發時桌面通知
├── hooks/
│   ├── useQuotes.js           # 每 30 秒輪詢，請求間錯開 300ms
│   └── useTechIndicators.js   # KD、MACD、MA5/20/60 純計算
└── store/watchlistStore.js    # 全域狀態
```

---

## 設計系統（ijiock.html 移植版）

### 色彩 Token（`index.css` :root）
```
--bg: #DED0C1          暖沙背景
--surface: #E9E1D7     卡片表面
--up: #26A69A          漲（青綠）
--dn: #EF5350          跌（珊瑚紅）
--accent: #6366f1      強調（靛藍）
--warn: #f59e0b        警告（琥珀）
--r: 14px  --r-sm: 10px  --r-xs: 6px
```
深色模式：`.app.dark` 覆寫以上變數。

### 關鍵元件 Class
| Class | 用途 |
|-------|------|
| `.sig-card.bull/.bear/.neutral` | 左側色條信號卡（移植自 ijiock.html）|
| `.sig-geo.bull/.bear/.neutral` | 信號小圖標（28×28 圓角方塊）|
| `.section-label` | 含右側橫線的分組標題 |
| `.ibtn` | Icon 按鈕，hover 有 translateY(-1px) |
| `.analyze-btn` | 主 CTA 按鈕，hover 有 box-shadow + 上移 |
| `.trend-badge` | 多空趨勢 pill badge |

---

## 已知問題 / 注意事項

### Yahoo Finance 429 Rate Limit
- **原因**：開發過程大量 reload 超過 Yahoo Finance 非官方 API 的頻率限制
- **症狀**：圖表顯示「Yahoo Finance 暫時限流，請稍後重試」
- **解法**：等幾分鐘後點「重試」即可；正常使用（不大量 reload）不會觸發
- **防護**：`fetchOHLC` 有 5 分鐘 in-memory cache + 3 次 retry（0/2/4 秒間隔）

### lightweight-charts v5 API
- 必須用 `chart.addSeries(CandlestickSeries, options)` 
- 不能用舊版 `chart.addCandlestickSeries(options)`（v4 API，會 crash）

### Claude API Key
- 用戶點右上角🔍圖示輸入，存 `localStorage`
- 未設定時 AI 顧問功能停用，但報價/圖表照常運作

---

## 常見後續任務

- **新增標的**：直接在 WatchList 點「＋」輸入代號
- **調整輪詢頻率**：`useQuotes.js` 的 `INTERVAL_MS`（目前 30000ms）
- **換 AI 模型**：`claude.js` 與 `AdvisorChat.jsx` 的 `model` 欄位
- **加技術指標**：`useTechIndicators.js` → `TechSignal.jsx` 新增 SigCard
- **深色模式預設**：`App.jsx` 的 `useState(false)` 改 `useState(true)`
- **部署**：`npm run build` → 靜態檔案，可直接放 Cloudflare Pages / GitHub Pages

---

## Git 狀態

未追蹤（已加入 .gitignore，不可上傳）：
- `.env` — 含 `FUGLE_API_KEY`
- `.dev.vars` — 同上

推送到：`https://github.com/ijioxc/ijiock`（main branch）
