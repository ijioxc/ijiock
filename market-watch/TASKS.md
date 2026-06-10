# Tasks

## Active

- [ ] **接真實技術指標** — 從真實 OHLC 資料計算 RSI/KD/MACD，取代目前假資料估算
- [ ] **⌘K 命令列** — 從 CommandPalette.jsx 搬入 MarketWatch.html
- [x] ~~**總經日曆**~~ (2026-06-10) — 移植 EventCalendar.jsx，12 個事件，篩選器，右側日曆 tab（commit 860785d）
- [ ] **AI 顧問接 Claude API** — 串接 claude.js 邏輯，需 API key

## Waiting On

- [ ] **AI 顧問接 Claude API** — 等使用者提供 API key（since 2026-06-10）

## Someday

- [ ] **警示功能（目標價/停損）** — AlertPanel 真實邏輯
- [ ] **持倉追蹤** — PortfolioPanel 真實邏輯
- [ ] **K線圖進階疊加** — LR / Ichimoku / VWAP / Fibonacci / Volume Profile
- [ ] **真實新聞 API** — 接 news.js 資料來源

## Done

- [x] ~~**設計稿轉 MarketWatch.html**~~ (2026-06-10) — 玻璃風格 dashboard，dark/light，自選清單、K線圖、技術訊號
- [x] ~~**技術訊號補齊 15+ 卡片**~~ (2026-06-10) — KD/MACD/RSI gauge/ATR/MFI/OBV/StochRSI/Williams %R/PSAR/ADX/ROC/CCI/CMF/Elder Ray/多週期
- [x] ~~**接即時報價**~~ (2026-06-10) — useLiveQuotes hook，corsproxy.io + Yahoo Finance v7 batch，每 30s 輪詢（commit 50ec74a）
- [x] ~~**push 到 git**~~ (2026-06-10) — commit dcdcc9c
