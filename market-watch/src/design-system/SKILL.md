---
name: marketwatch-design
description: Use this skill to generate well-branded interfaces and assets for MarketWatch (自動盯盤), a visual Taiwan/US stock-market dashboard built as an Apple-OS-derivative app — for production or throwaway prototypes/mocks. Contains design guidelines, colors, type, fonts, assets, and UI-kit components for prototyping. NOTE: market colors are inverted — RED = up, GREEN = down.
user-invocable: true
---

Read the `readme.md` file within this skill first — it is the full design guide
(content + visual foundations, iconography, manifest). Then explore the other files.

Key facts to load before designing:
- **Market color convention is inverted (Taiwan):** RED `#FF3B30` = up (漲),
  GREEN `#34C759` = down (跌). Amber `#FF9F0A` = caution. Indigo `#6366F1` = accent.
- Apple-OS visual language: glassmorphism, soft layered shadows, 18/12/8px radii,
  `Plus Jakarta Sans` + `Noto Sans TC` + `SF Mono` numerics, dense 13px base.
- Copy is **Traditional Chinese (zh-TW)**, terse and advisory; numerics are always
  monospace + tabular with ▲/▼.

Where things are:
- `styles.css` → links all tokens (`tokens/*.css`). Link this one file.
- `guidelines/*.html` → foundation specimen cards.
- `components/{core,market}/` → React primitives (`Button`, `IconButton`, `Badge`,
  `Tag`, `Card`, `QuoteChange`, `Sparkline`, `SignalCard`, `MeterBar`).
- `ui_kits/marketwatch/` → full interactive dashboard recreation.
- `assets/` → logos, favicon, hero.

If creating visual artifacts (slides, mocks, throwaway prototypes), copy assets out and
produce static HTML files for the user to view. If working on production code, copy the
assets and apply the rules here to design as an expert in this brand.

If the user invokes this skill without other guidance, ask what they want to build,
ask a few clarifying questions, then act as an expert designer who outputs HTML
artifacts or production code as needed — always respecting the inverted color
convention and the zh-TW, Apple-OS aesthetic.
