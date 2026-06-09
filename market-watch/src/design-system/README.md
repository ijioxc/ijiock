# MarketWatch Design System

**MarketWatch（自動盯盤 · 投資顧問）** is a visual stock-market dashboard for the
Taiwan / US markets — *一個以長線交易為主、短線交易為輔助的視覺化股市看盤網頁*
(a long-term-first, short-term-assisting visual market board). It pairs a live
watchlist, a candlestick chart with a deep technical-indicator stack, a portfolio
tracker, a news/sentiment feed, an economic calendar, a technical screener, and an
**AI 投資顧問** (Gemini / Claude) into one dense, single-screen desktop app.

The product is explicitly designed as an **Apple-OS-derivative app** — it shares a
visual language with macOS / iOS: glassmorphism, system color semantics, SF-style
typography, layered soft shadows and generous corner radii, so it sits in visual
harmony with the OS.

> ⚠ **Read this first — the market color convention is inverted.**
> Following the Taiwan / Asia convention, **RED = up (漲)** and **GREEN = down (跌)**.
> This is the opposite of US/Western charts. Never swap `--up` and `--dn`.

---

## Sources

This system was reverse-engineered from the product's own code. If you have access,
explore them to build higher-fidelity work:

- **GitHub:** https://github.com/ijioxc/ijiock — the `market-watch/` React + Vite app
  (`src/components/*`, `src/App.css`, `src/index.css`) is the source of truth for
  layout, components, copy and the token values reproduced here.
- **Live build:** https://ijioxc.github.io/ijiock/ijiock.html
- Stack: React 19, Vite, Zustand (state), `lightweight-charts` (candles), axios.
  Copy is **Traditional Chinese (zh-TW)** throughout.

---

## Content fundamentals

**Language & tone.** All UI copy is **Traditional Chinese (繁體中文, zh-TW)**, terse
and professional — this is a trader's instrument panel, not a consumer app. Labels
are 2–4 characters (`自選清單`, `綜合訊號`, `持倉`, `警示`, `選股`, `板塊`, `日曆`).
English appears only for tickers, indicator acronyms (RSI, MACD, KD, BB, OBV, ATR)
and market codes.

**Voice.** Second person, direct, advisory but never hype. The AI advisor addresses
the user as 「你」 and always closes analysis with an action verb from a fixed set —
**買進 / 持有 / 觀望 / 賣出** — followed by a disclaimer (「※ 本內容僅供參考，非投資建議」).

**Signal vocabulary is fixed.** Reuse these exact terms, don't invent synonyms:
- Direction: `偏多` / `偏空` / `中性觀望`; strength `強烈看多` … `強烈看空`.
- Crosses: `黃金交叉`(golden) / `死亡交叉`(death); `金叉` / `死叉` short forms.
- Structure: `多頭排列` / `空頭排列`; `上升趨勢` / `下降趨勢`; `支撐` / `壓力`.
- Oscillators: `超買` / `超賣`; sentiment `極度貪婪`→`極度恐懼`.
- Alerts: `突破目標價` / `跌破停損價`.

**Numbers.** Prices, %, scores and volume are **always monospace + tabular** so
columns align. Percent always carries a ▲ / ▼ glyph and the directional color.
Volume abbreviates (`9.8M`, `241K`). Composite scores are signed (`+61`, `-44`).

**Emoji.** Used sparingly and functionally — as quick-prompt chip icons
(📈🛡⚖️🎯), session/impact markers, and the alert (⚠ 🔔) / candle (🕯) glyphs.
Never decorative. Country flags (🇺🇸🇹🇼🇪🇺) tag economic-calendar events.

---

## Visual foundations

**Aesthetic.** Apple-OS / macOS Big Sur lineage. Clean light canvas (`#F5F5F7`),
white cards, ultra-thin hairlines, soft multi-layer shadows, and translucent
**glassmorphic** chrome (nav bar, command palette, modals, toasts) using
`backdrop-filter: blur(32–48px) saturate(200%)`. A full **dark theme** mirrors every
surface (`[data-theme="dark"]`).

**Color.** A neutral grey scale carries the UI; meaning is delivered by a tight
semantic set — **red `#FF3B30` (up)**, **green `#34C759` (down)**, amber `#FF9F0A`
(caution/neutral), and one **indigo `#6366F1`** accent for interactive/active state,
the logo, and primary CTAs. Soft 12% tints back the semantic colors. Chart overlays
add orange/indigo/cyan for Bollinger bands. Imagery is essentially absent — this is a
data product; the "imagery" is the data viz itself (candles, sparklines, gauges,
heatmaps, donuts).

