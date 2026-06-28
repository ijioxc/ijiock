# 真實資料串接完成 (Real Data Integration)

A 欄的市場全貌已經正式從「靜態假資料」升級為 **「真實資料流」**！

## 已完成的架構升級

### 1. 後端即時報價引擎 (`server/index.js`)
- 新增了 `/api/market/quotes` 路由，底層利用 `yahoo-finance2` 批次抓取即時的價格、漲跌幅，並同時拉取近 10 日的收盤價作為 Sparkline 的繪製基礎。
- 新增了 `/api/market/breadth` 路由，根據大盤 (`^TWII`) 的走勢，動態運算出市場的漲跌家數比例。

### 2. 前端狀態管理升級 (`src/store/useDecisionStore.js`)
- 移除了 `MOCK_WATCHLIST` 的硬編碼假資料。
- 重寫 `triggerPulse` 函式：現在它會收集你清單中所有的 Ticker，並透過 HTTP POST 呼叫後端 API，然後將取得的真實資料與目前的狀態完美合併。
- 實作了 **Zustand Persist** 機制，現在你的自選股名單（`watchlist`）會被保存在 localStorage。重新整理後不會遺失，並且在載入瞬間立刻觸發 `initWatchlist` 去拉取最新報價。

### 3. UI 無縫接軌 (`ScreenerColumn.jsx`)
- 載入生命週期優化：剛開啟網頁時會先顯示 "Loading..." 佔位符，並顯示背景的脈衝動畫。
- 每 15 秒執行一次輕量級的 API Polling，在不干擾使用者操作的情況下更新數字與迷你線圖。

## 如何測試
1. 確保你的 Node 伺服器 (`node server/index.js`) 正在運行。
2. 確保前端 Vite 伺服器正在運行。
3. 觀察 A 欄位的自選股，你應該會看到它們的價格與真實市場同步。
4. 試著在搜尋列下方輸入新的標的代碼（例如 `2454.TW` 聯發科）並按下「加入監控」，它會立刻抓取最新的報價並動態新增到列表中！

> [!TIP]
> 由於我們使用 `yahoo-finance2`，除了台股之外，你甚至可以輸入美股代碼（例如 `AAPL`, `TSLA`），系統一樣能抓到報價並畫出線圖！
# 2026-06-28
