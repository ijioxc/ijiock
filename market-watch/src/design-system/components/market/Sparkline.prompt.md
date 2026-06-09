Tiny filled area+line sparkline for watchlist rows. Direction sets the color (RED up / GREEN down) and a dot marks the latest point.

```jsx
<Sparkline data={[100,102,101,104,103,108]} up />
<Sparkline data={prices} up={quote.change >= 0} width={80} height={32} />
```

Needs ≥ 2 points. Props: `data`, `up`, `width`, `height`.
