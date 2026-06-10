# MarketWatch — UI Kit

An interactive, high-fidelity recreation of the **MarketWatch（自動盯盤）** desktop
dashboard. Open `index.html`.

## What it shows
A single-screen trading board, faithful to the product layout:

- **NavBar** — glassmorphic, with the indigo pulse logo, blinking **LIVE** badge,
  US/TW session clock, alert counter, command-palette / API-key / theme buttons.
- **Market ticker** — 40s auto-scrolling index strip (pauses on hover).
- **Watchlist** (left) — grouped 台股/美股/指數/外匯, search, category tabs, market-breadth
  bar, per-row sparkline + price + ▲▼%, tag dots, HOT movers, pin.
- **Chart panel** (center) — symbol header + price pill, interval (15分/日/週/月) and
  range tabs, **Bollinger Bands** toggle, OHLC bar, SVG candlestick chart, a composite
  signal meter, and a 4-up technical-signal grid (KD, MACD, RSI, 均線).
- **Right column** — tabbed: **AI 投資顧問** (working mock chat + quick prompts),
  持倉 portfolio, 新聞 news/sentiment, 選股 screener, 日曆 calendar, plus 警示/板塊 stubs.
- **Overlays** — ⌘K / Ctrl+K **command palette** (keyboard navigable) and the API-key modal.

## Interactions
- Click a watchlist row → chart + advisor + tech signals update to that symbol.
- Switch chart interval / range, toggle BB. Switch right-column tabs (or press 1–7).
- `⌘K` / `Ctrl+K` command palette; `d` toggles dark mode; `Esc` closes overlays.

## Composition notes
The kit mirrors the design-system primitives (`QuoteChange`, `Sparkline`, `SignalCard`,
`Button`, `Badge`, `Tag`) using the shared tokens in `styles.css`; it re-implements the
visuals locally (self-contained) so it runs standalone for preview. In production,
compose the published components from `window.MarketWatchDesignSystem_c2bad0` instead.

## Files
`index.html` · `data.js` · `parts.jsx` · `panels.jsx` · `app.jsx` · `kit.css`

All data is deterministic **mock** data — no network / live quotes. The candlestick
chart is a static SVG recreation (the real app uses `lightweight-charts`).
