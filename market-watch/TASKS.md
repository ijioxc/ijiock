# Tasks

## Active

- [ ] **接真實技術指標** — 從真實 OHLC 資料計算 RSI/KD/MACD，取代目前假資料估算
- [ ] **AI 顧問接 Claude API** — 串接 claude.js 邏輯，需 API key

## Waiting On

- [ ] **AI 顧問接 Claude API** — 等使用者提供 API key（since 2026-06-10）

## Someday

- [ ] **警示功能（目標價/停損）** — AlertPanel 真實邏輯
- [ ] **持倉追蹤** — PortfolioPanel 真實邏輯
- [ ] **K線圖進階疊加** — LR / Ichimoku / VWAP / Fibonacci / Volume Profile
- [ ] **真實新聞 API** — 接 news.js 資料來源

## Done

- [x] ~~**RSI 儀表重構**~~ (2026-06-10) — 拆成兩段 quarter-arc（sweep=1），修針角公式，修 zone 色彩（台灣慣例紅/綠）
- [x] ~~**中間欄 snap 捲動**~~ (2026-06-10) — 一次滾動自動到位（0↔1），CSS flex-grow transition 補間，去掉連續累加
- [x] ~~**⌘K 命令列**~~ (2026-06-10) — 模糊搜尋、↑↓↩ 導航、即時報價顯示
- [x] ~~**總經日曆**~~ (2026-06-10) — 移植 EventCalendar.jsx，12 個事件，篩選器，右側日曆 tab（commit 860785d）
- [x] ~~**設計稿轉 MarketWatch.html**~~ (2026-06-10) — 玻璃風格 dashboard，dark/light，自選清單、K線圖、技術訊號
- [x] ~~**技術訊號補齊 15+ 卡片**~~ (2026-06-10) — KD/MACD/RSI gauge/ATR/MFI/OBV/StochRSI/Williams %R/PSAR/ADX/ROC/CCI/CMF/Elder Ray/多週期
- [x] ~~**接即時報價**~~ (2026-06-10) — useLiveQuotes hook，corsproxy.io + Yahoo Finance v7 batch，每 30s 輪詢（commit 50ec74a）
- [x] ~~**push 到 git**~~ (2026-06-10) — commit dcdcc9c
