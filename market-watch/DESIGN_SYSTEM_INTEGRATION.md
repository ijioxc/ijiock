# Design System Integration

## Overview

The **MarketWatch Design System** has been integrated into the `market-watch` app. This provides:

- ✅ **Organized token structure** in `src/tokens/`
- ✅ **Reusable components** in `src/design-system/components/`
- ✅ **Design guidelines** in `src/design-system/README.md`
- ✅ **Visual assets** in `src/design-system/assets/`

## Token Structure

All design tokens are organized in `src/tokens/`:

```
src/tokens/
├── tokens.css          # Main entry point (imports all below)
├── colors.css          # Color tokens (--up, --dn, --text, etc.)
├── typography.css      # Font sizes, weights, line heights
├── spacing.css         # Spacing, radii, shadows, motion
└── base.css            # Global resets and utilities
```

**Usage:** `src/index.css` already imports `tokens.css`, so all tokens are available globally.

## Available Components

### Core Components (`src/design-system/components/core/`)
- **Button** — primary, secondary, ghost variants
- **IconButton** — icon-only button
- **Badge** — status badges
- **Tag** — interactive tags
- **Card** — container component

### Market Components (`src/design-system/components/market/`)
- **QuoteChange** — price/percentage display
- **Sparkline** — mini inline chart
- **SignalCard** — technical signal indicator
- **MeterBar** — progress/strength bar

Each component includes:
- `<Name>.jsx` — React component
- `<Name>.d.ts` — TypeScript types
- `<Name>.prompt.md` — Usage documentation

## Design Guidelines

Read `src/design-system/README.md` for:
- Content fundamentals (Traditional Chinese, terse & professional)
- Visual foundations (colors, typography, spacing, shadows, motion)
- Iconography guidelines
- Complete token reference

## Key Design Principles

### Color Convention ⚠️
**RED = up (漲) / GREEN = down (跌)** — Taiwan market convention. Never swap.

- `--up: #FF3B30` (red for price increases)
- `--dn: #34C759` (green for price decreases)

### Visual Language
- **Apple-OS aesthetic** — glassmorphism, soft shadows, generous radii
- **Dense dashboard** — 13px base font, 18px card radius
- **Motion** — quick, physical easing (120–300ms)
- **Dark theme** — full support via `.app.dark` class

### Typography
- **UI/Labels:** Plus Jakarta Sans (Latin) + Noto Sans TC (Chinese)
- **Numerics:** SF Mono (monospace tabular)
- Base size: 13px, weights: 600 → 800 → 900

## How to Use

### Import tokens in CSS
```css
/* Already imported globally via src/index.css */
color: var(--text);
background: var(--bg);
border-radius: var(--r);
```

### Import components in JSX
```jsx
import { Button } from '../design-system/components/core/Button';

export function MyComponent() {
  return <Button variant="primary">Click me</Button>;
}
```

### Apply dark theme
```jsx
// In App.jsx or root component
<div className={isDark ? 'app dark' : 'app'}>
  {/* content */}
</div>
```

## Next Steps

1. **Review** `src/design-system/README.md` for full guidelines
2. **Audit existing components** — refactor to use design tokens
3. **Replace hardcoded values** — use `--*` custom properties
4. **Consider component migration** — gradually adopt Button, Card, etc. from the design system

## Files Changed

- ✅ Created `src/tokens/` — organized token structure
- ✅ Created `src/design-system/` — components, assets, docs
- ✅ Updated `src/index.css` — now imports token system
- ✅ Preserved `src/App.css` — already aligned with tokens

## Compatibility

The existing app structure is **fully backward compatible**:
- All existing CSS classes still work
- Token values match current hardcoded colors
- Dark theme selector unchanged (`.app.dark`)
- No breaking changes to components

---

**Questions?** See `src/design-system/README.md` or the component `.prompt.md` files for detailed usage.