**Type.** `Plus Jakarta Sans` for Latin UI, `Noto Sans TC` for Chinese, `SF Mono`
(system, with `ui-monospace` fallback) for all numerics. Base size is a dense **13px**;
titles are 15px/800, hero numerics 22px/800, micro-labels 9–10px/700 uppercase with
letter-spacing. Weight does the hierarchy work — 600 → 800 → 900.

**Shape & depth.** Radii: `18px` cards/modals, `12px` rows/inputs/buttons, `8px`
small inputs/badges, `24px` pills. Three resting shadows (`--sh` → `--sh-lg`) plus an
indigo glow on primary CTAs and the logo mark. Cards are white/`surface-2` with a
1px hairline and `--sh`; directional cards add a 3px colored left border + soft tint.

**Motion.** Quick and physical: `cubic-bezier(.4,0,.2,1)` over 120–300ms. Rows
lift `translateY(-2px)` / nudge `translateX(2px)` on hover; buttons lift then settle
on press; modals/toasts `scale` + fade in; the toast uses a springy
`cubic-bezier(.34,1.56,.64,1)`. Signature ambient loops: a blinking **LIVE** dot,
pulsing session dots, a 40s scrolling market ticker, and a **price-flash** (the cell
briefly tints up/down soft when a quote ticks).

**States.** Hover → surface darkens one step + lift + shadow upgrade. Active/selected
→ accent soft tint + inset ring (or accent underline for tabs). Press → slight scale
down. Focus → accent border + 3px accent-soft ring. Disabled → 45% opacity.

---

## Iconography

MarketWatch uses **inline stroke SVG icons** in the Feather / Lucide style —
`fill: none`, `stroke: currentColor`, `stroke-width: 2–2.2`, round caps/joins,
typically 14–15px inside a 24×24 viewBox. They live directly in the components (the
search magnifier, the settings gear, the logo's `activity`/pulse polyline). There is
**no icon font and no SVG sprite** in the app itself.

For richer icon needs, match that language with **[Lucide](https://lucide.dev)** (CDN)
at stroke-width 2 — it is the closest 1:1 to the hand-authored set.

Beyond line icons, the app leans on **Unicode glyphs as data symbols**: `▲ ▼ ─`
(direction), `★ ☆ 📌` (pin), `🔔` (alert), `🕯` (candlestick pattern), `⬍` (divergence),
`● �◐` (status), plus the functional emoji noted above. Use these instead of drawing
custom marks for directional/status cues.

**Assets** (in `assets/`): `logo-mark.svg` (the indigo gradient pulse mark) and
`logo-lockup.svg` (horizontal lockup) — rebuilt clean from the in-app `.logo-mark`.
`hero.png` is the product's marketing hero. `logo-favicon.svg` is the deployed
favicon (a generic purple mark — prefer `logo-mark.svg` for brand use).
Never redraw the logo; use these files.

---

## Index / manifest

**Foundations**
- `styles.css` — global entry point (consumers link this). `@import` manifest only.
- `tokens/colors.css` · `typography.css` · `spacing.css` · `fonts.css` · `base.css`
- `guidelines/*.html` — 16 specimen cards (Colors, Type, Spacing, Brand) shown in the
  Design System tab.

**Components** (`components/`, namespace `window.MarketWatchDesignSystem_c2bad0`)
- `core/` — `Button`, `IconButton`, `Badge`, `Tag`, `Card`
- `market/` — `QuoteChange`, `Sparkline`, `SignalCard`, `MeterBar`
- Each has `<Name>.jsx`, `<Name>.d.ts`, `<Name>.prompt.md`; one `*.card.html` per group.

**UI kit** (`ui_kits/marketwatch/`)
- `index.html` — full interactive dashboard recreation (open this). Watchlist select,
  chart interval/range, BB toggle, right-panel tabs, ⌘K command palette, dark mode (`d`).
- `data.js` (mock data) · `parts.jsx` (chrome + charts) · `panels.jsx` (chart/tech +
  right-column panels + overlays) · `app.jsx` (shell) · `kit.css` (layout).

**Other**
- `SKILL.md` — Agent-Skill manifest for use in Claude Code.
- `assets/` — logos, favicon, hero image.

---

## Caveats / substitutions

- **SF Mono** is a system font with no webfont; off-Apple platforms fall back through
  `ui-monospace` / Menlo. Supply SF Mono binaries for exact parity.
- The candlestick chart in the UI kit is a lightweight static SVG recreation; the real
  app uses `lightweight-charts`. Data here is deterministic mock data, not live.
