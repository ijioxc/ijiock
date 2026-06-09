# MarketWatch Design System — Quick Start

## 📐 Token Usage

All design tokens are CSS custom properties — use them directly in your CSS/JSX:

### Colors
```css
/* Market semantics (Taiwan convention: RED=up, GREEN=down) */
color: var(--up);        /* #FF3B30 — price up */
color: var(--dn);        /* #34C759 — price down */
background: var(--warn); /* #FF9F0A — caution/neutral */
background: var(--accent); /* #6366f1 — primary accent */

/* Surfaces & text */
background: var(--bg);      /* page background */
background: var(--surface); /* card/panel surface */
color: var(--text);         /* primary text */
color: var(--text-2);       /* secondary text */
color: var(--text-3);       /* tertiary/helper text */

/* Soft variants (12% tint) */
background: var(--up-soft);     /* soft red tint */
background: var(--dn-soft);     /* soft green tint */
background: var(--accent-soft); /* soft indigo tint */
```

### Typography
```css
font-family: var(--font-sans);  /* UI text: Plus Jakarta Sans + Noto Sans TC */
font-family: var(--font-mono);  /* Numerics: SF Mono */
font-size: var(--fs-13);        /* base: 13px (dense dashboard) */
font-weight: var(--fw-bold);    /* 700 */
line-height: var(--lh-normal);  /* 1.5 */
```

### Spacing & Radii
```css
padding: var(--sp-2);           /* 8px */
margin: var(--sp-4);            /* 16px */
border-radius: var(--r);        /* 18px — cards */
border-radius: var(--r-sm);     /* 12px — buttons */
border-radius: var(--r-xs);     /* 8px — small elements */
```

### Shadows
```css
box-shadow: var(--sh);    /* light shadow */
box-shadow: var(--sh-md); /* medium hover shadow */
box-shadow: var(--sh-lg); /* elevated modal shadow */
```

### Motion
```css
transition: all var(--dur-base) var(--ease);
/* --dur-fast: .12s, --dur-base: .18s, --dur-slow: .3s */
/* --ease: cubic-bezier(.4, 0, .2, 1) */
```

## 🧩 Component Usage

### Import
```jsx
import { Button } from '../design-system/components/core/Button';
import { Card } from '../design-system/components/core/Card';
import { QuoteChange } from '../design-system/components/market/QuoteChange';
```

### Examples
```jsx
// Button
<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost" size="small">Ghost</Button>

// Badge
<Badge color="up">+3.2%</Badge>
<Badge color="dn">-1.5%</Badge>

// Card
<Card>
  <h3>Title</h3>
  <p>Content</p>
</Card>

// Quote (price change)
<QuoteChange value={1234.56} change={12.34} percent={0.99} />

// Signal
<SignalCard 
  signal="strong-up"
  strength={8}
  description="Golden cross detected"
/>
```

## 🌙 Dark Theme

The app automatically supports dark mode. Just add the `.dark` class:

```jsx
// In App.jsx
<div className={isDark ? 'app dark' : 'app'}>
  {/* Light/dark colors auto-switch via CSS variables */}
</div>
```

Dark theme values are defined in `tokens/colors.css` under `:root.dark`.

## ⚠️ Key Reminders

1. **Market colors are inverted:**
   - 🔴 `--up` = RED (price increases) 
   - 🟢 `--dn` = GREEN (price decreases)
   - This is Taiwan convention — never swap!

2. **Use monospace for numerics:**
   ```jsx
   <span className="mono">1,234.56</span> {/* tabular-aligned */}
   ```

3. **Flash animations on price ticks:**
   ```jsx
   <td className="flash-up">1234.56</td> {/* animates on render */}
   ```

4. **Always use tokens, never hardcoded colors:**
   ```css
   /* ✅ Good */
   color: var(--text);
   
   /* ❌ Avoid */
   color: #1D1D1F;
   ```

---

**Full reference:** See `README.md` in this directory for complete design guidelines, typography rules, and component specs.
